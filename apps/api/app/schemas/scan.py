"""Pydantic schemas for request/response validation."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, HttpUrl, field_validator


# ── Enums ─────────────────────────────────────────────────────────────

class ScanStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class IssueSeverity(str, Enum):
    CRITICAL = "critical"
    MEDIUM = "medium"
    MINOR = "minor"


class IssueCategory(str, Enum):
    PERFORMANCE = "performance"
    ACCESSIBILITY = "accessibility"
    SEO = "seo"
    SECURITY = "security"
    BEST_PRACTICES = "best_practices"
    UX = "ux"
    RESPONSIVENESS = "responsiveness"
    BROKEN_LINKS = "broken_links"


# ── Scan ──────────────────────────────────────────────────────────────

class ScanCreate(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            v = f"https://{v}"
        return v.rstrip("/")


class ScanResponse(BaseModel):
    id: str
    url: str
    status: ScanStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Issues ────────────────────────────────────────────────────────────

class IssueResponse(BaseModel):
    id: str
    title: str
    severity: IssueSeverity
    category: IssueCategory
    description: str
    impact: Optional[str] = None
    fix_suggestion: Optional[str] = None
    code_example: Optional[str] = None
    confidence: float

    model_config = {"from_attributes": True}


# ── Report ────────────────────────────────────────────────────────────

class CategoryScores(BaseModel):
    performance: Optional[int] = None
    accessibility: Optional[int] = None
    seo: Optional[int] = None
    security: Optional[int] = None
    best_practices: Optional[int] = None
    ux: Optional[int] = None
    responsiveness: Optional[int] = None


class ReportResponse(BaseModel):
    id: str
    scan_id: str
    overall_score: int
    executive_summary: Optional[str] = None
    scores: CategoryScores
    issues: list[IssueResponse]
    screenshot_desktop: Optional[str] = None
    screenshot_mobile: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_report(cls, report) -> "ReportResponse":
        return cls(
            id=report.id,
            scan_id=report.scan_id,
            overall_score=report.overall_score,
            executive_summary=report.executive_summary,
            scores=CategoryScores(
                performance=report.performance,
                accessibility=report.accessibility,
                seo=report.seo,
                security=report.security,
                best_practices=report.best_practices,
                ux=report.ux,
                responsiveness=report.responsiveness,
            ),
            issues=[IssueResponse.model_validate(i) for i in report.issues],
            screenshot_desktop=report.screenshot_desktop,
            screenshot_mobile=report.screenshot_mobile,
            created_at=report.created_at,
        )
