/* =====================================================
   ghub do Gustavo — aba Tarefas
   ===================================================== */

const TasksModule = (() => {
  let categories = [];
  let selectedCategory = "";
  let dayState = { mode: "day", date: todayISO() }; // mode: "day" | "all"
  const els = {};

  function cacheEls() {
    els.dayLabel = document.getElementById("dayLabel");
    els.dayPrev = document.getElementById("dayPrev");
    els.dayNext = document.getElementById("dayNext");
    els.dayToday = document.getElementById("dayToday");
    els.dayViewAll = document.getElementById("dayViewAll");
    els.form = document.getElementById("taskForm");
    els.title = document.getElementById("taskTitle");
    els.category = document.getElementById("taskCategory");
    els.categoryAddBtn = document.getElementById("taskCategoryAddBtn");
    els.priority = document.getElementById("taskPriority");
    els.dueDate = document.getElementById("taskDueDate");
    els.chips = document.getElementById("taskCategoryChips");
    els.filterPriority = document.getElementById("taskFilterPriority");
    els.filterStatus = document.getElementById("taskFilterStatus");
    els.list = document.getElementById("taskList");
    els.empty = document.getElementById("taskEmpty");
  }

  function populatePrioritySelects() {
    const opts = CONFIG.priorities
      .map((p) => `<option value="${p.id}">${p.emoji} ${p.label}</option>`)
      .join("");
    els.priority.innerHTML = opts;
    els.priority.value = "media";
    els.filterPriority.innerHTML = `<option value="">Todas prioridades</option>${opts}`;
  }

  async function loadCategories() {
    const { categories: rows } = await Api.categories.list("task");
    categories = rows;
    renderCategorySelect();
    renderCategoryChips();
  }

  function renderCategorySelect() {
    const current = els.category.value;
    els.category.innerHTML =
      `<option value="">Sem categoria</option>` +
      categories.map((c) => `<option value="${c.id}">${c.emoji} ${escapeHtml(c.name)}</option>`).join("");
    if (categories.some((c) => String(c.id) === current)) els.category.value = current;
  }

  function renderCategoryChips() {
    const allChip = `<button type="button" class="chip ${selectedCategory === "" ? "selected" : ""}" data-cat="">Todas</button>`;
    const chips = categories
      .map(
        (c) => `
      <span class="chip ${String(selectedCategory) === String(c.id) ? "selected" : ""}" data-cat="${c.id}">
        ${c.emoji} ${escapeHtml(c.name)}
        <button type="button" class="chip-remove" data-remove-cat="${c.id}" aria-label="Remover categoria">×</button>
      </span>`
      )
      .join("");
    els.chips.innerHTML = allChip + chips;

    els.chips.querySelectorAll(".chip[data-cat]").forEach((chip) => {
      chip.addEventListener("click", () => {
        selectedCategory = chip.dataset.cat;
        renderCategoryChips();
        loadTasks();
      });
    });

    els.chips.querySelectorAll("[data-remove-cat]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.dataset.removeCat;
        if (!confirm("Remover essa categoria? As tarefas dela ficam sem categoria.")) return;
        try {
          await Api.categories.remove(id);
          if (String(selectedCategory) === String(id)) selectedCategory = "";
          await loadCategories();
          await loadTasks();
          showToast("Categoria removida.");
        } catch (err) {
          reportError(err);
        }
      });
    });
  }

  function renderDayLabel() {
    els.dayLabel.textContent = dayState.mode === "all" ? "Todos os dias" : formatDayLabel(dayState.date);
    els.dayViewAll.textContent = dayState.mode === "all" ? "Ver só um dia" : "Ver todos os dias";
  }

  function goToDay(iso) {
    dayState.mode = "day";
    dayState.date = iso;
    renderDayLabel();
    loadTasks();
  }

  function wireDayNav() {
    els.dayPrev.addEventListener("click", () => goToDay(addDaysISO(dayState.date, -1)));
    els.dayNext.addEventListener("click", () => goToDay(addDaysISO(dayState.date, 1)));
    els.dayToday.addEventListener("click", () => goToDay(todayISO()));
    els.dayViewAll.addEventListener("click", () => {
      dayState.mode = dayState.mode === "all" ? "day" : "all";
      renderDayLabel();
      loadTasks();
    });
  }

  function wireFilters() {
    els.filterPriority.addEventListener("change", loadTasks);
    els.filterStatus.addEventListener("change", loadTasks);
  }

  async function loadTasks() {
    const params = {
      priority: els.filterPriority.value || undefined,
      done: els.filterStatus.value || undefined,
      category_id: selectedCategory || undefined,
    };
    if (dayState.mode === "day") params.date = dayState.date;

    try {
      const { tasks } = await Api.tasks.list(params);
      renderTasks(tasks);
    } catch (err) {
      reportError(err);
    }
  }

  function taskItemHtml(t) {
    const pMeta = priorityMeta(t.priority);
    const dateBadge =
      dayState.mode === "all" || !t.due_date
        ? ""
        : `<span class="badge badge-date">📅 ${formatShortDate(t.due_date)}</span>`;
    return `
      <article class="task-item ${t.done ? "done" : ""}" data-id="${t.id}">
        <button type="button" class="task-check" data-toggle="${t.id}" aria-label="Marcar como feita">${t.done ? "✓" : ""}</button>
        <div class="task-body">
          <div class="task-title">${escapeHtml(t.title)}</div>
          <div class="task-meta">
            <span class="badge badge-priority-${t.priority}">${pMeta.emoji} ${pMeta.label}</span>
            ${t.category_name ? `<span class="badge badge-category">${t.category_emoji} ${escapeHtml(t.category_name)}</span>` : ""}
            ${dateBadge}
          </div>
        </div>
        <button type="button" class="item-delete" data-delete="${t.id}" aria-label="Excluir tarefa">🗑</button>
      </article>
    `;
  }

  function renderTasks(tasks) {
    els.empty.hidden = tasks.length > 0;
    els.empty.textContent =
      dayState.mode === "day" ? "Nenhuma tarefa nesse dia 🌙" : "Nenhuma tarefa por aqui ainda 🌙";

    if (!tasks.length) {
      els.list.innerHTML = "";
      return;
    }

    if (dayState.mode !== "all") {
      els.list.innerHTML = tasks.map(taskItemHtml).join("");
      wireTaskItems();
      return;
    }

    const groups = new Map();
    tasks.forEach((t) => {
      const key = t.due_date || "__none__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    });
    const keys = Array.from(groups.keys()).sort((a, b) => {
      if (a === "__none__") return 1;
      if (b === "__none__") return -1;
      return a < b ? -1 : a > b ? 1 : 0;
    });

    els.list.innerHTML = keys
      .map((key) => {
        const label = key === "__none__" ? "Sem data" : formatDayLabel(key);
        const items = groups.get(key).map(taskItemHtml).join("");
        return `<div class="task-group-label">${label}</div>${items}`;
      })
      .join("");
    wireTaskItems();
  }

  function wireTaskItems() {
    els.list.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.toggle;
        const item = btn.closest(".task-item");
        const nowDone = !item.classList.contains("done");
        try {
          await Api.tasks.update(id, { done: nowDone });
          loadTasks();
        } catch (err) {
          reportError(err);
        }
      });
    });

    els.list.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.delete;
        if (!confirm("Excluir essa tarefa?")) return;
        try {
          await Api.tasks.remove(id);
          loadTasks();
        } catch (err) {
          reportError(err);
        }
      });
    });
  }

  function wireForm() {
    els.categoryAddBtn.addEventListener("click", async () => {
      const name = prompt("Nome da nova categoria:");
      if (!name || !name.trim()) return;
      const style = pickCategoryStyle(categories.length);
      try {
        const { category } = await Api.categories.create({ kind: "task", name: name.trim(), ...style });
        await loadCategories();
        els.category.value = category.id;
        showToast("Categoria criada! 🌸");
      } catch (err) {
        reportError(err);
      }
    });

    els.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = els.title.value.trim();
      if (!title) return;
      try {
        await Api.tasks.create({
          title,
          category_id: els.category.value || null,
          priority: els.priority.value,
          due_date: els.dueDate.value || (dayState.mode === "day" ? dayState.date : null),
        });
        els.title.value = "";
        els.dueDate.value = "";
        showToast("Tarefa adicionada! ✅");
        loadTasks();
      } catch (err) {
        reportError(err);
      }
    });
  }

  async function init() {
    cacheEls();
    populatePrioritySelects();
    renderDayLabel();
    wireDayNav();
    wireFilters();
    wireForm();
    try {
      await loadCategories();
      await loadTasks();
    } catch (err) {
      reportError(err);
    }
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", () => {
  TasksModule.init();
});

