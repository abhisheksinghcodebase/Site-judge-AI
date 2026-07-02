# SiteJudge AI

> **SiteJudge AI** is an advanced website production-readiness auditor and repository static code analyzer. Paste a deployed website URL to run Lighthouse, Axe accessibility, SEO crawling, and link checks — or paste a GitHub repository link to scan React/Next.js component quality, SQL database schemas, security vulnerabilities, and backend services. Powered by **LangGraph** and **Groq LLaMA 3.3**.

---

## Key Features

- 🌐 **Dual Scanning Modes**:
  - **URL Scan**: Audits deployed websites (Performance, SEO, Axe-core Accessibility, Broken Link check, responsive desktop/mobile screenshots).
  - **GitHub Repo Scan**: Runs static analysis on un-deployed codebases (packages, Next.js architecture, Tailwind responsiveness, ARIA tag validation, raw SQL injection checks, API CORS rules).
- 🤖 **Multi-Agent Orchestration**: Wires specialized collectors (Lighthouse, Axe, Link Crawler) through a LangGraph StateGraph, synthesized by LLaMA 3.3.
- 💻 **Zero-Friction Local Testing**: Supports SQLite (`sqlite+aiosqlite`) and FastAPI `BackgroundTasks` out-of-the-box. **No Redis or PostgreSQL installation required** to test locally.
- 🎨 **Premium UI Dashboard**: Built with Next.js 15, featuring glassmorphism, neon radial speedometers, custom SVG status marks, and interactive "Copy code" blocks for suggested fixes.

---

## Quick Start (Local Setup)

### Prerequisites
- Node.js 20+ (for worker & frontend)
- Python 3.11+ (for backend)
- A Groq API Key — get one free at [console.groq.com](https://console.groq.com/keys)
- A GitHub Personal Access Token (PAT) — get one at [github.com/settings/tokens](https://github.com/settings/tokens) (optional, to scan private repositories)

### 1. Configure Environment Variables
Copy the template and fill in your keys:
```bash
cp .env.example .env
# Edit .env and paste your GROQ_API_KEY and GITHUB_TOKEN
```

### 2. Start the Lighthouse Worker (Node.js)
The worker captures Playwright screenshots and compiles Lighthouse reports:
```bash
cd workers/lighthouse
npm install
node index.js
```
*Starts on port `3001`.*

### 3. Start the FastAPI Backend (Python)
The backend runs the LangGraph workflows and SQLite database:
```bash
cd apps/api
# Create virtual env
python -m venv .venv
# Activate virtual env (Windows)
.venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt
# Run the FastAPI server
uvicorn app.main:app --reload --port 8000
```
*Starts on port `8000`. Auto-creates the SQLite database file (`sitejudge.db`) and tables on launch.*

### 4. Start the Next.js Frontend (Next.js 15)
The interactive dashboard:
```bash
cd apps/web
npm install
npm run dev
```
*Open [http://localhost:3000](http://localhost:3000) in your browser.*

---

## Architecture

```
                       User Request (URL or GitHub Link)
                                      │
                              Frontend (Next.js 15)
                                      │
                               FastAPI Backend
                                      │
                ┌─────────────────────┴─────────────────────┐
         [GitHub Repo Link]                            [Web URL]
                │                                           │
         GitHub Crawler                                 LangGraph
                │                               ┌───────────┼───────────┐
         LLaMA 3.3 Audit                     SEO Agent  Axe-core  Link Check
                │                               │           │           │
                │                               └───────────┼───────────┘
                │                                     Lighthouse Worker
                │                                           │
                └─────────────────────┬─────────────────────┘
                                  Judge Node
                            (Groq LLaMA 3.3 70B)
                                      │
                       SQLite / PostgreSQL DB (Report)
```

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion |
| **Backend** | FastAPI, Python 3.11/3.12, SQLAlchemy, Uvicorn, LangGraph |
| **Auditing & Crawling** | Lighthouse 12, Axe-core, Playwright Chromium, BeautifulSoup4 |
| **AI Processing** | Groq LLaMA 3.3 (70B model, structured JSON mode) |
| **Database** | SQLite (Local fallbacks) / PostgreSQL (Production Docker) |
| **Queue** | FastAPI BackgroundTasks / Celery + Redis |

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/scans/` | `POST` | Submit URL or GitHub repo link for auditing. Returns `scan_id`. |
| `/scans/{id}` | `GET` | Poll scan status (`queued`, `running`, `completed`, `failed`). |
| `/reports/{scan_id}` | `GET` | Retrieve the completed audit report with scores and issues. |
| `/health` | `GET` | Health check diagnostics. |

---

## Developer Profiles

Created with ⚖️ by **Abhishek Singh**:

- **GitHub**: [@abhisheksinghcodebase](https://github.com/abhisheksinghcodebase)
- **LinkedIn**: [Abhishek Singh](https://linkedin.com/in/abhisheksinghcode)

Feel free to open an issue or submit a pull request!
