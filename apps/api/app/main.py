"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.api import scans, reports, progress, pdf_report


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup (Alembic handles migrations in prod)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="SiteJudge AI API",
    description="AI-powered website production-readiness auditor",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────
app.include_router(scans.router)
app.include_router(reports.router)
app.include_router(progress.router)
app.include_router(pdf_report.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "sitejudge-api"}
