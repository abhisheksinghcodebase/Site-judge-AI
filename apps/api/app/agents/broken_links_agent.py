"""Broken Links Agent — crawls all links on the page and checks for 4xx/5xx responses."""

import asyncio
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup


MAX_LINKS_TO_CHECK = 60  # Cap to avoid very long scans


async def run_broken_links_agent(url: str) -> dict:
    """
    Scrapes all <a href> links from the page and checks for broken ones.
    Returns structured issue data.
    """
    results = {
        "agent": "broken_links",
        "url": url,
        "issues": [],
        "data": {
            "total_links": 0,
            "checked_links": 0,
            "broken_links": [],
            "redirect_chains": [],
        },
        "score_hint": 100,
    }

    base_parsed = urlparse(url)
    base_url = f"{base_parsed.scheme}://{base_parsed.netloc}"

    async with httpx.AsyncClient(
        timeout=10.0,
        follow_redirects=True,
        headers={"User-Agent": "SiteJudge-Bot/1.0"},
    ) as client:
        # ── Fetch page HTML ────────────────────────────────────────────
        try:
            response = await client.get(url)
            html = response.text
        except Exception as e:
            results["issues"].append({
                "title": "Could not fetch page for link checking",
                "severity": "critical",
                "category": "broken_links",
                "description": str(e),
                "confidence": 0.99,
            })
            return results

        soup = BeautifulSoup(html, "lxml")
        all_links = []

        for tag in soup.find_all("a", href=True):
            href = tag["href"].strip()
            if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
                continue
            absolute = urljoin(url, href)
            # Only check http/https
            if absolute.startswith(("http://", "https://")):
                all_links.append(absolute)

        # Deduplicate while preserving order
        seen = set()
        unique_links = []
        for link in all_links:
            if link not in seen:
                seen.add(link)
                unique_links.append(link)

        results["data"]["total_links"] = len(unique_links)
        links_to_check = unique_links[:MAX_LINKS_TO_CHECK]
        results["data"]["checked_links"] = len(links_to_check)

        # ── Check links concurrently ───────────────────────────────────
        async def check_link(link: str) -> dict | None:
            try:
                resp = await client.head(link, timeout=8.0)
                # Some servers don't support HEAD; fall back to GET
                if resp.status_code == 405:
                    resp = await client.get(link, timeout=8.0)

                if resp.status_code >= 400:
                    return {
                        "url": link,
                        "status_code": resp.status_code,
                        "error": None,
                    }
                return None
            except httpx.TimeoutException:
                return {"url": link, "status_code": None, "error": "Timeout"}
            except Exception as e:
                return {"url": link, "status_code": None, "error": str(e)[:100]}

        tasks = [check_link(link) for link in links_to_check]
        link_results = await asyncio.gather(*tasks, return_exceptions=True)

        broken = [r for r in link_results if r and isinstance(r, dict)]
        results["data"]["broken_links"] = broken

        if broken:
            score_deduction = min(len(broken) * 5, 40)
            results["score_hint"] = max(0, 100 - score_deduction)

            # Group by severity
            critical_broken = [b for b in broken if b.get("status_code") in (404, 410, 500, 503)]
            other_broken = [b for b in broken if b not in critical_broken]

            if critical_broken:
                results["issues"].append({
                    "title": f"{len(critical_broken)} broken link(s) found (4xx/5xx)",
                    "severity": "critical" if len(critical_broken) > 2 else "medium",
                    "category": "broken_links",
                    "description": (
                        f"Found {len(critical_broken)} links returning error status codes. "
                        f"Examples: {', '.join(b['url'][:60] for b in critical_broken[:3])}"
                    ),
                    "impact": "Users clicking these links will see error pages. Hurts UX and SEO.",
                    "fix_suggestion": "Update or remove links that return 4xx/5xx responses.",
                    "confidence": 0.99,
                })

            if other_broken:
                results["issues"].append({
                    "title": f"{len(other_broken)} link(s) timed out or unreachable",
                    "severity": "minor",
                    "category": "broken_links",
                    "description": (
                        f"{len(other_broken)} links could not be reached. "
                        f"Examples: {', '.join(b['url'][:60] for b in other_broken[:3])}"
                    ),
                    "fix_suggestion": "Verify these links are intentional or update them.",
                    "confidence": 0.75,
                })

    return results
