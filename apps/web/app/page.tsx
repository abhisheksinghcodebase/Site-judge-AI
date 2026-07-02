"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createScan } from "@/lib/api";

// ── Static data ────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Developer", href: "#developer" },
];

const FEATURES = [
  {
    icon: "⚡",
    color: "rgba(245,158,11,0.15)",
    label: "Performance",
    desc: "Core Web Vitals, LCP, FCP, TBT, CLS via Google Lighthouse 12",
  },
  {
    icon: "♿",
    color: "rgba(59,130,246,0.15)",
    label: "Accessibility",
    desc: "Full WCAG 2.1 AA audit via Axe-core — catches 57+ rule violations",
  },
  {
    icon: "🔍",
    color: "rgba(139,92,246,0.15)",
    label: "SEO",
    desc: "Title, meta, OG tags, canonical, sitemap, robots.txt, heading structure",
  },
  {
    icon: "🔗",
    color: "rgba(16,185,129,0.15)",
    label: "Broken Links",
    desc: "Scans up to 60 links concurrently — detects 4xx/5xx and timeouts",
  },
  {
    icon: "📱",
    color: "rgba(6,182,212,0.15)",
    label: "Responsiveness",
    desc: "Desktop + mobile Playwright screenshots + viewport meta validation",
  },
  {
    icon: "🤖",
    color: "rgba(168,85,247,0.15)",
    label: "AI Reasoning",
    desc: "Groq LLaMA 3.3 70B synthesises all evidence into prioritised insights",
  },
];

const STEPS = [
  { n: "01", title: "Paste your URL", desc: "Enter any live website address. No account required for a free scan." },
  { n: "02", title: "Audit runs automatically", desc: "Lighthouse, Axe, SEO crawl, and link checker run in parallel inside our agent pipeline." },
  { n: "03", title: "AI writes the report", desc: "LLaMA 3.3 synthesises all evidence into a scored, prioritised, actionable report." },
];

const SCORES_PREVIEW = [
  { label: "Performance",    score: 88, color: "#34d399" },
  { label: "Accessibility",  score: 64, color: "#f59e0b" },
  { label: "SEO",            score: 78, color: "#34d399" },
  { label: "Security",       score: 55, color: "#f97316" },
  { label: "Best Practices", score: 81, color: "#34d399" },
  { label: "Responsiveness", score: 73, color: "#84cc16" },
];

// PLANS removed for open-source model

// ── Helpers ─────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 90) return "#34d399";
  if (s >= 75) return "#84cc16";
  if (s >= 60) return "#f59e0b";
  if (s >= 40) return "#f97316";
  return "#f87171";
}

// ── Animated counter ────────────────────────────────────────────────────

