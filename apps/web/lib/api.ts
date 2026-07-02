/**
 * Typed API client for the SiteJudge FastAPI backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────────────────

export type ScanStatus = "queued" | "running" | "completed" | "failed";

export interface Scan {
  id: string;
  url: string;
  status: ScanStatus;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface CategoryScores {
  performance?: number | null;
  accessibility?: number | null;
  seo?: number | null;
  security?: number | null;
  best_practices?: number | null;
  ux?: number | null;
  responsiveness?: number | null;
  code_quality?: number | null;
  efficiency?: number | null;
  alignment?: number | null;
}

export type IssueSeverity = "critical" | "medium" | "minor";
export type IssueCategory =
  | "performance"
  | "accessibility"
  | "seo"
  | "security"
  | "best_practices"
  | "ux"
  | "responsiveness"
  | "broken_links"
  | "code_quality"
  | "efficiency"
  | "alignment";

export interface Issue {
  id: string;
  title: string;
  severity: IssueSeverity;
  category: IssueCategory;
  description: string;
  impact?: string;
  fix_suggestion?: string;
  code_example?: string;
  confidence: number;
}

export interface Report {
  id: string;
  scan_id: string;
  overall_score: number;
  executive_summary?: string;
  scores: CategoryScores;
  issues: Issue[];
  screenshot_desktop?: string;
  screenshot_mobile?: string;
  created_at: string;
}

// ── API functions ──────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function createScan(url: string): Promise<Scan> {
  return apiFetch<Scan>("/scans/", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function getScan(scanId: string): Promise<Scan> {
  return apiFetch<Scan>(`/scans/${scanId}`);
}

export async function listScans(): Promise<Scan[]> {
  return apiFetch<Scan[]>("/scans/");
}

export async function getReport(scanId: string): Promise<Report> {
  return apiFetch<Report>(`/reports/${scanId}`);
}

// ── Helpers ────────────────────────────────────────────────────────────

export function getScoreColor(score: number | null | undefined): string {
  if (score == null) return "var(--text-muted)";
  if (score >= 90) return "var(--accent-green)";
  if (score >= 75) return "#84cc16";
  if (score >= 60) return "var(--accent-yellow)";
  if (score >= 40) return "var(--accent-orange)";
  return "var(--accent-red)";
}

export function getScoreClass(score: number | null | undefined): string {
  if (score == null) return "";
  if (score >= 90) return "score-excellent";
  if (score >= 75) return "score-good";
  if (score >= 60) return "score-fair";
  if (score >= 40) return "score-poor";
  return "score-bad";
}

export function getScoreLabel(score: number | null | undefined): string {
  if (score == null) return "N/A";
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Work";
  return "Critical";
}

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  performance: "Performance",
  accessibility: "Accessibility",
  seo: "SEO",
  security: "Security",
  best_practices: "Best Practices",
  ux: "UX",
  responsiveness: "Responsiveness",
  broken_links: "Broken Links",
  code_quality: "Code Quality",
  efficiency: "Efficiency",
  alignment: "Alignment",
};

export const CATEGORY_ICONS: Record<string, string> = {
  performance: "⚡",
  accessibility: "♿",
  seo: "🔍",
  security: "🔒",
  best_practices: "✅",
  ux: "🎨",
  responsiveness: "📱",
  broken_links: "🔗",
  code_quality: "💻",
  efficiency: "⚡",
  alignment: "🎯",
};
