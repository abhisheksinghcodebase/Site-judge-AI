# SiteJudge AI

> AI-powered website production-readiness auditor. Combines Lighthouse, Axe, SEO analysis, Playwright screenshots, and Gemini 2.5 Flash into one comprehensive report.

## Quick Start (Local)

### Prerequisites
- Docker Desktop (running)
- Node.js 20+ (for running the web app locally outside Docker)
- A Gemini API key — get one free at [aistudio.google.com](https://aistudio.google.com)

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 2. Start all services

```bash
docker compose up --build
```

This starts:
| Service | URL | Description |
|---|---|---|
| Frontend (Next.js) | http://localhost:3000 | Main web UI |
| API (FastAPI) | http://localhost:8000 | REST API + docs at /docs |
| Lighthouse Worker | http://localhost:3001 | Node.js audit service |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Celery queue |

### 3. Run a scan

Open http://localhost:3000, paste any URL, click **Audit Site**.

## Development (without Docker)

### Backend

```bash
cd apps/api
pip install -r requirements.txt
playwright install chromium
uvicorn app.main:app --reload --port 8000
```

Start Celery worker (in a separate terminal):
```bash
cd apps/api
celery -A app.workers.celery_app worker --loglevel=info
```

### Lighthouse Worker

```bash
cd workers/lighthouse
npm install
node index.js
```

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

## Architecture

```
Frontend (Next.js 15)
       │
FastAPI Backend ──── Celery ──── Redis
       │
   LangGraph
  ┌────┴────┐
SEO    Axe   Links  Lighthouse Worker (Node.js)
  └────┬────┘
  Gemini 2.5 Flash (Judge)
       │
  PostgreSQL
```

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Framer Motion |
| Backend | FastAPI, Python 3.12, SQLAlchemy, Alembic |
| AI | LangGraph, Gemini 2.5 Flash |
| Auditing | Lighthouse 12, Axe-core 4.9, Playwright |
| Queue | Celery + Redis |
| Database | PostgreSQL 16 |

## API Reference

| Endpoint | Description |
|---|---|
| `POST /scans/` | Submit URL for scanning, returns `scan_id` |
| `GET /scans/{id}` | Poll scan status |
| `GET /reports/{scan_id}` | Get completed report |
| `GET /health` | Health check |

Swagger UI: http://localhost:8000/docs
