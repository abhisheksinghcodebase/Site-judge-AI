"use client";

import { useState } from "react";
import type { Issue } from "@/lib/api";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/api";

interface IssueCardProps {
  issue: Issue;
  index: number;
}

const SEVERITY_CONFIG = {
  critical: {
    badge: "badge-critical",
    dot: "#f87171",
    bg: "rgba(239,68,68,0.06)",
    border: "rgba(239,68,68,0.2)",
    label: "Critical",
  },
  medium: {
    badge: "badge-medium",
    dot: "#fcd34d",
    bg: "rgba(245,158,11,0.06)",
    border: "rgba(245,158,11,0.2)",
    label: "Medium",
  },
  minor: {
    badge: "badge-minor",
    dot: "#94a3b8",
    bg: "rgba(148,163,184,0.04)",
    border: "rgba(148,163,184,0.12)",
    label: "Minor",
  },
};

export function IssueCard({ issue, index }: IssueCardProps) {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity] ?? SEVERITY_CONFIG.minor;

  return (
    <div
      className="anim-fade-up"
      style={{
        animationDelay: `${Math.min(index * 40, 400)}ms`,
        border: `1px solid ${open ? cfg.border : "var(--border)"}`,
        borderRadius: "var(--r-lg)",
        background: open ? cfg.bg : "var(--bg-elevated)",
        transition: "border-color 0.2s, background 0.2s",
        overflow: "hidden",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <button
        id={`issue-${issue.id}`}
        className="issue-header"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        {/* Severity dot */}
        <div style={{ marginTop: 3, flexShrink: 0 }}>
          <div style={{
            width: 9, height: 9, borderRadius: "50%",
            background: cfg.dot,
            boxShadow: `0 0 8px ${cfg.dot}`,
          }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badges row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 7 }}>
            <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
            <span className="badge badge-cat">
              {CATEGORY_ICONS[issue.category]} {CATEGORY_LABELS[issue.category] ?? issue.category}
            </span>
            {issue.confidence >= 0.9 && (
              <span className="badge" style={{
                background: "rgba(16,185,129,0.1)", color: "#6ee7b7",
                border: "1px solid rgba(16,185,129,0.2)",
              }}>
                {Math.round(issue.confidence * 100)}% confidence
              </span>
            )}
          </div>

          {/* Title */}
          <p style={{
            fontFamily: "var(--font-display)", fontWeight: 600,
            fontSize: "0.95rem", lineHeight: 1.4,
            color: "var(--text-1)", margin: 0,
          }}>
            {issue.title}
          </p>
        </div>

        {/* Chevron */}
        <div style={{
          width: 28, height: 28, borderRadius: "var(--r-sm)", flexShrink: 0,
          background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.7rem", color: "var(--text-3)",
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.2s, background 0.15s",
        }}>
          ▾
        </div>
      </button>

      {/* ── Expanded body ───────────────────────────────────────── */}
      {open && (
        <div className="issue-body anim-fade-in">

          {/* Description */}
          <p style={{
            color: "var(--text-2)", fontSize: "0.9rem",
            lineHeight: 1.75, margin: "16px 0",
          }}>
            {issue.description}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {/* Impact */}
            {issue.impact && (
              <div style={{
                padding: "14px 16px", borderRadius: "var(--r-md)",
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
              }}>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#fca5a5", marginBottom: 6 }}>
                  📊 Impact
                </p>
                <p style={{ fontSize: "0.865rem", color: "var(--text-2)", lineHeight: 1.65, margin: 0 }}>
                  {issue.impact}
                </p>
              </div>
            )}

            {/* Fix */}
            {issue.fix_suggestion && (
              <div style={{
                padding: "14px 16px", borderRadius: "var(--r-md)",
                background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)",
              }}>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6ee7b7", marginBottom: 6 }}>
                  🔧 Fix
                </p>
                <p style={{ fontSize: "0.865rem", color: "var(--text-2)", lineHeight: 1.65, margin: 0 }}>
                  {issue.fix_suggestion}
                </p>
              </div>
            )}
          </div>

          {/* Code example */}
          {issue.code_example && (
            <div style={{ marginTop: 14 }}>
              <p style={{
                fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                color: "var(--violet-light)", marginBottom: 8,
              }}>
                {"</>"}  Code example
              </p>
              <pre className="code-block">{issue.code_example}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
