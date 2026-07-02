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
    badgeBg: "rgba(239, 68, 68, 0.12)",
    badgeText: "#fca5a5",
    badgeBorder: "rgba(239, 68, 68, 0.2)",
    dot: "#f87171",
    bg: "rgba(239, 68, 68, 0.03)",
    border: "rgba(239, 68, 68, 0.15)",
    label: "Critical",
  },
  medium: {
    badgeBg: "rgba(245, 158, 11, 0.12)",
    badgeText: "#fcd34d",
    badgeBorder: "rgba(245, 158, 11, 0.2)",
    dot: "#fcd34d",
    bg: "rgba(245, 158, 11, 0.02)",
    border: "rgba(245, 158, 11, 0.15)",
    label: "Medium",
  },
  minor: {
    badgeBg: "rgba(148, 163, 184, 0.08)",
    badgeText: "#cbd5e1",
    badgeBorder: "rgba(148, 163, 184, 0.15)",
    dot: "#94a3b8",
    bg: "rgba(148, 163, 184, 0.01)",
    border: "rgba(148, 163, 184, 0.1)",
    label: "Minor",
  },
};

export function IssueCard({ issue, index }: IssueCardProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity] ?? SEVERITY_CONFIG.minor;

  const copyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent closing the accordion
    if (!issue.code_example) return;
    try {
      await navigator.clipboard.writeText(issue.code_example);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div
      className="anim-fade-up"
      style={{
        animationDelay: `${Math.min(index * 40, 400)}ms`,
        border: `1px solid ${open ? cfg.border : "var(--border)"}`,
        borderRadius: "var(--r-lg)",
        background: open ? cfg.bg : "var(--bg-elevated)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        boxShadow: open ? "0 4px 20px rgba(0,0,0,0.15)" : "var(--shadow-sm)",
      }}
    >
      {/* ── Header Trigger ── */}
      <button
        id={`issue-${issue.id}`}
        className="issue-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          width: "100%",
          background: "transparent",
          border: "none",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: 1, minWidth: 0 }}>
          {/* Severity indicator dot with surrounding pulse glow */}
          <div style={{ marginTop: 6, flexShrink: 0, position: "relative", width: 10, height: 10 }}>
            <div
              style={{
                position: "absolute",
                inset: -2,
                borderRadius: "50%",
                background: cfg.dot,
                opacity: 0.3,
                filter: "blur(2px)",
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: cfg.dot,
                position: "relative",
                zIndex: 1,
                boxShadow: `0 0 8px ${cfg.dot}`,
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Tag Badges row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {/* Severity badge */}
              <span
                style={{
                  background: cfg.badgeBg,
                  color: cfg.badgeText,
                  border: `1px solid ${cfg.badgeBorder}`,
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {cfg.label}
              </span>

              {/* Category tag */}
              <span
                style={{
                  background: "rgba(139, 92, 246, 0.08)",
                  color: "var(--violet-light)",
                  border: "1px solid rgba(139, 92, 246, 0.15)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                }}
              >
                {CATEGORY_ICONS[issue.category]} {CATEGORY_LABELS[issue.category] ?? issue.category}
              </span>

              {/* Confidence factor */}
              {issue.confidence >= 0.9 && (
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.06)",
                    color: "#6ee7b7",
                    border: "1px solid rgba(16, 185, 129, 0.15)",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                  }}
                >
                  {Math.round(issue.confidence * 100)}% Match
                </span>
              )}
            </div>

            {/* Title text */}
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "0.96rem",
                lineHeight: 1.45,
                color: "var(--text-1)",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              {issue.title}
            </h3>
          </div>
        </div>

        {/* Chevron Glass button */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            color: "var(--text-2)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            marginLeft: 16,
            flexShrink: 0,
          }}
        >
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 1L5 5L9 1" />
          </svg>
        </div>
      </button>

      {/* ── Expanded Content ── */}
      {open && (
        <div
          className="issue-body anim-fade-in"
          style={{
            padding: "0 20px 20px 20px",
            borderTop: "1px solid var(--border)",
            background: "rgba(0,0,0,0.1)",
          }}
        >
          {/* Main Description */}
          <p
            style={{
              color: "var(--text-2)",
              fontSize: "0.9rem",
              lineHeight: 1.75,
              margin: "18px 0",
            }}
          >
            {issue.description}
          </p>

          {/* Impact and Fix Modules */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {/* Impact Box */}
            {issue.impact && (
              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: "var(--r-md)",
                  background: "rgba(239, 68, 68, 0.02)",
                  border: "1px solid rgba(239, 68, 68, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Custom inline warning SVG */}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fca5a5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#fca5a5",
                    }}
                  >
                    User Impact
                  </span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>
                  {issue.impact}
                </p>
              </div>
            )}

            {/* Fix Box */}
            {issue.fix_suggestion && (
              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: "var(--r-md)",
                  background: "rgba(16, 185, 129, 0.02)",
                  border: "1px solid rgba(16, 185, 129, 0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Custom checkmark check SVG */}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6ee7b7"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#6ee7b7",
                    }}
                  >
                    Proposed Fix
                  </span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>
                  {issue.fix_suggestion}
                </p>
              </div>
            )}
          </div>

          {/* Code block suggestion */}
          {issue.code_example && (
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--violet-light)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--violet-light)",
                    }}
                  >
                    Fix Implementation Example
                  </span>
                </div>

                {/* Copy Code button */}
                <button
                  onClick={copyToClipboard}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: copied ? "rgba(16, 185, 129, 0.1)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${copied ? "rgba(16, 185, 129, 0.25)" : "var(--border)"}`,
                    color: copied ? "#6ee7b7" : "var(--text-2)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {copied ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy code
                    </>
                  )}
                </button>
              </div>

              <pre className="code-block" style={{ margin: 0 }}>
                {issue.code_example}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
