"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createScan } from "@/lib/api";

// ── Static data ────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
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

const PLANS = [
  {
    name: "Free",
    price: "$0",
    sub: "Forever free",
    features: ["3 scans / day", "All 6 audit categories", "AI explanations", "Priority issue list"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$12",
    sub: "per month",
    features: ["Unlimited scans", "PDF export", "GitHub integration", "Historical trends", "API access"],
    cta: "Get Pro",
    highlight: true,
  },
  {
    name: "Team",
    price: "$49",
    sub: "per month",
    features: ["Everything in Pro", "5 team seats", "CI/CD integration", "Shared dashboards", "Slack alerts", "Priority support"],
    cta: "Get Team",
    highlight: false,
  },
];

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
            <span style={{
              fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem",
              background: "linear-gradient(135deg, #c4b5fd, #818cf8)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>SiteJudge AI</span>
          </a>

          {/* Desktop nav links */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }} className="hidden sm:flex">
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

          {/* CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="btn btn-primary"
              style={{ padding: "9px 20px", fontSize: "0.85rem" }}
              onClick={() => document.getElementById("url-input")?.focus()}
            >
              Free audit →
            </button>
          </div>
        </div>
      </nav>

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
            fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
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
            Paste any URL. Our AI runs Lighthouse, Axe, SEO analysis, and broken-link 
            checking — then reasons over all evidence to give you one scored, prioritised report.
          </p>

          {/* ── URL Input ────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="anim-fade-up delay-3" style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{
              display: "flex", gap: 10, flexWrap: "wrap",
              background: "rgba(17,17,32,0.9)", border: "1.5px solid var(--border-strong)",
              borderRadius: "var(--r-xl)", padding: 8,
              boxShadow: "0 8px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.1)",
            }}>
              <input
                id="url-input"
                type="text"
                placeholder="https://yourwebsite.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                disabled={loading}
                style={{
                  flex: 1, minWidth: 200,
                  padding: "12px 18px", fontSize: "1rem",
                  background: "transparent", border: "none", outline: "none",
                  color: "var(--text-1)", fontFamily: "var(--font-sans)",
                }}
              />
              <button type="submit" className="btn btn-primary" disabled={loading || !url.trim()} id="scan-submit-btn">
                {loading ? <><span className="spinner" /> Scanning…</> : <>⚡ Audit now</>}
              </button>
            </div>

            {error && (
              <p style={{ marginTop: 12, color: "var(--red-light)", fontSize: "0.875rem" }}>{error}</p>
            )}
            <p style={{ marginTop: 12, color: "var(--text-3)", fontSize: "0.8rem" }}>
              Free · No signup · Results in ~60 seconds
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
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
      <section id="pricing" className="section" style={{ position: "relative", zIndex: 1 }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 className="heading-display" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", marginBottom: 14 }}>
              Simple, transparent pricing
            </h2>
            <p style={{ color: "var(--text-2)" }}>Start free. Upgrade when you need more.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, maxWidth: 900, margin: "0 auto" }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{ position: "relative" }}>
                {plan.highlight && (
                  <div style={{
                    position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                    background: "linear-gradient(135deg, var(--violet-dark), var(--violet))",
                    color: "#fff", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.7rem",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    padding: "4px 16px", borderRadius: 99, whiteSpace: "nowrap",
                    boxShadow: "0 4px 12px rgba(139,92,246,0.4)",
                  }}>Most popular</div>
                )}
                <div className="card" style={{
                  padding: "28px 24px", height: "100%",
                  border: plan.highlight ? "1.5px solid var(--border-brand)" : "1px solid var(--border)",
                  boxShadow: plan.highlight ? "var(--shadow-glow)" : "none",
                  display: "flex", flexDirection: "column", gap: 20,
                }}>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", marginBottom: 6 }}>{plan.name}</h3>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "2.4rem", letterSpacing: "-0.04em", color: plan.highlight ? "var(--violet-light)" : "var(--text-1)" }}>
                        {plan.price}
                      </span>
                      <span style={{ color: "var(--text-3)", fontSize: "0.85rem" }}>{plan.sub}</span>
                    </div>
                  </div>

                  <ul style={{ flex: 1, listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.875rem", color: "var(--text-2)" }}>
                        <span style={{ color: "var(--green)", fontWeight: 700, fontSize: "0.9rem" }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button className={`btn ${plan.highlight ? "btn-primary" : "btn-ghost"}`} style={{ width: "100%", padding: "12px" }}>
                    {plan.cta}
                  </button>
                </div>
              </div>
            ))}
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
              Ready to audit your site?
            </h2>
            <p style={{ color: "var(--text-2)", maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.7, position: "relative" }}>
              Join thousands of developers who use SiteJudge to ship with confidence.
            </p>
            <button
              className="btn btn-primary"
              style={{ fontSize: "1rem", padding: "14px 40px", position: "relative" }}
              onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => document.getElementById("url-input")?.focus(), 500); }}
            >
              ⚡ Audit your site — it's free
            </button>
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
            Powered by Lighthouse · Axe-core · Playwright · LangGraph · Groq
          </p>
        </div>
      </footer>

    </div>
  );
}
