/**
 * SiteJudge AI Mobile API Client
 * 
 * NOTE: When running on a physical Android or iOS device, 'localhost' will not resolve
 * to your development machine. Change this URL to your machine's local IP address
 * (e.g. "http://192.168.1.100:8000") so the phone can communicate with the backend.
 */
export const API_URL = "http://localhost:8000";

export interface Scan {
  id: string;
  url: string;
  status: "queued" | "running" | "completed" | "failed";
  error_message?: string;
}

export interface Issue {
  title: string;
  severity: "critical" | "medium" | "minor";
  category: string;
  description: string;
  impact: string;
  fix_suggestion: string;
  code_example: string | null;
  confidence: number;
}

export interface CategoryScores {
  performance: number | null;
  accessibility: number | null;
  seo: number | null;
  security: number | null;
  best_practices: number | null;
  ux: number | null;
  responsiveness: number | null;
  code_quality: number | null;
  efficiency: number | null;
  alignment: number | null;
}

export interface Report {
  id: string;
  scan_id: string;
  overall_score: number;
  executive_summary: string | null;
  scores: CategoryScores;
  issues: Issue[];
}

export async function createScan(url: string): Promise<Scan> {
  const response = await fetch(`${API_URL}/scans/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to start audit scan");
  }
  return response.json();
}

export async function getScanStatus(scanId: string): Promise<Scan> {
  const response = await fetch(`${API_URL}/scans/${scanId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch scan status");
  }
  return response.json();
}

export async function getReport(scanId: string): Promise<Report> {
  const response = await fetch(`${API_URL}/reports/${scanId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch scan report");
  }
  return response.json();
}
