/**
 * Lighthouse + Playwright runner
 * Runs a Lighthouse audit and captures desktop + mobile screenshots
 * for a given URL.
 */

import { chromium } from "playwright";
import lighthouse from "lighthouse";

/**
 * Run a full audit for a URL.
 * @param {string} url - The URL to audit
 * @returns {Promise<object>} Structured audit result
 */
export async function runAudit(url) {
  // ── Desktop audit + screenshot ──────────────────────────────────────
  const desktopBrowser = await chromium.launch({
    args: [
      "--remote-debugging-port=9222",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    headless: true,
  });

  const desktopContext = await desktopBrowser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const desktopPage = await desktopContext.newPage();

  let desktopScreenshot = null;
  try {
    await desktopPage.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const screenshotBuffer = await desktopPage.screenshot({
      fullPage: false,
      type: "webp",
    });
    desktopScreenshot = screenshotBuffer.toString("base64");
  } catch (err) {
    console.warn("[runner] Desktop screenshot failed:", err.message);
  }

  // ── Run Lighthouse (reuse desktop browser port) ──────────────────────
  let lighthouseResult = null;
  try {
    const { lhr } = await lighthouse(url, {
      port: 9222,
      output: "json",
      logLevel: "error",
      formFactor: "desktop",
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
      },
      screenEmulation: {
        mobile: false,
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        disabled: false,
      },
    });
    lighthouseResult = extractLighthouseData(lhr);
  } catch (err) {
    console.warn("[runner] Lighthouse audit failed:", err.message);
  }

  await desktopBrowser.close();

  // ── Mobile screenshot ───────────────────────────────────────────────
  const mobileBrowser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    headless: true,
  });

  const mobileContext = await mobileBrowser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  });
  const mobilePage = await mobileContext.newPage();

  let mobileScreenshot = null;
  try {
    await mobilePage.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const screenshotBuffer = await mobilePage.screenshot({
      fullPage: false,
      type: "webp",
    });
    mobileScreenshot = screenshotBuffer.toString("base64");
  } catch (err) {
    console.warn("[runner] Mobile screenshot failed:", err.message);
  }

  await mobileBrowser.close();

  return {
    lighthouse: lighthouseResult,
    screenshots: {
      desktop: desktopScreenshot,
      mobile: mobileScreenshot,
    },
  };
}

/**
 * Extract only the structured data we need from the raw Lighthouse LHR.
 */
function extractLighthouseData(lhr) {
  const categories = lhr.categories || {};
  const audits = lhr.audits || {};

  const score = (cat) =>
    categories[cat] ? Math.round((categories[cat].score || 0) * 100) : null;

  // Extract top failing audits per category
  const failingAudits = Object.values(audits)
    .filter((a) => a.score !== null && a.score < 0.9 && a.score !== undefined)
    .map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      score: a.score,
      displayValue: a.displayValue || null,
      details: a.details ? summariseDetails(a.details) : null,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 30);

  return {
    scores: {
      performance: score("performance"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
      seo: score("seo"),
    },
    metrics: {
      firstContentfulPaint: audits["first-contentful-paint"]?.displayValue,
      largestContentfulPaint: audits["largest-contentful-paint"]?.displayValue,
      totalBlockingTime: audits["total-blocking-time"]?.displayValue,
      cumulativeLayoutShift: audits["cumulative-layout-shift"]?.displayValue,
      speedIndex: audits["speed-index"]?.displayValue,
      timeToInteractive: audits["interactive"]?.displayValue,
    },
    failingAudits,
    fetchTime: lhr.fetchTime,
    finalUrl: lhr.finalUrl,
    lighthouseVersion: lhr.lighthouseVersion,
  };
}

/**
 * Summarise audit details (table / list) to avoid huge payloads.
 */
function summariseDetails(details) {
  if (!details || !details.type) return null;
  if (details.type === "table" && details.items) {
    return {
      type: "table",
      headings: (details.headings || []).map((h) => h.label || h.key),
      items: details.items.slice(0, 5),
    };
  }
  if (details.type === "list" && details.items) {
    return { type: "list", items: details.items.slice(0, 5) };
  }
  return { type: details.type };
}
