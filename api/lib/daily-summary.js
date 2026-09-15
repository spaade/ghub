import { query } from "./db.js";
import { getGowaConfig, sendGowaMessage } from "./gowa.js";

const DEFAULT_CATEGORIES = ["consultas", "exames"];
const PRIORITY_ORDER = { alta: 0, media: 1, baixa: 2 };
const PRIORITY_LABELS = { alta: "Alta", media: "Media", baixa: "Baixa" };

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseList(value, fallback) {
  const items = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
}

function datePartsInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${byType.year}-${byType.month}-${byType.day}`,
    hour: Number(byType.hour),
    minute: Number(byType.minute),
  };
}

export function getDateKey(timeZone = "America/Sao_Paulo", now = new Date()) {
  return datePartsInTimeZone(now, timeZone).date;
}

export function getDailySummaryConfig(env = process.env) {
  const timeZone = env.DAILY_SUMMARY_TIMEZONE || "America/Sao_Paulo";
  return {
    timeZone,
    runDate: env.DAILY_SUMMARY_RUN_DATE || getDateKey(timeZone),
    source: String(env.SUMMARY_SOURCE || "tasks").trim().toLowerCase(),
    categories: parseList(env.SUMMARY_CATEGORIES, DEFAULT_CATEGORIES).map(normalizeText),
    title: env.SUMMARY_TOPIC || "Resumo da listinha da Mireia",
    sendEmpty: env.DAILY_SUMMARY_SEND_EMPTY !== "false",
    mhubBaseUrl: normalizeBaseUrl(env.MHUB_BASE_URL),
    gowa: getGowaConfig(env),
  };
}

function categoryMatches(categoryName, allowedCategories) {
  const normalized = normalizeText(categoryName);
  return allowedCategories.includes(normalized);
}

export async function fetchWishlistSummaryItems(config = getDailySummaryConfig()) {
  if (config.source === "tasks") {
    return fetchTaskSummaryItems(config);
  }

  if (config.mhubBaseUrl) {
    const response = await fetch(`${config.mhubBaseUrl}/api/wishlist?purchased=false`);
    const data = await response.json().catch(() => null);

    if (!response.ok || !data || data.ok === false) {
      const message = (data && data.error) || `mhub retornou HTTP ${response.status}`;
      throw new Error(message);
    }

    return sortSummaryItems(
      (data.items || []).filter((item) => categoryMatches(item.category_name, config.categories))
    );
  }

  const { rows } = await query(
    `
      SELECT wishlist_items.*,
             categories.name  AS category_name,
             categories.emoji AS category_emoji,
             categories.color AS category_color
      FROM wishlist_items
      LEFT JOIN categories ON categories.id = wishlist_items.category_id
      WHERE wishlist_items.purchased = 0
      ORDER BY CASE wishlist_items.priority WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
               categories.name ASC,
               wishlist_items.created_at DESC
    `
  );

  return sortSummaryItems(rows.filter((item) => categoryMatches(item.category_name, config.categories)));
}

async function fetchTaskSummaryItems(config) {
  if (config.mhubBaseUrl) {
    const response = await fetch(`${config.mhubBaseUrl}/api/tasks?done=false`);
    const data = await response.json().catch(() => null);

    if (!response.ok || !data || data.ok === false) {
      const message = (data && data.error) || `mhub retornou HTTP ${response.status}`;
      throw new Error(message);
    }

    return sortSummaryItems(
      (data.tasks || []).filter((item) => categoryMatches(item.category_name, config.categories))
    );
  }

  const { rows } = await query(
    `
      SELECT tasks.*,
             categories.name  AS category_name,
             categories.emoji AS category_emoji,
             categories.color AS category_color
      FROM tasks
      LEFT JOIN categories ON categories.id = tasks.category_id
      WHERE tasks.done = 0
      ORDER BY (tasks.due_date IS NULL) ASC,
               tasks.due_date ASC,
               CASE tasks.priority WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
               tasks.created_at DESC
    `
  );

  return sortSummaryItems(rows.filter((item) => categoryMatches(item.category_name, config.categories)));
}

function sortSummaryItems(items) {
  return items.sort((a, b) => {
    const priorityDiff = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
    if (priorityDiff) return priorityDiff;
    if (a.due_date || b.due_date) {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      if (a.due_date !== b.due_date) return String(a.due_date).localeCompare(String(b.due_date));
    }
    return String(a.title).localeCompare(String(b.title), "pt-BR");
  });
}

function formatDatePtBr(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = String(isoDate).split("-");
  if (!year || !month || !day) return String(isoDate);
  return `${day}/${month}/${year}`;
}

function groupByCategory(items) {
  const groups = new Map();
  for (const item of items) {
    const key = item.category_name || "Sem categoria";
    if (!groups.has(key)) {
      groups.set(key, { name: key, emoji: item.category_emoji || "", items: [] });
    }
    groups.get(key).items.push(item);
  }
  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function buildDailySummaryMessage(items, config = getDailySummaryConfig()) {
  const lines = [`Bom dia! ${config.title}:`, ""];

  if (!items.length) {
    lines.push("Nao encontrei itens pendentes nas categorias configuradas hoje.");
    return lines.join("\n");
  }

  for (const group of groupByCategory(items)) {
    lines.push(`${group.emoji ? `${group.emoji} ` : ""}${group.name}`);
    for (const item of group.items) {
      const priority = PRIORITY_LABELS[item.priority] || "Media";
      const extras =
        config.source === "tasks"
          ? [item.due_date ? `data ${formatDatePtBr(item.due_date)}` : ""].filter(Boolean).join(" - ")
          : [item.price, item.link].filter(Boolean).join(" - ");
      lines.push(`- ${priority}: ${item.title}${extras ? ` (${extras})` : ""}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

