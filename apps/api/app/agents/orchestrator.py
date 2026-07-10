"""
LangGraph orchestrator — wires all agents into a sequential graph.

Graph flow:
  START → seo_node → accessibility_node → broken_links_node
        → lighthouse_collector_node → judge_node → END

Each node pushes real-time progress events to the ProgressStore so
the frontend can stream live terminal output via SSE.
"""

import asyncio
from typing import TypedDict, Any

import httpx
from langgraph.graph import StateGraph, START, END

from app.core.config import settings
from app.core.progress_store import progress_store
from app.agents.seo_agent import run_seo_agent
from app.agents.accessibility_agent import run_accessibility_agent
from app.agents.broken_links_agent import run_broken_links_agent
from app.agents.judge_agent import run_judge_agent


# ── Graph State ────────────────────────────────────────────────────────

class AuditState(TypedDict):
    url: str
    scan_id: str
    lighthouse_data: dict | None
    seo_data: dict | None
    a11y_data: dict | None
    links_data: dict | None
    final_report: dict | None
    error: str | None


# ── Node Functions ─────────────────────────────────────────────────────

async def seo_node(state: AuditState) -> AuditState:
    """Run SEO analysis."""
    sid = state.get("scan_id", "")
    print(f"[orchestrator] Running SEO agent for {state['url']}")
    await progress_store.push_step_start(sid, "seo", "Starting SEO analysis...", step_index=0)
    await progress_store.push_log(sid, "seo", f"Fetching HTML from {state['url']}...")
    try:
        result = await run_seo_agent(state["url"])
        issue_count = len(result.get("issues", []))
        score_hint = result.get("score_hint", "?")
        await progress_store.push_log(sid, "seo", f"Parsed meta tags, headings, OG data, robots.txt, sitemap")
        await progress_store.push_log(sid, "seo", f"Found {issue_count} SEO issue(s). Score hint: {score_hint}/100")
        await progress_store.push_step_done(sid, "seo", f"SEO analysis complete — {issue_count} issues found", step_index=0)
        return {**state, "seo_data": result}
    except Exception as e:
        print(f"[orchestrator] SEO agent failed: {e}")
        await progress_store.push_log(sid, "seo", f"⚠ SEO agent error: {e}")
        await progress_store.push_step_done(sid, "seo", "SEO analysis completed with errors", step_index=0)
        return {**state, "seo_data": {"agent": "seo", "issues": [], "data": {}, "error": str(e)}}


async def accessibility_node(state: AuditState) -> AuditState:
    """Run accessibility analysis."""
    sid = state.get("scan_id", "")
    print(f"[orchestrator] Running accessibility agent for {state['url']}")
    await progress_store.push_step_start(sid, "accessibility", "Starting accessibility scan (Axe-core)...", step_index=1)
    await progress_store.push_log(sid, "accessibility", "Launching headless browser for WCAG 2.1 AA audit...")
    try:
        result = await run_accessibility_agent(state["url"])
        issue_count = len(result.get("issues", []))
        await progress_store.push_log(sid, "accessibility", f"Axe-core engine analyzed DOM structure and ARIA attributes")
        await progress_store.push_log(sid, "accessibility", f"Found {issue_count} accessibility violation(s)")
        await progress_store.push_step_done(sid, "accessibility", f"Accessibility scan complete — {issue_count} issues", step_index=1)
        return {**state, "a11y_data": result}
    except Exception as e:
        print(f"[orchestrator] Accessibility agent failed: {e}")
        await progress_store.push_log(sid, "accessibility", f"⚠ Accessibility agent error: {e}")
        await progress_store.push_step_done(sid, "accessibility", "Accessibility scan completed with errors", step_index=1)
        return {**state, "a11y_data": {"agent": "accessibility", "issues": [], "data": {}, "error": str(e)}}


async def broken_links_node(state: AuditState) -> AuditState:
    """Run broken links check."""
    sid = state.get("scan_id", "")
    print(f"[orchestrator] Running broken links agent for {state['url']}")
    await progress_store.push_step_start(sid, "broken_links", "Starting link integrity check...", step_index=2)
    await progress_store.push_log(sid, "broken_links", "Extracting all anchor, image, and script URLs from page...")
    try:
        result = await run_broken_links_agent(state["url"])
        link_data = result.get("data", {})
        total = link_data.get("total_links", 0)
        broken = link_data.get("broken_count", 0)
        await progress_store.push_log(sid, "broken_links", f"Scanned {total} links concurrently")
        await progress_store.push_log(sid, "broken_links", f"Detected {broken} broken link(s)")
        await progress_store.push_step_done(sid, "broken_links", f"Link check complete — {broken}/{total} broken", step_index=2)
        return {**state, "links_data": result}
    except Exception as e:
        print(f"[orchestrator] Broken links agent failed: {e}")
        await progress_store.push_log(sid, "broken_links", f"⚠ Broken links agent error: {e}")
        await progress_store.push_step_done(sid, "broken_links", "Link check completed with errors", step_index=2)
        return {**state, "links_data": {"agent": "broken_links", "issues": [], "data": {}, "error": str(e)}}


