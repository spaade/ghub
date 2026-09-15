import { runDailySummary } from "../lib/daily-summary.js";

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const secret = process.env.CRON_SECRET;
  if (secret && getBearerToken(req) !== secret) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const dryRun = req.query && req.query.dry_run === "true";
    const force = req.query && req.query.force === "true";
    const result = await runDailySummary({ force, dryRun });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String((err && err.message) || err) });
  }
}
