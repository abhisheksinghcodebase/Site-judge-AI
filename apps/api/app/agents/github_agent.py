"""
GitHub Agent — Clones/downloads GitHub repositories and reviews source code
using Groq (llama-3.3-70b-versatile). Evaluates code quality, React/Next.js
architecture, responsive styling, accessibility, and security practices.
"""

import os
import re
import shutil
import zipfile
import json
from typing import Any
from urllib.parse import urlparse

import httpx
from groq import AsyncGroq

from app.core.config import settings

# Key file extensions to analyze
CODE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".py", ".html", ".css"}

# Folder exclusion list to keep scan fast and lightweight
EXCLUDE_DIRS = {
    "node_modules",
    ".next",
    ".git",
    "dist",
    "build",
    ".venv",
    "venv",
    "env",
    "__pycache__",
    "public",
    "assets",
    "cypress",
    "tests",
    "coverage",
}


def parse_github_url(url: str) -> tuple[str, str] | None:
    """Extract (owner, repo) from a GitHub URL."""
    # Strip trailing .git and slashes
    clean_url = url.rstrip("/").replace(".git", "")
    parsed = urlparse(clean_url)
    path_parts = [p for p in parsed.path.split("/") if p]

    if len(path_parts) >= 2:
        return path_parts[0], path_parts[1]
    return None


async def download_repo_zip(owner: str, repo: str, dest_zip: str) -> bool:
    """Download the repository zipball from GitHub API."""
    url = f"https://api.github.com/repos/{owner}/{repo}/zipball"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "SiteJudge-Bot/1.0",
    }
    if settings.github_token:
        headers["Authorization"] = f"token {settings.github_token}"

    print(f"[github-agent] Downloading zipball from {url}...")
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        try:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                os.makedirs(os.path.dirname(dest_zip), exist_ok=True)
                with open(dest_zip, "wb") as f:
                    f.write(response.content)
                print(f"[github-agent] Zipball downloaded to {dest_zip}")
                return True
            else:
                print(f"[github-agent] GitHub API failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"[github-agent] Download error: {e}")
            return False


def extract_repo_zip(zip_path: str, extract_dir: str) -> str | None:
    """Extract zipball and return the path of the extracted root directory."""
    print(f"[github-agent] Extracting zipball to {extract_dir}...")
    try:
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(extract_dir)

        # GitHub zipballs pack everything inside a root folder named like 'owner-repo-commit'
        subdirs = [os.path.join(extract_dir, d) for d in os.listdir(extract_dir) if os.path.isdir(os.path.join(extract_dir, d))]
        if subdirs:
            return subdirs[0]  # Return the actual root folder containing the code
        return extract_dir
    except Exception as e:
        print(f"[github-agent] Extraction failed: {e}")
        return None


def collect_repo_sources(root_dir: str, max_files: int = 5, max_chars_per_file: int = 1500) -> dict:
    """Traverse directory and collect structure + contents of key source files."""
    structure = []
    sources = {}

    # Prioritized file names we always want to read if they exist
    critical_filenames = {
        "package.json",
        "requirements.txt",
        "next.config.js",
        "next.config.ts",
        "tailwind.config.js",
        "tailwind.config.ts",
        "tsconfig.json",
    }

    files_read = 0

    for root, dirs, files in os.walk(root_dir):
        # Exclude directories in-place to avoid traversing them
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        for file in files:
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, root_dir)
            structure.append(rel_path)

            ext = os.path.splitext(file)[1].lower()
            is_critical = file in critical_filenames
            is_code = ext in CODE_EXTENSIONS

            # Skip common non-source config files to save tokens
            if file in {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "pnpm-workspace.yaml"}:
                continue

            if (is_critical or is_code) and files_read < max_files:
                try:
                    # Skip files that are too large (likely lockfiles or generated assets)
                    if os.path.getsize(file_path) > 50 * 1024 and not is_critical:
                        continue

                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read(max_chars_per_file)
                        if len(content) >= max_chars_per_file:
                            content += "\n... [content truncated]"
                        
                        # Minimize package.json down to just dependencies to save huge amount of tokens
                        if file == "package.json":
                            try:
                                import json as json_lib
                                data = json_lib.loads(content)
                                content = json_lib.dumps({
                                    "dependencies": data.get("dependencies", {}),
                                    "devDependencies": data.get("devDependencies", {})
                                }, indent=2)
                            except Exception:
                                pass

                        sources[rel_path] = content
                    files_read += 1
                except Exception as ex:
                    print(f"[github-agent] Skip reading {rel_path}: {ex}")

    return {
        "structure": structure[:40],  # limit file structure output to keep it compact
        "sources": sources,
    }


# ── AI Code Review Prompt ──────────────────────────────────────────────

