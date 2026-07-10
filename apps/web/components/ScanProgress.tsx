"use client";

import { useEffect, useState, useRef } from "react";
import type { ScanStatus } from "@/lib/api";
import { getProgressStreamUrl } from "@/lib/api";

interface ScanProgressProps {
  status: ScanStatus;
  url: string;
  scanId: string;
}

interface TerminalEvent {
  timestamp: number;
  event_type: string;
  agent: string;
  message: string;
  detail?: string;
  step_index?: number;
  total_steps: number;
}

const PIPELINE_STEPS = [
  { id: "seo",          label: "SEO Analysis",       icon: "🔍" },
  { id: "accessibility", label: "Accessibility Scan", icon: "♿" },
  { id: "broken_links", label: "Link Integrity",      icon: "🔗" },
  { id: "lighthouse",   label: "Lighthouse Audit",    icon: "⚡" },
  { id: "judge",        label: "AI Reasoning",        icon: "🤖" },
];

function formatTimestamp(ts: number, startTs: number): string {
  if (!ts || !startTs) return "00:00";
  const diff = Math.max(0, Math.floor(ts - startTs));
  const mins = Math.floor(diff / 60).toString().padStart(2, "0");
  const secs = (diff % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function buildAsciiBar(pct: number, width: number = 30): { filled: string; empty: string } {
  const filledLen = Math.round((pct / 100) * width);
  return {
    filled: "█".repeat(filledLen),
    empty: "░".repeat(width - filledLen),
  };
}

export function ScanProgress({ status, url, scanId }: ScanProgressProps) {
  const [lines, setLines] = useState<TerminalEvent[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [stepStates, setStepStates] = useState<Record<string, "pending" | "running" | "done">>({});
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const startTsRef = useRef<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to SSE progress stream
  useEffect(() => {
    if (!scanId || status === "completed" || status === "failed") return;

    const sseUrl = getProgressStreamUrl(scanId);
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: TerminalEvent = JSON.parse(event.data);

        if (data.event_type === "connected") return;

        // Track start time from first event
        if (data.timestamp && !startTsRef.current) {
          startTsRef.current = data.timestamp;
        }

        setLines((prev) => [...prev, data]);

        // Update step states
        if (data.event_type === "step_start" && data.agent) {
          setStepStates((prev) => ({ ...prev, [data.agent]: "running" }));
        } else if (data.event_type === "step_done" && data.agent) {
          setStepStates((prev) => ({ ...prev, [data.agent]: "done" }));
        }

        if (data.event_type === "complete") {
          setIsComplete(true);
          es.close();
        } else if (data.event_type === "error") {
          setHasError(true);
          es.close();
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      // SSE may error if scan hasn't started pushing events yet — that's OK
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [scanId, status]);

  // Elapsed timer
  useEffect(() => {
    if (status !== "running" && status !== "queued") return;
    if (isComplete) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status, isComplete]);

  // Auto-scroll terminal body
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [lines]);

  // Calculate progress percentage from steps
  const completedSteps = Object.values(stepStates).filter((s) => s === "done").length;
  const runningSteps = Object.values(stepStates).filter((s) => s === "running").length;
  const progressPct = Math.round(((completedSteps + runningSteps * 0.5) / PIPELINE_STEPS.length) * 100);

  const bar = buildAsciiBar(isComplete ? 100 : progressPct);

  // ── Queued state ────────────────────────────────────────────────
  if (status === "queued" && lines.length === 0) {
    return (
      <div className="terminal anim-scale-in">
        <div className="terminal-titlebar">
          <div className="terminal-dot" style={{ background: "#f87171" }} />
          <div className="terminal-dot" style={{ background: "#fbbf24" }} />
          <div className="terminal-dot" style={{ background: "#34d399" }} />
          <span className="terminal-titlebar-text">sitejudge — waiting for queue</span>
        </div>
        <div className="terminal-body" style={{ minHeight: 120 }}>
          <div className="terminal-line">
            <span className="terminal-agent terminal-agent-system">[system]</span>
            <span className="terminal-msg">$ sitejudge --audit {url}</span>
          </div>
          <div className="terminal-line">
            <span className="terminal-agent terminal-agent-system">[system]</span>
            <span className="terminal-msg" style={{ color: "#f59e0b" }}>
              Queued for scanning — waiting for available worker...
            </span>
          </div>
          <div className="terminal-line">
            <span style={{ color: "#475569" }}>$</span>
            <span className="terminal-cursor" />
          </div>
        </div>
        <div className="terminal-footer">
          <span>status: queued</span>
          <span>{elapsed}s elapsed</span>
        </div>
      </div>
    );
  }

  // ── Failed state ────────────────────────────────────────────────
  if (status === "failed" || (hasError && lines.length > 0)) {
    return (
      <div className="terminal anim-scale-in">
        <div className="terminal-titlebar">
          <div className="terminal-dot" style={{ background: "#f87171" }} />
          <div className="terminal-dot" style={{ background: "#fbbf24" }} />
          <div className="terminal-dot" style={{ background: "#34d399" }} />
          <span className="terminal-titlebar-text">sitejudge — error</span>
        </div>
        <div className="terminal-body" ref={bodyRef}>
          {lines.map((line, i) => (
            <div key={i} className="terminal-line">
              <span className="terminal-ts">
                {formatTimestamp(line.timestamp, startTsRef.current)}
              </span>
              <span className={`terminal-agent terminal-agent-${line.agent}`}>
                [{line.agent}]
              </span>
              <span className={`terminal-msg terminal-msg-${line.event_type}`}>
                {line.message}
              </span>
            </div>
          ))}
          <div className="terminal-line" style={{ marginTop: 8 }}>
            <span className="terminal-msg-error" style={{ fontFamily: "var(--font-mono)" }}>
              ✖ Scan failed. The site may be unavailable or blocking crawlers.
            </span>
          </div>
        </div>
        <div className="terminal-footer">
          <span style={{ color: "#f87171" }}>status: failed</span>
          <span>{elapsed}s elapsed</span>
        </div>
      </div>
    );
  }

  // ── Running state (main terminal view) ──────────────────────────
  return (
    <div className="terminal anim-scale-in">
      {/* Title bar */}
      <div className="terminal-titlebar">
        <div className="terminal-dot" style={{ background: "#f87171" }} />
        <div className="terminal-dot" style={{ background: "#fbbf24" }} />
        <div className="terminal-dot" style={{ background: "#34d399" }} />
        <span className="terminal-titlebar-text">
          sitejudge — {isComplete ? "complete" : "auditing"} — {url}
        </span>
      </div>

      {/* Terminal body with streamed logs */}
      <div className="terminal-body" ref={bodyRef}>
        {lines.map((line, i) => (
          <div key={i} className="terminal-line">
            <span className="terminal-ts">
              {formatTimestamp(line.timestamp, startTsRef.current)}
            </span>
            <span className={`terminal-agent terminal-agent-${line.agent}`}>
              [{line.agent}]
            </span>
            <span className={`terminal-msg terminal-msg-${line.event_type}`}>
              {line.event_type === "step_start" && "▸ "}
              {line.event_type === "step_done" && "✓ "}
              {line.event_type === "complete" && "★ "}
              {line.event_type === "error" && "✖ "}
              {line.message}
            </span>
          </div>
        ))}

        {/* Blinking cursor if not complete */}
        {!isComplete && (
          <div className="terminal-line" style={{ marginTop: 2 }}>
            <span style={{ color: "#475569" }}>$</span>
            <span className="terminal-cursor" />
          </div>
        )}
      </div>

      {/* ASCII Progress Bar */}
      <div style={{ padding: "0 20px", position: "relative", zIndex: 2 }}>
        <div className="terminal-progress-bar">
          <span style={{ color: "#64748b", fontSize: "0.72rem" }}>progress</span>
          <div className="terminal-progress-track">
            <span className="terminal-progress-fill">{bar.filled}</span>
            <span>{bar.empty}</span>
          </div>
          <span className="terminal-progress-pct">{isComplete ? 100 : progressPct}%</span>
        </div>

        {/* Step status indicators */}
        <div style={{ paddingBottom: 8 }}>
          {PIPELINE_STEPS.map((step) => {
            const state = stepStates[step.id] || "pending";
            return (
              <div key={step.id} className="terminal-step-row">
                <span className="terminal-step-icon">
                  {state === "done" ? "✓" : state === "running" ? "►" : "○"}
                </span>
                <span
                  className="terminal-step-label"
                  style={{
                    color:
                      state === "done"
                        ? "#34d399"
                        : state === "running"
                        ? "#a78bfa"
                        : "#475569",
                  }}
                >
                  {step.icon} {step.label}
                </span>
                <span
                  className="terminal-step-status"
                  style={{
                    color:
                      state === "done"
                        ? "#34d399"
                        : state === "running"
                        ? "#a78bfa"
                        : "#334155",
                  }}
                >
                  {state === "done" ? "DONE" : state === "running" ? "RUNNING" : "PENDING"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="terminal-footer">
        <span>
          {isComplete ? (
            <span style={{ color: "#34d399" }}>✓ Audit complete — loading report...</span>
          ) : (
            <span>
              pipeline: {completedSteps}/{PIPELINE_STEPS.length} agents complete
            </span>
          )}
        </span>
        <span>{elapsed}s elapsed</span>
      </div>
    </div>
  );
}
