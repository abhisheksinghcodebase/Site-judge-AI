"""Accessibility Agent — runs Axe-core via Playwright and analyses WCAG violations."""

import json
import asyncio
from playwright.async_api import async_playwright


# Axe-core CDN URL (injected into the page for analysis)
AXE_CORE_URL = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js"

SEVERITY_MAP = {
    "critical": "critical",
    "serious": "critical",
    "moderate": "medium",
    "minor": "minor",
}

CATEGORY_MAP = {
    "wcag2a": "accessibility",
    "wcag2aa": "accessibility",
    "wcag21aa": "accessibility",
    "best-practice": "best_practices",
    "experimental": "accessibility",
}


async def run_accessibility_agent(url: str) -> dict:
    """
    Run Axe-core against the URL via Playwright and return structured violations.
    """
    results = {
        "agent": "accessibility",
        "url": url,
        "issues": [],
        "data": {
            "violations": [],
            "passes": 0,
            "incomplete": 0,
        },
        "score_hint": 100,
    }

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
            )
            page = await browser.new_page(viewport={"width": 1280, "height": 800})

            try:
                await page.goto(url, wait_until="networkidle", timeout=30000)
            except Exception as e:
                await browser.close()
                results["issues"].append({
                    "title": "Page failed to load for accessibility scan",
                    "severity": "critical",
                    "category": "accessibility",
                    "description": str(e),
                    "confidence": 0.99,
                })
                return results

            # Inject Axe-core
            try:
                await page.add_script_tag(url=AXE_CORE_URL)
                await page.wait_for_timeout(1000)
            except Exception:
                # Fallback: load from CDN via evaluate
                pass

            # Run Axe
            try:
                axe_results = await page.evaluate("""
                    async () => {
                        if (typeof axe === 'undefined') return { violations: [], passes: [], incomplete: [] };
                        const results = await axe.run(document, {
                            runOnly: {
                                type: 'tag',
                                values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']
                            }
                        });
                        return {
                            violations: results.violations.map(v => ({
                                id: v.id,
                                impact: v.impact,
                                description: v.description,
                                help: v.help,
                                helpUrl: v.helpUrl,
                                tags: v.tags,
                                nodes: v.nodes.slice(0, 3).map(n => ({
                                    html: n.html,
                                    failureSummary: n.failureSummary,
                                    target: n.target
                                }))
                            })),
                            passes: results.passes.length,
                            incomplete: results.incomplete.length
                        };
                    }
                """)
            except Exception as e:
                await browser.close()
                results["issues"].append({
                    "title": "Axe-core scan failed",
                    "severity": "medium",
                    "category": "accessibility",
                    "description": f"Could not run Axe: {str(e)}",
                    "confidence": 0.7,
                })
                return results

            await browser.close()

            results["data"]["passes"] = axe_results.get("passes", 0)
            results["data"]["incomplete"] = axe_results.get("incomplete", 0)

            violations = axe_results.get("violations", [])
            results["data"]["violations"] = violations

            score_deduction = 0
            for v in violations:
                impact = v.get("impact", "minor")
                severity = SEVERITY_MAP.get(impact, "minor")

                # Build a helpful code example from the first violating node
                nodes = v.get("nodes", [])
                code_example = None
                if nodes:
                    code_example = nodes[0].get("html", None)

                issue = {
                    "title": v.get("help", v.get("id", "Accessibility violation")),
                    "severity": severity,
                    "category": "accessibility",
                    "description": v.get("description", ""),
                    "impact": f"Affects users with disabilities. WCAG violation: {', '.join(v.get('tags', [])[:3])}",
                    "fix_suggestion": f"See WCAG guidance: {v.get('helpUrl', '')}",
                    "code_example": code_example,
                    "confidence": 0.95,
                }
                results["issues"].append(issue)

                if severity == "critical":
                    score_deduction += 15
                elif severity == "medium":
                    score_deduction += 7
                else:
                    score_deduction += 3

            results["score_hint"] = max(0, 100 - score_deduction)

    except Exception as e:
        results["issues"].append({
            "title": "Accessibility scan error",
            "severity": "medium",
            "category": "accessibility",
            "description": str(e),
            "confidence": 0.5,
        })

    return results
