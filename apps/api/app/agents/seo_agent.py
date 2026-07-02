"""SEO Agent — crawls meta tags, OG data, sitemap, robots.txt, structured data."""

import asyncio
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup


async def run_seo_agent(url: str) -> dict:
    """
    Analyse SEO signals for a URL.
    Returns structured evidence for the Judge Agent.
    """
    results = {
        "agent": "seo",
        "url": url,
        "issues": [],
        "data": {},
        "score_hint": 100,  # Starts perfect, deducted per issue
    }

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        # Fetch HTML
        try:
            response = await client.get(url, headers={"User-Agent": "SiteJudge-Bot/1.0"})
            html = response.text
            status_code = response.status_code
        except Exception as e:
            results["issues"].append({
                "title": "Page failed to load",
                "severity": "critical",
                "description": str(e),
            })
            return results

        soup = BeautifulSoup(html, "lxml")

        # ── Title ──────────────────────────────────────────────────────
        title_tag = soup.find("title")
        title_text = title_tag.get_text(strip=True) if title_tag else None
        results["data"]["title"] = title_text

        if not title_text:
            results["issues"].append({
                "title": "Missing <title> tag",
                "severity": "critical",
                "category": "seo",
                "description": "The page has no <title> tag. Search engines use this as the primary result headline.",
                "impact": "Severely hurts search ranking and click-through rate.",
                "fix_suggestion": "Add a descriptive <title> tag between 50–60 characters.",
                "code_example": "<title>Your Page Title — Brand Name</title>",
                "confidence": 0.99,
            })
            results["score_hint"] -= 20
        elif len(title_text) > 60:
            results["issues"].append({
                "title": "Title tag too long",
                "severity": "medium",
                "category": "seo",
                "description": f"Title is {len(title_text)} characters. Google truncates titles beyond ~60 characters.",
                "impact": "Title may be cut off in search results, reducing click-through rate.",
                "fix_suggestion": f"Shorten the title to under 60 characters. Current: '{title_text[:60]}...'",
                "confidence": 0.95,
            })
            results["score_hint"] -= 5
        elif len(title_text) < 20:
            results["issues"].append({
                "title": "Title tag too short",
                "severity": "minor",
                "category": "seo",
                "description": f"Title is only {len(title_text)} characters. Descriptive titles improve search ranking.",
                "fix_suggestion": "Expand the title to be more descriptive (50–60 characters ideal).",
                "confidence": 0.85,
            })
            results["score_hint"] -= 3

        # ── Meta description ───────────────────────────────────────────
        meta_desc = soup.find("meta", attrs={"name": "description"})
        desc_content = meta_desc.get("content", "").strip() if meta_desc else None
        results["data"]["meta_description"] = desc_content

        if not desc_content:
            results["issues"].append({
                "title": "Missing meta description",
                "severity": "medium",
                "category": "seo",
                "description": "No meta description found. Search engines use this as the snippet below the link.",
                "impact": "Lower click-through rate from search results.",
                "fix_suggestion": "Add a compelling meta description between 150–160 characters.",
                "code_example": '<meta name="description" content="Describe your page in 150-160 characters here.">',
                "confidence": 0.99,
            })
            results["score_hint"] -= 10

        # ── Heading structure ──────────────────────────────────────────
        h1_tags = soup.find_all("h1")
        results["data"]["h1_count"] = len(h1_tags)
        results["data"]["h1_texts"] = [h.get_text(strip=True) for h in h1_tags[:3]]

        if len(h1_tags) == 0:
            results["issues"].append({
                "title": "Missing H1 heading",
                "severity": "critical",
                "category": "seo",
                "description": "The page has no H1 heading. H1 is the primary signal for page topic.",
                "fix_suggestion": "Add a single H1 tag describing the main topic of the page.",
                "code_example": "<h1>Your Main Page Heading</h1>",
                "confidence": 0.99,
            })
            results["score_hint"] -= 15
        elif len(h1_tags) > 1:
            results["issues"].append({
                "title": "Multiple H1 headings",
                "severity": "medium",
                "category": "seo",
                "description": f"Found {len(h1_tags)} H1 tags. A page should have exactly one H1.",
                "fix_suggestion": "Keep one H1 for the primary topic; use H2–H6 for subheadings.",
                "confidence": 0.90,
            })
            results["score_hint"] -= 7

        # ── Open Graph tags ────────────────────────────────────────────
        og_title = soup.find("meta", property="og:title")
        og_desc = soup.find("meta", property="og:description")
        og_image = soup.find("meta", property="og:image")

        results["data"]["og"] = {
            "title": og_title.get("content") if og_title else None,
            "description": og_desc.get("content") if og_desc else None,
            "image": og_image.get("content") if og_image else None,
        }

        if not og_title or not og_desc or not og_image:
            missing = [k for k, v in results["data"]["og"].items() if not v]
            results["issues"].append({
                "title": f"Missing Open Graph tags: {', '.join(missing)}",
                "severity": "minor",
                "category": "seo",
                "description": "Open Graph tags control how your page appears when shared on social media.",
                "fix_suggestion": "Add og:title, og:description, and og:image tags.",
                "code_example": '<meta property="og:title" content="Your Title">\n<meta property="og:description" content="Your description.">\n<meta property="og:image" content="https://yourdomain.com/preview.jpg">',
                "confidence": 0.95,
            })
            results["score_hint"] -= 5

        # ── Canonical tag ──────────────────────────────────────────────
        canonical = soup.find("link", rel="canonical")
        results["data"]["canonical"] = canonical.get("href") if canonical else None
        if not canonical:
            results["issues"].append({
                "title": "Missing canonical tag",
                "severity": "minor",
                "category": "seo",
                "description": "No canonical URL specified. This can cause duplicate content issues.",
                "fix_suggestion": "Add a canonical link tag pointing to the preferred URL.",
                "code_example": '<link rel="canonical" href="https://yourdomain.com/page/">',
                "confidence": 0.80,
            })
            results["score_hint"] -= 3

        # ── Images without alt ─────────────────────────────────────────
        images = soup.find_all("img")
        missing_alt = [img for img in images if not img.get("alt")]
        results["data"]["images_total"] = len(images)
        results["data"]["images_missing_alt"] = len(missing_alt)

        if missing_alt:
            results["issues"].append({
                "title": f"{len(missing_alt)} image(s) missing alt text",
                "severity": "medium" if len(missing_alt) > 3 else "minor",
                "category": "accessibility",
                "description": f"{len(missing_alt)} of {len(images)} images have no alt attribute.",
                "impact": "Screen readers cannot describe these images; also hurts image SEO.",
                "fix_suggestion": "Add descriptive alt text to all images. Use alt='' for decorative images.",
                "code_example": '<img src="hero.jpg" alt="Team working together in a modern office">',
                "confidence": 0.99,
            })
            results["score_hint"] -= min(len(missing_alt) * 2, 12)

        # ── robots.txt ─────────────────────────────────────────────────
        base = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
        try:
            robots_resp = await client.get(f"{base}/robots.txt", timeout=5)
            results["data"]["has_robots_txt"] = robots_resp.status_code == 200
        except Exception:
            results["data"]["has_robots_txt"] = False

        if not results["data"]["has_robots_txt"]:
            results["issues"].append({
                "title": "Missing robots.txt",
                "severity": "minor",
                "category": "seo",
                "description": "No robots.txt file found. Search engine crawlers expect this file.",
                "fix_suggestion": "Create a /robots.txt file at the root of your domain.",
                "code_example": "User-agent: *\nAllow: /\nSitemap: https://yourdomain.com/sitemap.xml",
                "confidence": 0.95,
            })
            results["score_hint"] -= 3

        # ── Sitemap ────────────────────────────────────────────────────
        try:
            sitemap_resp = await client.get(f"{base}/sitemap.xml", timeout=5)
            results["data"]["has_sitemap"] = sitemap_resp.status_code == 200
        except Exception:
            results["data"]["has_sitemap"] = False

        if not results["data"]["has_sitemap"]:
            results["issues"].append({
                "title": "No sitemap.xml found",
                "severity": "minor",
                "category": "seo",
                "description": "Sitemaps help search engines discover and index all your pages.",
                "fix_suggestion": "Generate a sitemap.xml and link it in robots.txt.",
                "confidence": 0.90,
            })
            results["score_hint"] -= 3

        # ── Viewport meta ──────────────────────────────────────────────
        viewport = soup.find("meta", attrs={"name": "viewport"})
        results["data"]["has_viewport"] = viewport is not None
        if not viewport:
            results["issues"].append({
                "title": "Missing viewport meta tag",
                "severity": "critical",
                "category": "responsiveness",
                "description": "No viewport meta tag found. The page will not render correctly on mobile devices.",
                "fix_suggestion": "Add the standard viewport meta tag to your <head>.",
                "code_example": '<meta name="viewport" content="width=device-width, initial-scale=1">',
                "confidence": 0.99,
            })
            results["score_hint"] -= 15

        # Clamp score
        results["score_hint"] = max(0, results["score_hint"])

    return results
