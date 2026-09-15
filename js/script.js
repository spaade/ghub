/* =====================================================
   ghub do Gustavo — bootstrap, abas, toast e utilitários de data
   ===================================================== */

const WEEKDAYS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoToLocalDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateToISO(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysISO(iso, delta) {
  const dt = isoToLocalDate(iso);
  dt.setDate(dt.getDate() + delta);
  return dateToISO(dt);
}

function formatShortDate(iso) {
  const dt = isoToLocalDate(iso);
  return `${String(dt.getDate()).padStart(2, "0")} de ${MONTHS_PT[dt.getMonth()]}`;
}

function formatDayLabel(iso) {
  const diffDays = Math.round(
    (isoToLocalDate(iso) - isoToLocalDate(todayISO())) / 86400000
  );
  if (diffDays === 0) return `Hoje · ${formatShortDate(iso)}`;
  if (diffDays === 1) return `Amanhã · ${formatShortDate(iso)}`;
  if (diffDays === -1) return `Ontem · ${formatShortDate(iso)}`;
  const dt = isoToLocalDate(iso);
  return `${WEEKDAYS_PT[dt.getDay()]} · ${formatShortDate(iso)}`;
}

function showToast(text) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 3200);
}

function reportError(err) {
  console.error(err);
  showToast(`⚠️ ${err.message || "Algo deu errado."}`);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function setupTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");

  function activate(tabId) {
    buttons.forEach((b) => {
      const on = b.dataset.tab === tabId;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    panels.forEach((p) => p.classList.toggle("active", p.id === tabId));
  }

  buttons.forEach((b) => b.addEventListener("click", () => activate(b.dataset.tab)));
}

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
});