async def lighthouse_collector_node(state: AuditState) -> AuditState:
    """Call the Node.js Lighthouse worker and collect structured results."""
    sid = state.get("scan_id", "")
    print(f"[orchestrator] Calling Lighthouse worker for {state['url']}")
    await progress_store.push_step_start(sid, "lighthouse", "Starting Lighthouse performance audit...", step_index=3)
    await progress_store.push_log(sid, "lighthouse", f"Connecting to Lighthouse worker at {settings.lighthouse_worker_url}")
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            await progress_store.push_log(sid, "lighthouse", "Running Core Web Vitals measurement (LCP, FCP, TBT, CLS)...")
            resp = await client.get(
                f"{settings.lighthouse_worker_url}/audit",
                params={"url": state["url"]},
            )
            data = resp.json()
            if data.get("success"):
                scores = data.get("scores", {})
                perf = scores.get("performance", "N/A")
                a11y = scores.get("accessibility", "N/A")
                bp = scores.get("bestPractices", "N/A")
                seo = scores.get("seo", "N/A")
                await progress_store.push_log(sid, "lighthouse",
                    f"Lighthouse scores — Perf: {perf}, A11y: {a11y}, BP: {bp}, SEO: {seo}")
                await progress_store.push_log(sid, "lighthouse", "Captured desktop & mobile screenshots")
                await progress_store.push_step_done(sid, "lighthouse", f"Lighthouse audit complete — Performance: {perf}", step_index=3)
                return {**state, "lighthouse_data": data}
            else:
                err = data.get("error", "Unknown error")
                await progress_store.push_log(sid, "lighthouse", f"⚠ Lighthouse returned error: {err}")
                await progress_store.push_step_done(sid, "lighthouse", "Lighthouse audit completed with errors", step_index=3)
                return {**state, "lighthouse_data": None}
    except Exception as e:
        print(f"[orchestrator] Lighthouse worker unreachable: {e}")
        await progress_store.push_log(sid, "lighthouse", f"⚠ Lighthouse worker unreachable: {e}")
        await progress_store.push_step_done(sid, "lighthouse", "Lighthouse audit skipped (worker unavailable)", step_index=3)
        return {**state, "lighthouse_data": None}


async def judge_node(state: AuditState) -> AuditState:
    """Run the AI judge to produce the final report."""
    sid = state.get("scan_id", "")
    print(f"[orchestrator] Running judge agent for {state['url']}")
    await progress_store.push_step_start(sid, "judge", "Starting AI reasoning engine...", step_index=4)
    await progress_store.push_log(sid, "judge", f"Connecting to Groq API (model: llama-3.3-70b-versatile)")
    await progress_store.push_log(sid, "judge", "Compiling evidence from SEO, Accessibility, Links, and Lighthouse agents...")
    try:
        report = await run_judge_agent(
            url=state["url"],
            lighthouse_data=state.get("lighthouse_data"),
            seo_data=state.get("seo_data") or {},
            a11y_data=state.get("a11y_data") or {},
            links_data=state.get("links_data") or {},
        )
        overall = report.get("overall_score", "?")
        issue_count = len(report.get("issues", []))
        await progress_store.push_log(sid, "judge", f"AI synthesis complete. Overall score: {overall}/100")
        await progress_store.push_log(sid, "judge", f"Generated {issue_count} issue(s) with fix suggestions")
        await progress_store.push_step_done(sid, "judge", f"AI report generated — Score: {overall}/100", step_index=4)
        return {**state, "final_report": report}
    except Exception as e:
        print(f"[orchestrator] Judge agent failed: {e}")
        await progress_store.push_log(sid, "judge", f"⚠ Judge agent error: {e}")
        await progress_store.push_step_done(sid, "judge", "AI reasoning completed with errors", step_index=4)
        return {**state, "error": str(e)}


# ── Build the Graph ────────────────────────────────────────────────────

def build_audit_graph():
    """Construct and compile the LangGraph audit workflow."""
    builder = StateGraph(AuditState)

    builder.add_node("seo", seo_node)
    builder.add_node("accessibility", accessibility_node)
    builder.add_node("broken_links", broken_links_node)
    builder.add_node("lighthouse", lighthouse_collector_node)
    builder.add_node("judge", judge_node)

    # Sequential flow
    builder.add_edge(START, "seo")
    builder.add_edge("seo", "accessibility")
    builder.add_edge("accessibility", "broken_links")
    builder.add_edge("broken_links", "lighthouse")
    builder.add_edge("lighthouse", "judge")
    builder.add_edge("judge", END)

    return builder.compile()


# Singleton graph instance
audit_graph = build_audit_graph()


def is_github_repo(url: str) -> bool:
    """Check if the given URL points to a GitHub repository."""
    clean = url.lower().strip()
    return "github.com" in clean or clean.startswith("github.com")


async def run_full_audit(url: str, scan_id: str = "") -> dict:
    """
    Entry point for running a complete website audit (either web URL or GitHub repo).
    Returns the final_report dict.
    """
    if is_github_repo(url):
        import uuid
        from app.agents.github_agent import run_github_agent
        sid = scan_id or str(uuid.uuid4())
        return await run_github_agent(url, sid)

    # Push initial system events
    await progress_store.push_log(scan_id, "system", f"$ sitejudge --audit {url}")
    await progress_store.push_log(scan_id, "system", "Initializing audit pipeline...")
    await progress_store.push_log(scan_id, "system", "Pipeline: SEO → Accessibility → Broken Links → Lighthouse → AI Judge")

    initial_state: AuditState = {
        "url": url,
        "scan_id": scan_id,
        "lighthouse_data": None,
        "seo_data": None,
        "a11y_data": None,
        "links_data": None,
        "final_report": None,
        "error": None,
    }

    final_state = await audit_graph.ainvoke(initial_state)

    if final_state.get("error"):
        await progress_store.push_error(scan_id, f"Audit failed: {final_state['error']}")
        raise RuntimeError(f"Audit failed: {final_state['error']}")

    # Attach screenshots from Lighthouse to the report
    report = final_state.get("final_report") or {}
    lh_data = final_state.get("lighthouse_data") or {}
    screenshots = lh_data.get("screenshots", {})
    report["screenshot_desktop"] = screenshots.get("desktop")
    report["screenshot_mobile"] = screenshots.get("mobile")

    await progress_store.push_complete(scan_id)

    return report
