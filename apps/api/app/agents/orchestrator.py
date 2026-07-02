"""
LangGraph orchestrator — wires all agents into a sequential graph.

Graph flow:
  START → seo_node → accessibility_node → broken_links_node
        → lighthouse_collector_node → judge_node → END
"""

import asyncio
from typing import TypedDict, Any

import httpx
from langgraph.graph import StateGraph, START, END

from app.core.config import settings
from app.agents.seo_agent import run_seo_agent
from app.agents.accessibility_agent import run_accessibility_agent
from app.agents.broken_links_agent import run_broken_links_agent
from app.agents.judge_agent import run_judge_agent


# ── Graph State ────────────────────────────────────────────────────────

class AuditState(TypedDict):
    url: str
    lighthouse_data: dict | None
    seo_data: dict | None
    a11y_data: dict | None
    links_data: dict | None
    final_report: dict | None
    error: str | None


# ── Node Functions ─────────────────────────────────────────────────────

async def seo_node(state: AuditState) -> AuditState:
    """Run SEO analysis."""
    print(f"[orchestrator] Running SEO agent for {state['url']}")
    try:
        result = await run_seo_agent(state["url"])
        return {**state, "seo_data": result}
    except Exception as e:
        print(f"[orchestrator] SEO agent failed: {e}")
        return {**state, "seo_data": {"agent": "seo", "issues": [], "data": {}, "error": str(e)}}


async def accessibility_node(state: AuditState) -> AuditState:
    """Run accessibility analysis."""
    print(f"[orchestrator] Running accessibility agent for {state['url']}")
    try:
        result = await run_accessibility_agent(state["url"])
        return {**state, "a11y_data": result}
    except Exception as e:
        print(f"[orchestrator] Accessibility agent failed: {e}")
        return {**state, "a11y_data": {"agent": "accessibility", "issues": [], "data": {}, "error": str(e)}}


async def broken_links_node(state: AuditState) -> AuditState:
    """Run broken links check."""
    print(f"[orchestrator] Running broken links agent for {state['url']}")
    try:
        result = await run_broken_links_agent(state["url"])
        return {**state, "links_data": result}
    except Exception as e:
        print(f"[orchestrator] Broken links agent failed: {e}")
        return {**state, "links_data": {"agent": "broken_links", "issues": [], "data": {}, "error": str(e)}}


async def lighthouse_collector_node(state: AuditState) -> AuditState:
    """Call the Node.js Lighthouse worker and collect structured results."""
    print(f"[orchestrator] Calling Lighthouse worker for {state['url']}")
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.get(
                f"{settings.lighthouse_worker_url}/audit",
                params={"url": state["url"]},
            )
            data = resp.json()
            if data.get("success"):
                return {**state, "lighthouse_data": data}
            else:
                print(f"[orchestrator] Lighthouse returned error: {data.get('error')}")
                return {**state, "lighthouse_data": None}
    except Exception as e:
        print(f"[orchestrator] Lighthouse worker unreachable: {e}")
        return {**state, "lighthouse_data": None}


async def judge_node(state: AuditState) -> AuditState:
    """Run the AI judge to produce the final report."""
    print(f"[orchestrator] Running judge agent for {state['url']}")
    try:
        report = await run_judge_agent(
            url=state["url"],
            lighthouse_data=state.get("lighthouse_data"),
            seo_data=state.get("seo_data") or {},
            a11y_data=state.get("a11y_data") or {},
            links_data=state.get("links_data") or {},
        )
        return {**state, "final_report": report}
    except Exception as e:
        print(f"[orchestrator] Judge agent failed: {e}")
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

    initial_state: AuditState = {
        "url": url,
        "lighthouse_data": None,
        "seo_data": None,
        "a11y_data": None,
        "links_data": None,
        "final_report": None,
        "error": None,
    }

    final_state = await audit_graph.ainvoke(initial_state)

    if final_state.get("error"):
        raise RuntimeError(f"Audit failed: {final_state['error']}")

    # Attach screenshots from Lighthouse to the report
    report = final_state.get("final_report") or {}
    lh_data = final_state.get("lighthouse_data") or {}
    screenshots = lh_data.get("screenshots", {})
    report["screenshot_desktop"] = screenshots.get("desktop")
    report["screenshot_mobile"] = screenshots.get("mobile")

    return report

