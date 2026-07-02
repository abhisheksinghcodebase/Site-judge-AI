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
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const target = score;
          const start = performance.now();
          const dur = 1500; // slightly longer for premium feel
          const tick = (now: number) => {
            const t = Math.min((now - start) / dur, 1);
            setDisplay(Math.round(easeOutCubic(t) * target));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [score]);

  const color = getScoreColor(score);
  const labelText = getScoreLabel(score);

  // ── Large High-Tech Speedometer Gauge ──────────────────────────────
  if (size === "lg") {
    const R = 78;
    const circ = 2 * Math.PI * R;
    const fill = score != null ? (display / 100) * circ : 0;

    return (
      <div
        ref={ref}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          padding: 10,
        }}
      >
        {/* Ring Wrapper */}
        <div
          style={{
            position: "relative",
            width: 210,
            height: 210,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Ambient Outer Radial Glow */}
          <div
            style={{
              position: "absolute",
              width: 170,
              height: 170,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${color}28 0%, transparent 70%)`,
              filter: "blur(12px)",
              pointerEvents: "none",
            }}
          />

          {/* SVG Ring Construction */}
          <svg width={210} height={210} viewBox="0 0 200 200" style={{ transform: "rotate(-90deg)" }}>
            <defs>
              {/* Dynamic Gradient for Score Progress */}
              <linearGradient id={`scoreGrad-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color} />
                <stop offset="100%" stopColor={`${color}cc`} />
              </linearGradient>
              {/* Radial glow filter */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Inner Dashboard Rim */}
            <circle
              cx={100}
              cy={100}
              r={R - 8}
              fill="none"
              stroke="rgba(255, 255, 255, 0.02)"
              strokeWidth={1}
            />

            {/* Gauge Background Track */}
            <circle
              cx={100}
              cy={100}
              r={R}
              fill="none"
              stroke="rgba(255, 255, 255, 0.04)"
              strokeWidth={8}
            />

            {/* Glowing Accent Underlay (Subtle Neon Effect) */}
            <circle
              cx={100}
              cy={100}
              r={R}
              fill="none"
              stroke={color}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ - fill}
              style={{
                opacity: 0.3,
                filter: "url(#glow)",
                transition: "stroke-dashoffset 0.8s ease-out",
              }}
            />

            {/* Solid Foreground Progress Arc */}
            <circle
              cx={100}
              cy={100}
              r={R}
              fill="none"
              stroke={`url(#scoreGrad-${label})`}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ - fill}
              style={{
                transition: "stroke-dashoffset 0.8s ease-out",
              }}
            />

            {/* Glowing Indicator Dot at the Edge */}
            {score != null && (
              <circle
                cx={100 + R * Math.cos((fill / circ) * 2 * Math.PI - Math.PI / 2)}
                cy={100 + R * Math.sin((fill / circ) * 2 * Math.PI - Math.PI / 2)}
                r={6}
                fill="#ffffff"
                stroke={color}
                strokeWidth={3}
                style={{
                  filter: `drop-shadow(0 0 8px ${color})`,
                  transition: "cx 0.8s ease-out, cy 0.8s ease-out",
                }}
              />
            )}
          </svg>

          {/* Central Counter Display */}
          <div
            style={{
              position: "absolute",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                fontSize: "3.6rem",
                color: "#ffffff",
                lineHeight: 1,
                letterSpacing: "-0.04em",
                textShadow: `0 0 30px ${color}33`,
              }}
            >
              {score != null ? display : "—"}
            </span>
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginTop: 4,
              }}
            >
              Score
            </span>
          </div>
        </div>

        {/* Info Label Box */}
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.25rem",
              color: "var(--text-1)",
              marginBottom: 6,
              letterSpacing: "-0.01em",
            }}
          >
            {label}
          </p>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 14px",
              borderRadius: 99,
              background: `linear-gradient(135deg, ${color}15, ${color}08)`,
              color,
              border: `1.5px solid ${color}28`,
              fontSize: "0.78rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              boxShadow: `0 2px 10px ${color}05`,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: color,
                display: "inline-block",
                boxShadow: `0 0 6px ${color}`,
              }}
            />
            {labelText}
          </span>
        </div>
      </div>
    );
  }

  // ── Small Compact Glassmorphic Card ───────────────────────────────
  return (
    <div
      ref={ref}
      className="card"
      style={{
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: "rgba(255, 255, 255, 0.01)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--border)",
        borderLeft: `4px solid ${color}`,
        position: "relative",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Background ambient shade */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 80,
          height: "100%",
          background: `linear-gradient(90deg, ${color}06, transparent)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {icon && <span style={{ fontSize: 20, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}>{icon}</span>}
          <span
            style={{
              fontSize: "0.88rem",
              color: "var(--text-2)",
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            {label}
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "1.5rem",
            color,
            letterSpacing: "-0.02em",
            textShadow: `0 0 16px ${color}44`,
          }}
        >
          {score != null ? display : "—"}
        </span>
      </div>

      {/* Progress Track and Glowing Indicator */}
      <div style={{ position: "relative" }}>
        <div className="progress-track" style={{ height: 6, background: "rgba(255,255,255,0.04)" }}>
          <div
            className="progress-fill"
            style={{
              width: score != null ? `${display}%` : "0%",
              background: `linear-gradient(90deg, ${color}99, ${color})`,
              boxShadow: `0 0 10px ${color}33`,
            }}
          />
        </div>
        {/* Edge Indicator Dot */}
        {score != null && display > 0 && (
          <div
            style={{
              position: "absolute",
              top: 1,
              left: `calc(${display}% - 4px)`,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#ffffff",
              boxShadow: `0 0 6px 1px #ffffff, 0 0 10px ${color}`,
              transition: "left 0.8s ease-out",
            }}
          />
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: "0.72rem",
            color: "var(--text-3)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Status
        </span>
        <span
          style={{
            fontSize: "0.75rem",
            color,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.02em",
          }}
        >
          {labelText}
        </span>
      </div>
    </div>
  );
}
