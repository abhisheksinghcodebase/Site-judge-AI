"""SQLAlchemy ORM models."""

import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    String,
    Integer,
    Float,
    Text,
    DateTime,
    ForeignKey,
    Enum,
    func,
)
from sqlalchemy.types import TypeDecorator, CHAR

# Dialect-independent GUID type for SQLite + PostgreSQL compatibility
class GUID(TypeDecorator):
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import UUID as pgUUID
            return dialect.type_descriptor(pgUUID(as_uuid=False))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        return value

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ScanStatus(str, PyEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class IssueSeverity(str, PyEnum):
    CRITICAL = "critical"
    MEDIUM = "medium"
    MINOR = "minor"


class IssueCategory(str, PyEnum):
    PERFORMANCE = "performance"
    ACCESSIBILITY = "accessibility"
    SEO = "seo"
    SECURITY = "security"
    BEST_PRACTICES = "best_practices"
    UX = "ux"
    RESPONSIVENESS = "responsiveness"
    BROKEN_LINKS = "broken_links"
    CODE_QUALITY = "code_quality"
    EFFICIENCY = "efficiency"
    ALIGNMENT = "alignment"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    clerk_user_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    projects: Mapped[list["Project"]] = relationship("Project", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(GUID, ForeignKey("users.id"), index=True)
    url: Mapped[str] = mapped_column(String(2048))
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="projects")
    scans: Mapped[list["Scan"]] = relationship("Scan", back_populates="project", cascade="all, delete-orphan")


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    url: Mapped[str] = mapped_column(String(2048))  # Direct URL scan (no project required for MVP)
    project_id: Mapped[str | None] = mapped_column(GUID, ForeignKey("projects.id"), nullable=True, index=True)
    status: Mapped[ScanStatus] = mapped_column(Enum(ScanStatus), default=ScanStatus.QUEUED, index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    project: Mapped["Project | None"] = relationship("Project", back_populates="scans")
    report: Mapped["Report | None"] = relationship("Report", back_populates="scan", uselist=False, cascade="all, delete-orphan")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id: Mapped[str] = mapped_column(GUID, ForeignKey("scans.id"), unique=True, index=True)

    # Overall
    overall_score: Mapped[int] = mapped_column(Integer, default=0)
    executive_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Category scores (0-100)
    performance: Mapped[int | None] = mapped_column(Integer, nullable=True)
    accessibility: Mapped[int | None] = mapped_column(Integer, nullable=True)
    seo: Mapped[int | None] = mapped_column(Integer, nullable=True)
    security: Mapped[int | None] = mapped_column(Integer, nullable=True)
    best_practices: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ux: Mapped[int | None] = mapped_column(Integer, nullable=True)
    responsiveness: Mapped[int | None] = mapped_column(Integer, nullable=True)
    code_quality: Mapped[int | None] = mapped_column(Integer, nullable=True)
    efficiency: Mapped[int | None] = mapped_column(Integer, nullable=True)
    alignment: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Screenshots (base64 encoded)
    screenshot_desktop: Mapped[str | None] = mapped_column(Text, nullable=True)
    screenshot_mobile: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    scan: Mapped["Scan"] = relationship("Scan", back_populates="report")
    issues: Mapped[list["Issue"]] = relationship("Issue", back_populates="report", cascade="all, delete-orphan")


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id: Mapped[str] = mapped_column(GUID, ForeignKey("reports.id"), index=True)

    title: Mapped[str] = mapped_column(String(512))
    severity: Mapped[IssueSeverity] = mapped_column(Enum(IssueSeverity), index=True)
    category: Mapped[IssueCategory] = mapped_column(Enum(IssueCategory), index=True)
    description: Mapped[str] = mapped_column(Text)
    impact: Mapped[str | None] = mapped_column(Text, nullable=True)
    fix_suggestion: Mapped[str | None] = mapped_column(Text, nullable=True)
    code_example: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.8)

    report: Mapped["Report"] = relationship("Report", back_populates="issues")
