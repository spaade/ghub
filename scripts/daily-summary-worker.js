#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getScheduleState, runDailySummary } from "../api/lib/daily-summary.js";

const checkEveryMs = Math.max(Number(process.env.DAILY_SUMMARY_CHECK_SECONDS || 60), 10) * 1000;
const stateFile = process.env.DAILY_SUMMARY_STATE_FILE || "";
let lastRunDate = null;
let inFlight = false;
let bootstrapped = false;

async function readStateDate() {
  if (!stateFile) return null;
  try {
    const data = JSON.parse(await readFile(stateFile, "utf8"));
    return data.lastRunDate || null;
  } catch (_) {
    return null;
  }
}

async function writeStateDate(date, result) {
  if (!stateFile) return;
  await mkdir(dirname(stateFile), { recursive: true });
  await writeFile(
    stateFile,
    JSON.stringify(
      {
        lastRunDate: date,
        updatedAt: new Date().toISOString(),
        result: {
          runKey: result.runKey,
          count: result.count,
          skipped: result.skipped,
          reason: result.reason,
        },
      },
      null,
      2
    )
  );
}

async function tick() {
  const state = getScheduleState();
  const catchUp = process.env.DAILY_SUMMARY_CATCH_UP === "true";

  if (!bootstrapped) {
    bootstrapped = true;
    if (state.reachedTarget && !catchUp) {
      lastRunDate = state.date;
      console.log(`[daily-summary] target already passed for ${state.date}; next run will be tomorrow`);
      return;
    }
  }

  if (!state.reachedTarget || lastRunDate === state.date || inFlight) {
    return;
  }

  const storedDate = await readStateDate();
  if (storedDate === state.date) {
    lastRunDate = state.date;
    return;
  }

  inFlight = true;
  lastRunDate = state.date;

  try {
    console.log(`[daily-summary] ${new Date().toISOString()} running for ${state.date}`);
    const result = await runDailySummary();
    if (result.ok) await writeStateDate(state.date, result);
    console.log(`[daily-summary] completed: ${JSON.stringify({ runKey: result.runKey, count: result.count, skipped: result.skipped, reason: result.reason })}`);
  } catch (err) {
    console.error(`[daily-summary] failed: ${(err && err.stack) || err}`);
  } finally {
    inFlight = false;
  }
}

const state = getScheduleState();
console.log(
  `[daily-summary] worker started. target=${state.targetLabel} timezone=${state.timeZone} checkEveryMs=${checkEveryMs} stateFile=${stateFile || "off"}`
);

await tick();
setInterval(tick, checkEveryMs);