function Counter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          setVal(Math.round(p ** 0.6 * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{val}</span>;
}

// ── Main Component ──────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statsImageError, setStatsImageError] = useState(false);
  const [streakImageError, setStreakImageError] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const scan = await createScan(trimmed);
      router.push(`/report/${scan.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to start scan. Check the URL and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="bg-grid noise" style={{ backgroundColor: "var(--bg-base)", minHeight: "100dvh" }}>

      {/* ── Glow orbs ───────────────────────────────────────────── */}
      <div className="orb orb-1" style={{ zIndex: 0 }} />
      <div className="orb orb-2" style={{ zIndex: 0 }} />
      <div className="orb orb-3" style={{ zIndex: 0 }} />

      {/* ══════════════════════════════════════════════════════════
          NAV
      ══════════════════════════════════════════════════════════ */}
      <nav className="nav" style={{ zIndex: 100 }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%" }}>
          {/* Logo */}
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/logo.svg" alt="SiteJudge AI Logo" style={{ width: 32, height: 32, borderRadius: 8, boxShadow: "0 4px 12px rgba(139,92,246,0.25)" }} />
            <span className="nav-logo-text">SiteJudge AI</span>
          </a>

          {/* Desktop nav links */}
          <div className="nav-desktop-links">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} style={{
                padding: "8px 16px", borderRadius: "var(--r-md)", fontSize: "0.875rem",
                color: "var(--text-2)", textDecoration: "none", transition: "color 0.15s, background 0.15s",
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--text-1)"; (e.target as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--text-2)"; (e.target as HTMLElement).style.background = "transparent"; }}
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA & Mobile Menu Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="btn btn-primary nav-desktop-cta"
              style={{ padding: "9px 20px", fontSize: "0.85rem" }}
              onClick={() => document.getElementById("url-input")?.focus()}
            >
              Free audit →
            </button>

            {/* Hamburger Button */}
            <button
              className="nav-hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-1)",
                fontSize: "1.6rem",
                cursor: "pointer",
                padding: 4,
                lineHeight: 1,
              }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {NAV_LINKS.map(l => (
              <a 
                key={l.label} 
                href={l.href} 
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--r-md)",
                  fontSize: "1rem",
                  fontWeight: 500,
                  color: "var(--text-2)",
                  textDecoration: "none",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                {l.label}
              </a>
            ))}
          </div>
          <button
            className="btn btn-primary"
            style={{ width: "100%", padding: "14px", fontSize: "0.95rem" }}
            onClick={() => {
              setMobileMenuOpen(false);
              document.getElementById("url-input")?.focus();
            }}
          >
            Free audit →
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}
      <section style={{ padding: "100px 0 60px", position: "relative", zIndex: 1 }}>
        <div className="container" style={{ textAlign: "center" }}>

          {/* Eyebrow */}
          <div className="anim-fade-up" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 18px", borderRadius: 99,
            background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)",
            marginBottom: 32,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} className="anim-pulse" />
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--violet-light)", letterSpacing: "0.03em" }}>
              AI-Powered Website Auditor
            </span>
          </div>

          {/* Headline */}
          <h1 className="heading-display anim-fade-up delay-1" style={{
            fontSize: "clamp(2.2rem, 7vw, 5.5rem)",
            marginBottom: 24,
            lineHeight: 1.05,
          }}>
            Is your website<br />
            <span className="gradient-text">production&nbsp;ready?</span>
          </h1>

          {/* Subheading */}
          <p className="anim-fade-up delay-2" style={{
            fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
            color: "var(--text-2)",
            maxWidth: 600, margin: "0 auto 48px",
            lineHeight: 1.7,
          }}>
            SiteJudge AI is a 100% free and open-source production-readiness auditor. 
            We run Lighthouse, Axe accessibility, SEO crawls, and static codebase analysis 
            to give you one scored, prioritized report.
          </p>

          {/* ── URL Input ────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="anim-fade-up delay-3" style={{ maxWidth: 680, margin: "0 auto" }}>
            <div className="hero-form-container">
              <input
                id="url-input"
                type="text"
                placeholder="https://yourwebsite.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                disabled={loading}
                className="hero-form-input"
              />
              <button type="submit" className="btn btn-primary hero-form-btn" disabled={loading || !url.trim()} id="scan-submit-btn">
                {loading ? (
                  <><span className="spinner" /> <span className="hero-form-btn-text">Scanning…</span></>
                ) : (
                  <>⚡<span className="hero-form-btn-text">&nbsp;Audit now</span></>
                )}
              </button>
            </div>

            {error && (
              <p style={{ marginTop: 12, color: "var(--red-light)", fontSize: "0.875rem" }}>{error}</p>
            )}
            <p style={{ marginTop: 12, color: "var(--text-3)", fontSize: "0.8rem" }}>
              Free &amp; Open Source · No signup · Results in ~60 seconds
            </p>
          </form>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SAMPLE REPORT PREVIEW
      ══════════════════════════════════════════════════════════ */}
      <section style={{ padding: "0 0 80px", position: "relative", zIndex: 1 }}>
        <div className="container">
          <div className="card anim-scale-in delay-4" style={{
            padding: "clamp(24px, 4vw, 40px)",
            background: "linear-gradient(145deg, rgba(17,17,32,0.95), rgba(12,12,20,0.9))",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.12)",
          }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {/* Overall ring */}
                <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                  <svg width={80} height={80} viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx={40} cy={40} r={32} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={7} />
                    <circle cx={40} cy={40} r={32} fill="none"
                      stroke="url(#rg)" strokeWidth={7} strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - 0.72)}`}
                      style={{ filter: "drop-shadow(0 0 8px rgba(139,92,246,0.6))" }}
                    />
                    <defs>
                      <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#60a5fa" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.4rem", color: "#a78bfa", lineHeight: 1 }}>72</span>
                    <span style={{ fontSize: "0.6rem", color: "var(--text-3)" }}>/100</span>
                  </div>
                </div>
                <div>
                  <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", marginBottom: 2 }}>example.com</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Sample report preview</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="badge badge-critical">3 Critical</span>
                <span className="badge badge-medium">8 Medium</span>
                <span className="badge badge-minor">14 Minor</span>
              </div>
            </div>

            {/* Score grid */}
            <div className="preview-score-grid">
              {SCORES_PREVIEW.map(({ label, score, color }) => (
                <div key={label} style={{
                  background: "rgba(255,255,255,0.025)", borderRadius: "var(--r-md)",
                  padding: "14px 16px", border: "1px solid var(--border)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-2)" }}>{label}</span>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", color }}>{score}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${score}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>

            <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.78rem", color: "var(--text-3)" }}>
              Sample data — your real report includes AI explanations, code fixes, and screenshots
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          STATS
      ══════════════════════════════════════════════════════════ */}
      <div className="divider" />
      <section style={{ padding: "56px 0", position: "relative", zIndex: 1 }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 32, textAlign: "center" }}>
            {[
              { n: 57, suffix: "+", label: "Audit checks" },
              { n: 8,  suffix: "",   label: "Score categories" },
              { n: 60, suffix: "s",  label: "Avg scan time" },
              { n: 100, suffix: "%", label: "Actionable issues" },
            ].map(({ n, suffix, label }) => (
              <div key={label}>
                <div className="stat-num"><Counter target={n} />{suffix}</div>
                <p style={{ color: "var(--text-3)", fontSize: "0.875rem", marginTop: 8 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="divider" />

      {/* ══════════════════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════════════════ */}
      <section id="features" className="section" style={{ position: "relative", zIndex: 1 }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 className="heading-display" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", marginBottom: 14 }}>
              Every check. <span className="gradient-text">One report.</span>
            </h2>
            <p style={{ color: "var(--text-2)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
              We run all the industry-standard tools in parallel and use AI to synthesise findings — not just list them.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {FEATURES.map((f, i) => (
              <div key={f.label} className="card card-hover anim-fade-up" style={{ padding: 24, animationDelay: `${i * 70}ms` }}>
                <div className="icon-box" style={{ background: f.color, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", marginBottom: 8 }}>{f.label}</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-2)", lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════ */}
      <section id="how" style={{ padding: "80px 0", position: "relative", zIndex: 1 }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 className="heading-display" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", marginBottom: 14 }}>
              How it works
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
            {STEPS.map((step, i) => (
              <div key={step.n} style={{ position: "relative", display: "flex", gap: 20 }}>
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div style={{
                    display: "none", // shown on larger breakpoints via CSS below
                    position: "absolute", top: 24, left: "100%", width: "100%", height: 1,
                    background: "linear-gradient(90deg, var(--border-brand), transparent)",
                  }} className="connector" />
                )}
                <div style={{
                  width: 44, height: 44, borderRadius: "var(--r-md)", flexShrink: 0,
                  background: "linear-gradient(135deg, var(--violet-dark), var(--violet))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.9rem",
                  boxShadow: "0 4px 16px rgba(139,92,246,0.35)",
                }}>
                  {step.n}
                </div>
                <div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", marginBottom: 6 }}>{step.title}</h3>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-2)", lineHeight: 1.65 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════════
          DEVELOPER / OPEN SOURCE SHOWCASE
      ══════════════════════════════════════════════════════════ */}
      <section id="developer" className="section" style={{ position: "relative", zIndex: 1 }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 16px", borderRadius: 99,
              background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
              marginBottom: 16,
            }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#34d399", letterSpacing: "0.03em" }}>
                100% Free &amp; Open Source
              </span>
            </div>
            <h2 className="heading-display" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", marginBottom: 14 }}>
              Meet the <span className="gradient-text">Developer</span>
            </h2>
            <p style={{ color: "var(--text-2)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
              SiteJudge AI is built for the community. Star the project on GitHub, explore the code, or connect with the creator!
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24,
            maxWidth: 960,
            margin: "0 auto",
          }}>
            {/* Developer profile card */}
            <div className="card" style={{
              padding: "32px 28px",
              background: "linear-gradient(145deg, rgba(20,20,35,0.9), rgba(10,10,20,0.8))",
              border: "1px solid var(--border)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 20,
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: "50%",
                    overflow: "hidden", border: "2px solid var(--violet-light)",
                    boxShadow: "0 0 16px rgba(139,92,246,0.3)",
                  }}>
                    <img src="https://github.com/abhisheksinghcodebase.png" alt="Abhishek Kumar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.25rem", color: "var(--text-1)", marginBottom: 4 }}>
                      Abhishek Kumar
                    </h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-3)" }}>
                      B.Tech CSE (AI) Student &amp; Open-Source Enthusiast
                    </p>
                  </div>
                </div>
                
                <p style={{ fontSize: "0.9rem", color: "var(--text-2)", lineHeight: 1.65 }}>
                  I am Abhishek Kumar, currently pursuing my B.Tech in CSE(AI) branch. I have a high interest in building open-source projects, contributing to public repositories, and developing full-stack AI-driven web systems.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="developer-buttons" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                <a href="https://github.com/abhisheksinghcodebase/Site-judge-AI" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", textDecoration: "none", fontSize: "0.85rem" }}>
                  ⭐ Star on GitHub
                </a>
                <a href="https://linkedin.com/in/abhisheksinghcode" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", textDecoration: "none", fontSize: "0.85rem", border: "1px solid var(--border)" }}>
                  💼 Connect on LinkedIn
                </a>
              </div>
            </div>

            {/* GitHub Stats Card */}
            <div className="card" style={{
              padding: "24px",
              background: "rgba(10,10,20,0.4)",
              border: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 16,
            }}>
              <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: "var(--text-2)", alignSelf: "flex-start", margin: 0 }}>
                GitHub Activity &amp; Stats
              </h4>
              
              {/* Profile widgets */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
                <a href="https://github.com/abhisheksinghcodebase" target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
                  {statsImageError ? (
                    <div style={{
                      padding: "16px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px dashed var(--border-strong)",
                      textAlign: "center",
                      fontSize: "0.85rem",
                      color: "var(--text-3)"
                    }}>
                      <span style={{ fontSize: "1.2rem", display: "block", marginBottom: 6 }}>📊</span>
                      GitHub stats temporarily unavailable.
                    </div>
                  ) : (
                    <img 
                      src="https://github-readme-stats.vercel.app/api?username=abhisheksinghcodebase&show_icons=true&theme=tokyonight&hide_border=true&bg_color=00000000" 
                      alt="Abhishek's GitHub Stats" 
                      onError={() => setStatsImageError(true)}
                      style={{ width: "100%", height: "auto", borderRadius: 8 }} 
                    />
                  )}
                </a>
                <a href="https://github.com/abhisheksinghcodebase" target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
                  {streakImageError ? (
                    <div style={{
                      padding: "16px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px dashed var(--border-strong)",
                      textAlign: "center",
                      fontSize: "0.85rem",
                      color: "var(--text-3)"
                    }}>
                      <span style={{ fontSize: "1.2rem", display: "block", marginBottom: 6 }}>🔥</span>
                      GitHub streak statistics temporarily offline.
                    </div>
                  ) : (
                    <img 
                      src="https://github-readme-streak-stats.herokuapp.com/?user=abhisheksinghcodebase&theme=tokyonight&hide_border=true&background=00000000" 
                      alt="Abhishek's GitHub Streak" 
                      onError={() => setStreakImageError(true)}
                      style={{ width: "100%", height: "auto", borderRadius: 8 }} 
                    />
                  )}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════════════════════ */}
      <section style={{ padding: "80px 0", position: "relative", zIndex: 1 }}>
        <div className="container">
          <div style={{
            borderRadius: "var(--r-2xl)", padding: "clamp(32px, 5vw, 64px)",
            background: "linear-gradient(135deg, rgba(109,40,217,0.25) 0%, rgba(59,130,246,0.15) 100%)",
            border: "1px solid rgba(139,92,246,0.25)",
            textAlign: "center",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", width: 500, height: 500, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)",
              top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              pointerEvents: "none",
            }} />
            <h2 className="heading-display" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", marginBottom: 16, position: "relative" }}>
              Join the Open Source Project
            </h2>
            <p style={{ color: "var(--text-2)", maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.7, position: "relative" }}>
              Help us build the most comprehensive open-source website auditor. Self-host it or run it free!
            </p>
            <a
              href="https://github.com/abhisheksinghcodebase/Site-judge-AI"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ fontSize: "1rem", padding: "14px 40px", position: "relative", textDecoration: "none", display: "inline-block" }}
            >
              ⭐ Star on GitHub — It's Free
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "32px 0", position: "relative", zIndex: 1 }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚖️</span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem", color: "var(--text-2)" }}>
              SiteJudge AI
            </span>
          </div>
          <p style={{ color: "var(--text-3)", fontSize: "0.8rem" }}>
            Developed by <a href="https://github.com/abhisheksinghcodebase" target="_blank" rel="noopener noreferrer" style={{ color: "var(--violet-light)", textDecoration: "none" }}>Abhishek Kumar</a> · Powered by Lighthouse · Axe · Playwright · LangGraph · Groq
          </p>
        </div>
      </footer>

    </div>
  );
}
