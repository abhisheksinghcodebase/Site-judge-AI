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


@router.post("/", response_model=ScanResponse, status_code=202)
async def create_scan(
    payload: ScanCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a URL for scanning. Returns immediately with scan_id and status=queued.
    The actual audit runs asynchronously via Celery.
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

    # Enqueue Celery task
    from app.workers.celery_app import run_scan_task
    run_scan_task.delay(scan_id)

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
