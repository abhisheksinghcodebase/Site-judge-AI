"""Celery worker configuration and task definitions."""

import asyncio
from datetime import datetime, timezone

from celery import Celery
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings

# ── Celery app ─────────────────────────────────────────────────────────
celery_app = Celery(
    "sitejudge",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,  # Process one task at a time per worker
)

# Sync engine for Celery (Celery workers run sync)
_sync_db_url = settings.database_url.replace("+asyncpg", "+psycopg2")
_engine = create_engine(_sync_db_url, pool_pre_ping=True)
SyncSession = sessionmaker(bind=_engine)


@celery_app.task(name="run_scan", bind=True, max_retries=2)
def run_scan_task(self, scan_id: str):
    """
    Main scan task. Runs the full LangGraph audit pipeline and persists results.
    """
    from app.models.db import Scan, Report, Issue, ScanStatus
    from app.agents.orchestrator import run_full_audit

    db: Session = SyncSession()
    try:
        # ── Mark scan as RUNNING ───────────────────────────────────────
        scan = db.get(Scan, scan_id)
        if not scan:
            print(f"[celery] Scan {scan_id} not found")
            return

        scan.status = ScanStatus.RUNNING
        scan.started_at = datetime.now(timezone.utc)
        db.commit()

        # ── Run the audit (async inside sync Celery task) ──────────────
        print(f"[celery] Starting audit for scan {scan_id}: {scan.url}")
        report_data = asyncio.run(run_full_audit(scan.url))

        # ── Persist report ─────────────────────────────────────────────
        scores = report_data.get("scores", {})
        report = Report(
            scan_id=scan_id,
            overall_score=report_data.get("overall_score", 0),
            executive_summary=report_data.get("executive_summary"),
            performance=scores.get("performance"),
            accessibility=scores.get("accessibility"),
            seo=scores.get("seo"),
            security=scores.get("security"),
            best_practices=scores.get("best_practices"),
            ux=scores.get("ux"),
            responsiveness=scores.get("responsiveness"),
            screenshot_desktop=report_data.get("screenshot_desktop"),
            screenshot_mobile=report_data.get("screenshot_mobile"),
        )
        db.add(report)
        db.flush()  # Get report.id before adding issues

        # ── Persist issues ─────────────────────────────────────────────
        from app.models.db import IssueSeverity, IssueCategory

        for issue_data in report_data.get("issues", []):
            try:
                severity = IssueSeverity(issue_data.get("severity", "minor"))
            except ValueError:
                severity = IssueSeverity.MINOR

            try:
                category = IssueCategory(issue_data.get("category", "best_practices"))
            except ValueError:
                category = IssueCategory.BEST_PRACTICES

            issue = Issue(
                report_id=report.id,
                title=issue_data.get("title", "Unknown issue")[:512],
                severity=severity,
                category=category,
                description=issue_data.get("description", ""),
                impact=issue_data.get("impact"),
                fix_suggestion=issue_data.get("fix_suggestion"),
                code_example=issue_data.get("code_example"),
                confidence=float(issue_data.get("confidence", 0.8)),
            )
            db.add(issue)

        # ── Mark scan as COMPLETED ─────────────────────────────────────
        scan.status = ScanStatus.COMPLETED
        scan.completed_at = datetime.now(timezone.utc)
        db.commit()

        print(f"[celery] Scan {scan_id} completed. Score: {report.overall_score}")

    except Exception as e:
        print(f"[celery] Scan {scan_id} failed: {e}")
        db.rollback()
        try:
            scan = db.get(Scan, scan_id)
            if scan:
                scan.status = ScanStatus.FAILED
                scan.error_message = str(e)[:500]
                db.commit()
        except Exception:
            pass
        raise self.retry(exc=e, countdown=10)
    finally:
        db.close()
