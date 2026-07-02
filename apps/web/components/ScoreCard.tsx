"use client";

import { useEffect, useRef, useState } from "react";
import { getScoreColor, getScoreLabel } from "@/lib/api";

interface ScoreCardProps {
  score: number | null | undefined;
  label: string;
  icon?: string;
  size?: "sm" | "lg";
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function ScoreCard({ score, label, icon, size = "sm" }: ScoreCardProps) {
  const [display, setDisplay] = useState(0);
  const animated = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || score == null) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true;
        const target = score;
        const start = performance.now();
        const dur = 1300;
        const tick = (now: number) => {
          const t = Math.min((now - start) / dur, 1);
          setDisplay(Math.round(easeOutCubic(t) * target));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [score]);

  const color = getScoreColor(score);
  const labelText = getScoreLabel(score);

  // ── Large radial gauge ────────────────────────────────────────────
  if (size === "lg") {
    const R = 76;
    const circ = 2 * Math.PI * R;
    const fill = score != null ? (display / 100) * circ : 0;

    return (
      <div ref={ref} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        {/* Ring */}
        <div style={{ position: "relative", width: 200, height: 200 }}>
          {/* Outer glow */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: `radial-gradient(circle at 50% 50%, ${color}22 0%, transparent 65%)`,
          }} />

          <svg width={200} height={200} viewBox="0 0 200 200" style={{ transform: "rotate(-90deg)" }}>
            {/* Track */}
            <circle cx={100} cy={100} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={11} />
            {/* Glow ring (blurred copy) */}
            <circle cx={100} cy={100} r={R} fill="none"
              stroke={color} strokeWidth={14} strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ - fill * 0.98}
              style={{ opacity: 0.25, filter: "blur(6px)", transition: "stroke-dashoffset 1.3s cubic-bezier(0.4,0,0.2,1)" }}
            />
            {/* Solid ring */}
            <circle cx={100} cy={100} r={R} fill="none"
              stroke={color} strokeWidth={11} strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ - fill}
              style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(0.4,0,0.2,1)" }}
            />
            {/* Dot at end */}
            {score != null && (
              <circle
                cx={100 + R * Math.cos((fill / circ) * 2 * Math.PI - Math.PI / 2)}
                cy={100 + R * Math.sin((fill / circ) * 2 * Math.PI - Math.PI / 2)}
                r={6} fill={color}
                style={{ filter: `drop-shadow(0 0 6px ${color})` }}
              />
            )}
          </svg>

          {/* Center label */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              fontFamily: "var(--font-display)", fontWeight: 900,
              fontSize: "3rem", color, lineHeight: 1,
              textShadow: `0 0 20px ${color}66`,
            }}>
              {score != null ? display : "—"}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: 2 }}>/100</span>
          </div>
        </div>

        {/* Label */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.15rem", marginBottom: 4 }}>
            {label}
          </p>
          <span style={{
            display: "inline-block", padding: "3px 12px", borderRadius: 99,
            background: `${color}18`, color, border: `1px solid ${color}33`,
            fontSize: "0.78rem", fontWeight: 600,
          }}>
            {labelText}
          </span>
        </div>
      </div>
    );
  }

  // ── Small card ────────────────────────────────────────────────────
  return (
    <div ref={ref} className="card" style={{
      padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 10,
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
          <span style={{ fontSize: "0.85rem", color: "var(--text-2)", fontWeight: 500 }}>{label}</span>
        </div>
        <span style={{
          fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: "1.35rem", color,
          textShadow: `0 0 12px ${color}55`,
        }}>
          {score != null ? display : "—"}
        </span>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{
          width: score != null ? `${display}%` : "0%",
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 8px ${color}55`,
        }} />
      </div>

      <span style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 500 }}>
        {labelText}
      </span>
    </div>
  );
}