GITHUB_SYSTEM_PROMPT = """You are SiteJudge AI, an expert static analyzer and code reviewer.
You are given the file structure and contents of key source files from a GitHub repository.
Your task is to analyze the codebase for production readiness, code quality, database design, backend services, responsive styling, accessibility, and security practices.

EVALUATION PARAMETERS:
- **Performance**: Review import sizes, duplicate code, inefficient React rendering, Next.js Image component optimization.
- **Accessibility (a11y)**: Check for missing aria-labels on inputs/buttons, interactive divs without tabIndex, missing form labels.
- **SEO**: Check layout headers, OpenGraph setup, meta tag structure in React components.
- **Security**: Scan for hardcoded API keys/secrets, raw innerHTML usage, insecure cookies, weak JWT verification, missing rate limiting.
- **Responsiveness**: Check CSS styles/Tailwind classes. Scan for hardcoded widths, lack of responsive breakpoint prefixes, missing flexbox wrapping.
- **Database Design**: Detect SQL injections (raw query string interpolation), unindexed foreign keys, lack of connection pooling, missing transaction blocks, unencrypted passwords.
- **Backend Services**: Scan server frameworks (FastAPI, Express, Django). Check for CORS wildcard (*) in production, missing health check endpoints, unhandled async exceptions, missing database retry mechanisms, lack of structured logging.
- **Best Practices / Code Quality**: Next.js App Router layout rules, folder structure, modularity.

CRITICAL RULE: Return ONLY a valid JSON object matching the schema below. Do not output markdown fences or conversational text.
"""

GITHUB_PROMPT_TEMPLATE = """
Perform an audit on the codebase of repository: {owner}/{repo}.

=== FILE STRUCTURE ===
{structure}

=== CODE SAMPLES ===
{sources}

Analyze the files and output a JSON object matching this schema exactly:
{{
  "overall_score": <integer 0-100>,
  "executive_summary": "<3 sentence summary of code quality, major structural vulnerabilities, and top recommendation>",
  "scores": {{
    "performance": <integer 0-100>,
    "accessibility": <integer 0-100>,
    "seo": <integer 0-100>,
    "security": <integer 0-100>,
    "best_practices": <integer 0-100>,
    "ux": <integer 0-100>,
    "responsiveness": <integer 0-100>,
    "code_quality": <integer 0-100>
  }},
  "issues": [
    {{
      "title": "<concise issue title>",
      "severity": "<critical|medium|minor>",
      "category": "<performance|accessibility|seo|security|best_practices|ux|responsiveness|code_quality>",
      "description": "<plain English code review explaining the flaw>",
      "impact": "<specific code execution, bundling, or user impact>",
      "fix_suggestion": "<detailed code fix recommendation>",
      "code_example": "<code snippet showing the corrected code block, or null>",
      "confidence": <float 0.0-1.0>
    }}
  ]
}}

Ensure every issue lists a concrete file path or component name in the description (e.g. "In components/Button.tsx...").
Return ONLY the JSON.
"""


async def run_github_agent(repo_url: str, scan_id: str) -> dict:
    """
    Downloads the repository, analyzes its files, calls Groq for code review,
    and returns a structured report dict.
    """
    results = {
        "overall_score": 0,
        "executive_summary": "Failed to analyze GitHub repository.",
        "scores": {
            "performance": None,
            "accessibility": None,
            "seo": None,
            "security": None,
            "best_practices": None,
            "ux": None,
            "responsiveness": None,
            "code_quality": None,
        },
        "issues": [],
    }

    # 1. Parse URL
    owner_repo = parse_github_url(repo_url)
    if not owner_repo:
        results["executive_summary"] = f"Invalid GitHub URL: {repo_url}"
        return results

    owner, repo = owner_repo

    # 2. Setup temp directory
    temp_dir = os.path.join(os.getcwd(), "temp_repos", scan_id)
    zip_path = os.path.join(temp_dir, "repo.zip")
    extract_path = os.path.join(temp_dir, "extracted")

    try:
        # 3. Download
        download_success = await download_repo_zip(owner, repo, zip_path)
        if not download_success:
            results["executive_summary"] = f"Failed to download repository zip from GitHub API. Please check if the repository is public or if GITHUB_TOKEN is correct."
            return results

        # 4. Extract
        root_dir = extract_repo_zip(zip_path, extract_path)
        if not root_dir:
            results["executive_summary"] = "Failed to extract repository archive."
            return results

        # 5. Parse files
        payload = collect_repo_sources(root_dir)

        # 6. Call Groq
        client = AsyncGroq(api_key=settings.groq_api_key)

        prompt = GITHUB_PROMPT_TEMPLATE.format(
            owner=owner,
            repo=repo,
            structure=json.dumps(payload["structure"], indent=2),
            sources=json.dumps(payload["sources"], indent=2),
        )

        print(f"[github-agent] Sending {len(payload['sources'])} files to Groq for analysis...")
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": GITHUB_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=4096,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content.strip()

        # Clean markdown code block fences if returned
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        ai_results = json.loads(raw)
        return ai_results

    except Exception as e:
        print(f"[github-agent] Error during repository scan: {e}")
        results["executive_summary"] = f"Code analysis failed due to error: {e}"
        return results

    finally:
        # 7. Cleanup temp files to save disk space
        if os.path.exists(temp_dir):
            print(f"[github-agent] Cleaning up temp directory {temp_dir}...")
            shutil.rmtree(temp_dir, ignore_errors=True)