async function readRun(runKey) {
  const { rows } = await query(`SELECT * FROM notification_runs WHERE run_key = ?`, [runKey]);
  return rows[0] || null;
}

async function markRun(runKey, kind, status, details = null, sentAt = null) {
  await query(
    `
      INSERT INTO notification_runs (run_key, kind, status, details, sent_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(run_key) DO UPDATE SET
        status = excluded.status,
        details = excluded.details,
        sent_at = excluded.sent_at,
        updated_at = datetime('now')
    `,
    [runKey, kind, status, details ? String(details).slice(0, 1000) : null, sentAt]
  );
}

export async function runDailySummary({ env = process.env, force = false, dryRun = false } = {}) {
  const config = getDailySummaryConfig(env);
  const runKey = `daily-summary:${config.runDate}`;
  const kind = "daily-summary";
  const useRunLog = !config.mhubBaseUrl;

  if (useRunLog && !force && !dryRun) {
    const existingRun = await readRun(runKey);
    if (existingRun && existingRun.status === "sent") {
      return { ok: true, skipped: true, reason: "already_sent", runKey };
    }
  }

  if (useRunLog && !dryRun) {
    await markRun(runKey, kind, "running", "Montando resumo diario");
  }

  try {
    const items = await fetchWishlistSummaryItems(config);
    const message = buildDailySummaryMessage(items, config);

    if (!items.length && !config.sendEmpty) {
      if (useRunLog && !dryRun) await markRun(runKey, kind, "skipped", "Sem itens para enviar");
      return { ok: true, skipped: true, reason: "empty", runKey, items, message };
    }

    const sendResult = await sendGowaMessage({ ...config.gowa, message, dryRun });
    if (useRunLog && !dryRun) {
      await markRun(
        runKey,
        kind,
        "sent",
        JSON.stringify({ count: items.length, gowa: sendResult.data || sendResult }),
        new Date().toISOString()
      );
    }

    return { ok: true, runKey, count: items.length, message, sendResult };
  } catch (err) {
    if (useRunLog && !dryRun) {
      await markRun(runKey, kind, "failed", String((err && err.message) || err));
    }
    throw err;
  }
}

export function getScheduleState(env = process.env, now = new Date()) {
  const timeZone = env.DAILY_SUMMARY_TIMEZONE || "America/Sao_Paulo";
  const [hourValue, minuteValue] = String(env.DAILY_SUMMARY_TIME || "08:00").split(":");
  const targetMinutes = Number(hourValue || 8) * 60 + Number(minuteValue || 0);
  const parts = datePartsInTimeZone(now, timeZone);
  const currentMinutes = parts.hour * 60 + parts.minute;
  return {
    ...parts,
    timeZone,
    targetMinutes,
    reachedTarget: currentMinutes >= targetMinutes,
    targetLabel: `${String(Math.floor(targetMinutes / 60)).padStart(2, "0")}:${String(targetMinutes % 60).padStart(2, "0")}`,
  };
}
