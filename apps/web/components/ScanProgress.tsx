"use client";

import { useEffect, useState } from "react";
import type { ScanStatus } from "@/lib/api";

interface ScanProgressProps {
  status: ScanStatus;
  url: string;
}

const PIPELINE_STEPS = [
  { id: "seo",       label: "SEO Analysis",          icon: "🔍", color: "#818cf8" },
  { id: "a11y",      label: "Accessibility Scan",     icon: "♿", color: "#60a5fa" },
  { id: "links",     label: "Broken Link Check",      icon: "🔗", color: "#34d399" },
  { id: "lh",        label: "Lighthouse Audit",       icon: "⚡", color: "#fbbf24" },
  { id: "ai",        label: "AI Reasoning",           icon: "🤖", color: "#a78bfa" },
];

const STEP_DURATION_MS = 12000;

export function ScanProgress({ status, url }: ScanProgressProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [dots, setDots] = useState(".");

  // Advance pipeline steps
  useEffect(() => {
    if (status !== "running") return;
    const t = setInterval(() => {
      setActiveStep(p => Math.min(p + 1, PIPELINE_STEPS.length - 1));
    }, STEP_DURATION_MS);
    return () => clearInterval(t);
  }, [status]);

  // Elapsed timer
  useEffect(() => {
    if (status !== "running" && status !== "queued") return;
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  // Animated dots
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(t);
  }, []);

  const progressPct = Math.round(((activeStep + (status === "running" ? 0.5 : 0)) / PIPELINE_STEPS.length) * 100);

  // ── Queued ────────────────────────────────────────────────────────
  if (status === "queued") {
    return (
      <div className="card anim-scale-in" style={{ padding: 40, textAlign: "center" }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.2))",
          border: "2px solid var(--border-brand)", margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
        </div>
        <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem", marginBottom: 8 }}>
          Queued for scanning{dots}
        </p>
        <p style={{ color: "var(--text-3)", fontSize: "0.875rem", wordBreak: "break-all" }}>{url}</p>
      </div>
    );
  }

  // ── Failed ─────────────────────────────────────────────────────────
  if (status === "failed") {
    return (
      <div className="card anim-scale-in" style={{
        padding: 40, textAlign: "center",
        border: "1px solid rgba(239,68,68,0.25)",
        background: "rgba(239,68,68,0.04)",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem", color: "#fca5a5", marginBottom: 8 }}>
          Scan Failed
        </p>
        <p style={{ color: "var(--text-3)", fontSize: "0.875rem" }}>
          The site may be unavailable, blocking crawlers, or an internal error occurred.
        </p>
      </div>
    );
  }

  // ── Running ─────────────────────────────────────────────────────────
  return (
    <div className="card anim-scale-in" style={{ padding: "clamp(24px, 4vw, 36px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.25rem", marginBottom: 4 }}>
            Scanning{dots}
          </p>
          <p style={{
            fontSize: "0.82rem", color: "var(--text-3)",
            wordBreak: "break-all", maxWidth: 400,
          }}>{url}</p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "2rem",
            background: "linear-gradient(135deg, var(--violet-light), var(--blue-light))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "-0.04em", lineHeight: 1,
          }}>
            {elapsed}s
          </div>
          <p style={{ fontSize: "0.72rem", color: "var(--text-3)", marginTop: 2 }}>elapsed</p>
        </div>
      </div>

      {/* Overall progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.78rem", color: "var(--text-3)" }}>
          <span>Pipeline progress</span>
          <span style={{ color: "var(--violet-light)", fontWeight: 600 }}>{progressPct}%</span>
        </div>
        <div className="progress-track" style={{ height: 6 }}>
          <div className="progress-fill" style={{
            width: `${progressPct}%`,
            background: "linear-gradient(90deg, var(--violet-dark), var(--violet), var(--blue))",
            boxShadow: "0 0 12px rgba(139,92,246,0.5)",
          }} />
        </div>
      </div>

      {/* Step list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {PIPELINE_STEPS.map((step, i) => {
          const isDone = i < activeStep;
          const isActive = i === activeStep;
          return (
            <div key={step.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
              borderRadius: "var(--r-md)",
              background: isActive ? "rgba(139,92,246,0.08)" : isDone ? "rgba(16,185,129,0.04)" : "transparent",
              border: isActive ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
              transition: "all 0.25s ease",
            }}>
              {/* Icon / status indicator */}
              <div style={{
                width: 36, height: 36, borderRadius: "var(--r-sm)", flexShrink: 0,
                background: isDone ? "rgba(16,185,129,0.12)" : isActive ? `${step.color}18` : "rgba(255,255,255,0.03)",
                border: `1px solid ${isDone ? "rgba(16,185,129,0.2)" : isActive ? `${step.color}33` : "var(--border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
                transition: "all 0.25s",
              }}>
                {isDone ? "✓" : step.icon}
              </div>

              {/* Label */}
              <span style={{
                flex: 1, fontSize: "0.9rem", fontWeight: isActive ? 600 : 400,
                color: isDone ? "var(--green-light)" : isActive ? "var(--text-1)" : "var(--text-3)",
                transition: "color 0.2s",
              }}>
                {step.label}
              </span>

              {/* Right indicator */}
              {isDone && (
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--green)", padding: "2px 8px", borderRadius: 99, background: "rgba(16,185,129,0.1)" }}>
                  Done
                </span>
              )}
              {isActive && <span className="spinner" />}
            </div>
          );
        })}
      </div>

      <p style={{
        textAlign: "center", marginTop: 20, padding: "10px 16px",
        background: "rgba(139,92,246,0.06)", borderRadius: "var(--r-md)",
        border: "1px solid rgba(139,92,246,0.12)",
        fontSize: "0.8rem", color: "var(--text-3)",
      }}>
        ⏱ Most scans complete in 45–90 seconds
      </p>
    </div>
  );
}
