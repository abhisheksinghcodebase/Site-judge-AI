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

const TERMINAL_DEMO_LINES = [
  { agent: "system", msg: "$ sitejudge --audit https://example.com", type: "log" },
  { agent: "system", msg: "Initializing audit pipeline...", type: "log" },
  { agent: "system", msg: "Pipeline: SEO → Accessibility → Links → Lighthouse → AI Judge", type: "log" },
  { agent: "seo",    msg: "▸ Starting SEO analysis...", type: "step_start" },
  { agent: "seo",    msg: "Fetching HTML from https://example.com...", type: "log" },
  { agent: "seo",    msg: "Parsed meta tags, headings, OG data, robots.txt, sitemap", type: "log" },
  { agent: "seo",    msg: "✓ SEO analysis complete — 4 issues found", type: "step_done" },
  { agent: "accessibility", msg: "▸ Starting accessibility scan (Axe-core)...", type: "step_start" },
  { agent: "accessibility", msg: "Launching headless browser for WCAG 2.1 AA audit...", type: "log" },
  { agent: "accessibility", msg: "✓ Accessibility scan complete — 7 issues", type: "step_done" },
  { agent: "broken_links", msg: "▸ Starting link integrity check...", type: "step_start" },
  { agent: "broken_links", msg: "Scanned 42 links concurrently", type: "log" },
  { agent: "broken_links", msg: "✓ Link check complete — 2/42 broken", type: "step_done" },
  { agent: "lighthouse", msg: "▸ Starting Lighthouse performance audit...", type: "step_start" },
  { agent: "lighthouse", msg: "Running Core Web Vitals measurement (LCP, FCP, TBT, CLS)...", type: "log" },
  { agent: "lighthouse", msg: "Lighthouse scores — Perf: 72, A11y: 85, BP: 92, SEO: 90", type: "log" },
  { agent: "lighthouse", msg: "✓ Lighthouse audit complete — Performance: 72", type: "step_done" },
  { agent: "judge",  msg: "▸ Starting AI reasoning engine...", type: "step_start" },
  { agent: "judge",  msg: "Connecting to Groq API (model: llama-3.3-70b-versatile)", type: "log" },
  { agent: "judge",  msg: "AI synthesis complete. Overall score: 68/100", type: "log" },
  { agent: "judge",  msg: "✓ AI report generated — Score: 68/100", type: "step_done" },
  { agent: "system", msg: "★ Audit pipeline finished. Report ready.", type: "complete" },
];

// PLANS removed for open-source model

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
  const [visibleDemoLines, setVisibleDemoLines] = useState(0);

  // Auto-advance the terminal demo lines
  useEffect(() => {
    if (visibleDemoLines >= TERMINAL_DEMO_LINES.length) {
      // Reset after a pause
      const resetTimer = setTimeout(() => setVisibleDemoLines(0), 4000);
      return () => clearTimeout(resetTimer);
    }
    const timer = setTimeout(
      () => setVisibleDemoLines((prev) => prev + 1),
      visibleDemoLines === 0 ? 1200 : 300 + Math.random() * 400,
    );
    return () => clearTimeout(timer);
  }, [visibleDemoLines]);

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
          LIVE TERMINAL DEMO PREVIEW
      ══════════════════════════════════════════════════════════ */}
      <section style={{ padding: "0 0 80px", position: "relative", zIndex: 1 }}>
        <div className="container" style={{ maxWidth: 780 }}>
          <div className="terminal anim-scale-in delay-4 terminal-demo">
            {/* Title bar */}
            <div className="terminal-titlebar">
              <div className="terminal-dot" style={{ background: "#f87171" }} />
              <div className="terminal-dot" style={{ background: "#fbbf24" }} />
              <div className="terminal-dot" style={{ background: "#34d399" }} />
              <span className="terminal-titlebar-text">
                sitejudge — live audit demo
              </span>
            </div>

            {/* Terminal body with auto-typed lines */}
            <div className="terminal-body" style={{ minHeight: 300, maxHeight: 360 }}>
              {TERMINAL_DEMO_LINES.slice(0, visibleDemoLines).map((line, i) => {
                const agentColorClass = `terminal-agent-${line.agent}`;
                const msgClass = `terminal-msg terminal-msg-${line.type}`;
                return (
                  <div key={i} className="terminal-line" style={{ animationDelay: `${i * 30}ms` }}>
                    <span className={`terminal-agent ${agentColorClass}`}>
                      [{line.agent}]
                    </span>
                    <span className={msgClass}>{line.msg}</span>
                  </div>
                );
              })}
              {visibleDemoLines < TERMINAL_DEMO_LINES.length && (
                <div className="terminal-line">
                  <span style={{ color: "#475569" }}>$</span>
                  <span className="terminal-cursor" />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="terminal-footer">
              <span>demo — no real scan in progress</span>
              <span style={{ color: "#a78bfa" }}>
                {visibleDemoLines >= TERMINAL_DEMO_LINES.length
                  ? "✓ complete"
                  : `${Math.round((visibleDemoLines / TERMINAL_DEMO_LINES.length) * 100)}% progress`}
              </span>
            </div>
          </div>

          <p style={{ textAlign: "center", marginTop: 16, fontSize: "0.78rem", color: "var(--text-3)" }}>
            This is what you&apos;ll see — real-time backend activity streamed to your screen
          </p>
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
