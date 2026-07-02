/**
 * SiteJudge Lighthouse Worker — Express HTTP server
 * Exposes a single endpoint: GET /audit?url=https://example.com
 */

import express from "express";
import cors from "cors";
import { runAudit } from "./runner.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "sitejudge-lighthouse-worker" });
});

// ── Main audit endpoint ──────────────────────────────────────────────
app.get("/audit", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing required query param: url" });
  }

  // Basic URL validation
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Only http/https URLs are allowed.");
    }
  } catch (err) {
    return res.status(400).json({ error: `Invalid URL: ${err.message}` });
  }

  console.log(`[worker] Starting audit for: ${url}`);
  const startTime = Date.now();

  try {
    const result = await runAudit(url);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[worker] Audit complete in ${elapsed}s for: ${url}`);

    return res.json({
      success: true,
      url,
      duration_seconds: parseFloat(elapsed),
      ...result,
    });
  } catch (err) {
    console.error(`[worker] Audit failed for ${url}:`, err);
    return res.status(500).json({
      success: false,
      error: err.message,
      url,
    });
  }
});

// ── Start server ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[worker] Lighthouse worker listening on port ${PORT}`);
});
