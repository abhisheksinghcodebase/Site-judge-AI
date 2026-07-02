"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getScan, getReport,
  type Scan, type Report, type IssueSeverity, type IssueCategory,
  CATEGORY_LABELS, CATEGORY_ICONS, getScoreColor,
} from "@/lib/api";
import { ScoreCard } from "@/components/ScoreCard";
import { IssueCard } from "@/components/IssueCard";
import { ScanProgress } from "@/components/ScanProgress";

// Category config with icons
const CATEGORIES: { key: keyof Report["scores"]; label: string; icon: string }[] = [
  { key: "performance",    label: "Performance",    icon: "⚡" },
  { key: "accessibility",  label: "Accessibility",  icon: "♿" },
  { key: "seo",            label: "SEO",            icon: "🔍" },
  { key: "security",       label: "Security",       icon: "🔒" },
  { key: "best_practices", label: "Best Practices", icon: "✅" },
  { key: "ux",             label: "UX",             icon: "🎨" },
  { key: "responsiveness", label: "Responsiveness", icon: "📱" },
  { key: "code_quality",   label: "Code Quality",   icon: "💻" },
];

export default function ReportPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const router = useRouter();

  const [scan, setScan] = useState<Scan | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | "all">("all");
  const [screenshotTab, setScreenshotTab] = useState<"desktop" | "mobile">("desktop");

  // ── Poll ───────────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    try {
      const s = await getScan(scanId);
      setScan(s);
      if (s.status === "completed") {
        const r = await getReport(scanId);
        setReport(r);
      } else if (s.status === "failed") {
        setError(s.error_message || "Scan failed.");
      }
    } catch (e: any) { setError(e.message); }
  }, [scanId]);

  useEffect(() => {
    poll();
    const id = setInterval(() => {
      if (scan?.status === "completed" || scan?.status === "failed") return;
      poll();
    }, 3000);
    return () => clearInterval(id);
  }, [poll, scan?.status]);

  // ── Filter ─────────────────────────────────────────────────────────
  const filtered = report?.issues.filter(i => {
    if (severityFilter !== "all" && i.severity !== severityFilter) return false;
    if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
    return true;
  }) ?? [];

  const counts = {
    critical: report?.issues.filter(i => i.severity === "critical").length ?? 0,
    medium:   report?.issues.filter(i => i.severity === "medium").length ?? 0,
    minor:    report?.issues.filter(i => i.severity === "minor").length ?? 0,
  };

  // ── Not yet completed ──────────────────────────────────────────────
  if (!scan || (scan.status !== "completed" && scan.status !== "failed")) {
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: "var(--bg-base)" }}>
        {/* Nav */}
        <nav className="nav">
          <div className="container" style={{ display: "flex", alignItems: "center", height: "100%" }}>
            <button onClick={() => router.push("/")} style={{
              display: "flex", alignItems: "center", gap: 8, border: "none", cursor: "pointer",
              fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem",
              background: "linear-gradient(135deg, #c4b5fd, #818cf8)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              padding: 0,
            }}>
              ⚖️ SiteJudge AI
            </button>
          </div>
        </nav>
        <div style={{ maxWidth: 560, margin: "60px auto", padding: "0 24px" }}>
          <ScanProgress status={scan?.status ?? "queued"} url={scan?.url ?? "…"} />
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>❌</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, marginBottom: 12 }}>Scan Failed</h1>
          <p style={{ color: "var(--text-2)", marginBottom: 24 }}>{error}</p>
          <button className="btn btn-primary" onClick={() => router.push("/")}>Try another URL</button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const hostname = (() => { try { return new URL(scan.url).hostname; } catch { return scan.url; } })();

  return (
    <div className="bg-grid" style={{ minHeight: "100dvh", backgroundColor: "var(--bg-base)" }}>
      {/* Subtle glow */}
      <div className="orb" style={{ width: 600, height: 400, top: 0, left: "50%", transform: "translateX(-50%)", background: "radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%)" }} />

      {/* ══════════════════════════════════════════════════════════
          NAV
      ══════════════════════════════════════════════════════════ */}
      <nav className="nav" style={{ zIndex: 100 }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%" }}>
          <button onClick={() => router.push("/")} style={{
            display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer",
            fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem",
          }}>
            <span style={{ fontSize: 20 }}>⚖️</span>
            <span style={{
              background: "linear-gradient(135deg, #c4b5fd, #818cf8)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>SiteJudge AI</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              padding: "5px 14px", borderRadius: 99,
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
              fontSize: "0.8rem", color: "var(--text-2)",
              maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {hostname}
            </div>
            <button className="btn btn-primary" style={{ padding: "8px 18px", fontSize: "0.85rem" }} onClick={() => router.push("/")}>
              New scan
            </button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: "40px 24px 80px", position: "relative", zIndex: 1 }}>

        {/* ══════════════════════════════════════════════════════
            HERO CARD — Score + Summary
        ══════════════════════════════════════════════════════ */}
        <div className="card anim-fade-up" style={{
          padding: "clamp(24px, 4vw, 44px)", marginBottom: 24,
          background: "linear-gradient(145deg, rgba(17,17,32,0.98), rgba(12,12,20,0.95))",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.1)",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {/* Top row: score + meta */}
            <div style={{ display: "flex", gap: 36, flexWrap: "wrap", alignItems: "center" }}>
              {/* Radial score */}
              <div style={{ flexShrink: 0 }}>
                <ScoreCard score={report.overall_score} label="Overall Score" size="lg" />
              </div>

              {/* Meta */}
              <div style={{ flex: 1, minWidth: 240 }}>
                <h1 style={{
                  fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(1.2rem, 3vw, 1.7rem)",
                  marginBottom: 6, wordBreak: "break-all",
                }}>
                  {scan.url}
                </h1>
                <p style={{ color: "var(--text-3)", fontSize: "0.82rem", marginBottom: 20 }}>
                  Scanned {new Date(scan.completed_at!).toLocaleDateString("en-US", { dateStyle: "long" })}
                </p>

                {/* Executive summary */}
                {report.executive_summary && (
                  <p style={{
                    color: "var(--text-2)", fontSize: "0.925rem", lineHeight: 1.75,
                    padding: "14px 18px", borderRadius: "var(--r-md)",
                    background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)",
                    marginBottom: 20,
                  }}>
                    {report.executive_summary}
                  </p>
                )}

                {/* Issue count pills */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {counts.critical > 0 && (
                    <button onClick={() => setSeverityFilter(severityFilter === "critical" ? "all" : "critical")}
                      className="badge badge-critical" style={{ cursor: "pointer", padding: "5px 14px", fontSize: "0.8rem" }}>
                      🔴 {counts.critical} Critical
                    </button>
                  )}
                  {counts.medium > 0 && (
                    <button onClick={() => setSeverityFilter(severityFilter === "medium" ? "all" : "medium")}
                      className="badge badge-medium" style={{ cursor: "pointer", padding: "5px 14px", fontSize: "0.8rem" }}>
                      🟡 {counts.medium} Medium
                    </button>
                  )}
                  {counts.minor > 0 && (
                    <button onClick={() => setSeverityFilter(severityFilter === "minor" ? "all" : "minor")}
                      className="badge badge-minor" style={{ cursor: "pointer", padding: "5px 14px", fontSize: "0.8rem" }}>
                      ⚪ {counts.minor} Minor
                    </button>
                  )}
                  <span style={{
                    padding: "5px 14px", fontSize: "0.8rem", borderRadius: 99, fontWeight: 600,
                    background: "rgba(255,255,255,0.04)", color: "var(--text-3)", border: "1px solid var(--border)",
                  }}>
                    {report.issues.length} total
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            CATEGORY SCORES GRID
        ══════════════════════════════════════════════════════ */}
        <div className="anim-fade-up delay-1" style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", marginBottom: 14, color: "var(--text-2)" }}>
            Category Breakdown
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {CATEGORIES.filter(cat => report.scores[cat.key] !== null).map(({ key, label, icon }) => (
              <ScoreCard key={key} score={report.scores[key]} label={label} icon={icon} size="sm" />
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            SCREENSHOTS
        ══════════════════════════════════════════════════════ */}
        {(report.screenshot_desktop || report.screenshot_mobile) && (
          <div className="card anim-fade-up delay-2" style={{ padding: 20, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--text-2)" }}>
                Screenshots
              </h2>
              <div style={{ display: "flex", gap: 6 }}>
                {report.screenshot_desktop && (
                  <button id="tab-desktop" onClick={() => setScreenshotTab("desktop")}
                    className="btn btn-ghost"
                    style={{
                      padding: "6px 16px", fontSize: "0.82rem",
                      background: screenshotTab === "desktop" ? "rgba(139,92,246,0.15)" : undefined,
                      borderColor: screenshotTab === "desktop" ? "var(--border-brand)" : undefined,
                      color: screenshotTab === "desktop" ? "var(--violet-light)" : undefined,
                    }}>
                    🖥️ Desktop
                  </button>
                )}
                {report.screenshot_mobile && (
                  <button id="tab-mobile" onClick={() => setScreenshotTab("mobile")}
                    className="btn btn-ghost"
                    style={{
                      padding: "6px 16px", fontSize: "0.82rem",
                      background: screenshotTab === "mobile" ? "rgba(139,92,246,0.15)" : undefined,
                      borderColor: screenshotTab === "mobile" ? "var(--border-brand)" : undefined,
                      color: screenshotTab === "mobile" ? "var(--violet-light)" : undefined,
                    }}>
                    📱 Mobile
                  </button>
                )}
              </div>
            </div>

            <div style={{
              borderRadius: "var(--r-md)", overflow: "hidden",
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
            }}>
              {/* Browser chrome bar */}
              <div style={{
                height: 32, background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 6, padding: "0 12px",
              }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f87171" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fbbf24" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#34d399" }} />
                <div style={{
                  flex: 1, height: 18, borderRadius: 4, background: "rgba(255,255,255,0.04)",
                  margin: "0 12px", display: "flex", alignItems: "center", paddingLeft: 8,
                  fontSize: "0.7rem", color: "var(--text-3)",
                }}>
                  {scan.url}
                </div>
              </div>

              <img
                src={`data:image/webp;base64,${screenshotTab === "desktop" ? report.screenshot_desktop : report.screenshot_mobile}`}
                alt={`${screenshotTab} screenshot of ${scan.url}`}
                style={{ width: "100%", display: "block", maxHeight: 560, objectFit: "cover", objectPosition: "top" }}
              />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            ISSUES
        ══════════════════════════════════════════════════════ */}
        <div className="anim-fade-up delay-3">
          {/* Issues header + filters */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--text-2)" }}>
              Issues
              <span style={{
                marginLeft: 10, padding: "2px 10px", borderRadius: 99,
                background: "rgba(139,92,246,0.1)", color: "var(--violet-light)",
                border: "1px solid rgba(139,92,246,0.2)", fontSize: "0.8rem", fontWeight: 600,
              }}>
                {filtered.length}
              </span>
            </h2>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                id="severity-filter"
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value as any)}
                className="input"
                style={{ padding: "7px 32px 7px 12px", fontSize: "0.82rem", width: "auto", background: "var(--bg-elevated)" }}
              >
                <option value="all">All severities</option>
                <option value="critical">Critical</option>
                <option value="medium">Medium</option>
                <option value="minor">Minor</option>
              </select>

              <select
                id="category-filter"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as any)}
                className="input"
                style={{ padding: "7px 32px 7px 12px", fontSize: "0.82rem", width: "auto", background: "var(--bg-elevated)" }}
              >
                <option value="all">All categories</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              {(severityFilter !== "all" || categoryFilter !== "all") && (
                <button
                  className="btn btn-ghost"
                  style={{ padding: "7px 14px", fontSize: "0.82rem" }}
                  onClick={() => { setSeverityFilter("all"); setCategoryFilter("all"); }}
                >
                  Clear ×
                </button>
              )}
            </div>
          </div>

          {/* Issue list */}
          {filtered.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>
                No issues match this filter
              </p>
              <p style={{ color: "var(--text-3)", fontSize: "0.875rem" }}>Try a different severity or category.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((issue, i) => (
                <IssueCard key={issue.id} issue={issue} index={i} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
