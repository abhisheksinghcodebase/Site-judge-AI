"""
Judge Agent — Final AI reasoning node.
Receives all structured evidence from specialized agents + Lighthouse.
Uses Groq (llama-3.3-70b-versatile) to produce the final scored report.
"""

import json
import re
from typing import Any

from groq import AsyncGroq

from app.core.config import settings


# Model to use — fast + highly capable for structured JSON output
GROQ_MODEL = "llama-3.3-70b-versatile"

JUDGE_SYSTEM_PROMPT = """You are SiteJudge AI, a senior principal systems architect and elite security auditor.
You receive structured evidence from specialized web analyzers (Lighthouse metrics, SEO crawler, Axe accessibility, broken link checker).
Your job is to synthesize this into an unsparing, high-standard, and professional production-readiness report.

JUDGMENT PRINCIPLES:
- **Strict Scoring**: Do not give easy passes. If a category has even one critical issue, that category score MUST be capped at 65. If a security vulnerability is identified, the Security score MUST be capped at 45.
- **Deep Technical Reasoning**: Go beyond superficial issues. Cross-reference data. For example, if accessibility has a low score, explain how the specific markup failures block screen readers or impact SEO.
- **Accurate Impacts**: The impact statement for each issue must be highly specific, outlining concrete performance hits (e.g., "blocking the main thread for 180ms"), UX failures (e.g., "causing layout shifts on viewports under 640px"), or security risks.
- **No Placeholders**: Do not include generic advice. Every recommendation must be customized to the audited URL's specific findings.

SCORING METHODOLOGY:
- Base each category score on the evidence provided (0-100 scale)
- Weight: Performance 20%, Accessibility 20%, SEO 15%, Security 15%, Best Practices 10%, UX 10%, Responsiveness 10%
- overall_score = weighted average of all categories

SEVERITY DEFINITIONS:
- critical: Immediate risk (blocks usability, causes security leak, breaks layout on mobile, or halts search indexing)
- medium: Significant weakness (hurts SEO rank, degrades performance, or causes minor accessibility blocks)
- minor: Code style or standard best practice deviation (easy to fix, low impact)

CRITICAL RULE: Return ONLY a valid JSON object matching the requested schema. No prose, no markdown fences, no comments."""


JUDGE_PROMPT_TEMPLATE = """
Analyze the following website audit evidence and produce a complete report.

URL: {url}

=== LIGHTHOUSE DATA ===
{lighthouse_data}

=== SEO AGENT FINDINGS ===
{seo_data}

=== ACCESSIBILITY AGENT FINDINGS ===
{a11y_data}

=== BROKEN LINKS AGENT FINDINGS ===
{links_data}

Produce a JSON object matching EXACTLY this schema:
{{
  "overall_score": <integer 0-100>,
  "executive_summary": "<3 sentence summary of production readiness, biggest risks, and top recommendation>",
  "scores": {{
    "performance": <integer 0-100 or null>,
    "accessibility": <integer 0-100 or null>,
    "seo": <integer 0-100 or null>,
    "security": <integer 0-100 or null>,
    "best_practices": <integer 0-100 or null>,
    "ux": <integer 0-100 or null>,
    "responsiveness": <integer 0-100 or null>
  }},
  "issues": [
    {{
      "title": "<concise issue title>",
      "severity": "<critical|medium|minor>",
      "category": "<performance|accessibility|seo|security|best_practices|ux|responsiveness|broken_links>",
      "description": "<plain English explanation of the problem>",
      "impact": "<specific user or business impact>",
      "fix_suggestion": "<concrete, actionable fix>",
      "code_example": "<code snippet showing the fix, or null if not applicable>",
      "confidence": <float 0.0-1.0>
    }}
  ]
}}

Include ALL issues found across all agents. Sort issues by: critical first, then by confidence descending.
Return ONLY the JSON object, nothing else.
"""


async def run_judge_agent(
    url: str,
    lighthouse_data: dict | None,
    seo_data: dict,
    a11y_data: dict,
    links_data: dict,
) -> dict:
    """
    Calls Groq (llama-3.3-70b-versatile) with structured evidence to produce
    the final scored report. Falls back to rule-based report if AI call fails.
    """
    client = AsyncGroq(api_key=settings.groq_api_key)

    # Build evidence strings (truncate to keep within context window)
    def safe_json(data: Any, max_chars: int = 4000) -> str:
        s = json.dumps(data, indent=2, default=str)
        return s[:max_chars] + "\n...[truncated]" if len(s) > max_chars else s

    prompt = JUDGE_PROMPT_TEMPLATE.format(
        url=url,
        lighthouse_data=safe_json(lighthouse_data or {"error": "Lighthouse data unavailable"}, 5000),
        seo_data=safe_json(seo_data, 3000),
        a11y_data=safe_json(a11y_data, 3000),
        links_data=safe_json(links_data, 2000),
    )

    try:
        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,       # Low temperature for factual, consistent output
            max_tokens=4096,
            response_format={"type": "json_object"},  # Enforce JSON output
        )

        raw = response.choices[0].message.content.strip()

        # Strip markdown fences defensively
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        report_data = json.loads(raw)

        # Validate required fields
        for field in ["overall_score", "executive_summary", "scores", "issues"]:
            if field not in report_data:
                raise ValueError(f"Missing required field: {field}")

        print(f"[judge] Groq report generated. Score: {report_data.get('overall_score')} | Issues: {len(report_data.get('issues', []))}")
        return report_data

    except Exception as e:
        print(f"[judge] Groq call failed ({e}), using rule-based fallback")
        return _rule_based_fallback(url, lighthouse_data, seo_data, a11y_data, links_data)


def _rule_based_fallback(url, lighthouse_data, seo_data, a11y_data, links_data) -> dict:
    """
    Simple rule-based report when AI is unavailable.
    Aggregates issues from all agents and estimates scores.
    """
    all_issues = []
    for agent_data in [seo_data, a11y_data, links_data]:
        all_issues.extend(agent_data.get("issues", []))

    lh_scores = lighthouse_data.get("scores", {}) if lighthouse_data else {}
    seo_hint = seo_data.get("score_hint", 70)
    a11y_hint = a11y_data.get("score_hint", 70)

    performance = lh_scores.get("performance") or 70
    accessibility = lh_scores.get("accessibility") or a11y_hint
    seo = lh_scores.get("seo") or seo_hint
    best_practices = lh_scores.get("bestPractices") or 75
    has_viewport = seo_data.get("data", {}).get("has_viewport", True)
    responsiveness = 85 if has_viewport else 40

    overall = round(
        performance * 0.20
        + accessibility * 0.20
        + seo * 0.15
        + 60 * 0.15
        + best_practices * 0.10
        + 70 * 0.10
        + responsiveness * 0.10
    )

    return {
        "overall_score": overall,
        "executive_summary": (
            f"This site scored {overall}/100 overall. "
            "The report was generated using rule-based analysis (AI reasoning temporarily unavailable). "
            "Review the issues list for actionable improvements."
        ),
        "scores": {
            "performance": performance,
            "accessibility": accessibility,
            "seo": seo,
            "security": None,
            "best_practices": best_practices,
            "ux": 70,
            "responsiveness": responsiveness,
        },
        "issues": all_issues,
    }
