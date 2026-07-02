"""Scan API endpoints — create scans and check status."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.db import Scan, ScanStatus
from app.schemas.scan import ScanCreate, ScanResponse

router = APIRouter(prefix="/scans", tags=["scans"])


from app.core.config import settings

async def run_local_scan_async(scan_id: str):
    """Fallback runner that processes scans asynchronously without Celery/Redis."""
    from app.core.database import AsyncSessionLocal
    from app.models.db import Scan, Report, Issue, ScanStatus, IssueSeverity, IssueCategory
    from app.agents.orchestrator import run_full_audit

    async with AsyncSessionLocal() as db:
        try:
            # Mark scan as running
            result = await db.execute(select(Scan).where(Scan.id == scan_id))
            scan = result.scalar_one_or_none()
            if not scan:
                print(f"[local-scan] Scan {scan_id} not found")
                return

            scan.status = ScanStatus.RUNNING
            scan.started_at = datetime.now(timezone.utc)
            await db.commit()

            print(f"[local-scan] Starting local audit for scan {scan_id}: {scan.url}")
            report_data = await run_full_audit(scan.url, scan_id)

            # Persist report
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
                code_quality=scores.get("code_quality"),
                efficiency=scores.get("efficiency"),
                alignment=scores.get("alignment"),
                screenshot_desktop=report_data.get("screenshot_desktop"),
                screenshot_mobile=report_data.get("screenshot_mobile"),
            )
            db.add(report)
            await db.flush()

            # Persist issues
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

            scan.status = ScanStatus.COMPLETED
            scan.completed_at = datetime.now(timezone.utc)
            await db.commit()
            print(f"[local-scan] Scan {scan_id} completed successfully")

        except Exception as e:
            print(f"[local-scan] Scan {scan_id} failed: {e}")
            await db.rollback()
            try:
                result = await db.execute(select(Scan).where(Scan.id == scan_id))
                scan = result.scalar_one_or_none()
                if scan:
                    scan.status = ScanStatus.FAILED
                    scan.error_message = str(e)[:500]
                    await db.commit()
            except Exception as ex:
                print(f"[local-scan] Failed to mark scan as failed: {ex}")


@router.post("/", response_model=ScanResponse, status_code=202)
async def create_scan(
    payload: ScanCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a URL for scanning. Returns immediately with scan_id and status=queued.
    Runs asynchronously via Celery (if enabled) or fallback local background tasks.
    """
    scan_id = str(uuid.uuid4())

    scan = Scan(
        id=scan_id,
        url=payload.url,
        status=ScanStatus.QUEUED,
        created_at=datetime.now(timezone.utc),
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    if settings.use_celery:
        try:
            from app.workers.celery_app import run_scan_task
            run_scan_task.delay(scan_id)
            print(f"[scans] Enqueued scan {scan_id} via Celery")
        except Exception as e:
            print(f"[scans] Celery failed to enqueue scan {scan_id}: {e}. Falling back to background tasks.")
            background_tasks.add_task(run_local_scan_async, scan_id)
    else:
        background_tasks.add_task(run_local_scan_async, scan_id)

    return scan


@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get the current status of a scan."""
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()

    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    return scan


@router.get("/", response_model=list[ScanResponse])
async def list_scans(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """List recent scans (for dashboard)."""
    result = await db.execute(
        select(Scan).order_by(Scan.created_at.desc()).limit(limit)
    )
    return result.scalars().all()
