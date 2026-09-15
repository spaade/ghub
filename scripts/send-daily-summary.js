#!/usr/bin/env node

import { runDailySummary } from "../api/lib/daily-summary.js";

const args = new Set(process.argv.slice(2));

try {
  const result = await runDailySummary({
    force: args.has("--force"),
    dryRun: args.has("--dry-run"),
  });

  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error((err && err.stack) || err);
  process.exitCode = 1;
}
