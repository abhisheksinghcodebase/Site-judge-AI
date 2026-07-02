"""Reports API endpoints — retrieve completed audit reports."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.db import Report, Scan, ScanStatus
from app.schemas.scan import ReportResponse

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/{scan_id}", response_model=ReportResponse)
async def get_report(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve the full report for a completed scan.
    Returns 404 if scan not found, 202 if scan still running.
    """
    # Verify scan exists
    scan_result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = scan_result.scalar_one_or_none()

    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    if scan.status == ScanStatus.FAILED:
        raise HTTPException(
            status_code=422,
            detail=f"Scan failed: {scan.error_message or 'Unknown error'}",
        )

    if scan.status in (ScanStatus.QUEUED, ScanStatus.RUNNING):
        raise HTTPException(
            status_code=202,
            detail=f"Scan is {scan.status.value}. Check back soon.",
        )

    # Load report with issues eagerly
    result = await db.execute(
        select(Report)
        .where(Report.scan_id == scan_id)
        .options(selectinload(Report.issues))
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return ReportResponse.from_orm_report(report)
