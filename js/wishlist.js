/* =====================================================
   ghub do Gustavo — aba Wishlist
   ===================================================== */

const WishlistModule = (() => {
  let albums = [];
  let selectedAlbum = "";
  const els = {};

  function cacheEls() {
    els.form = document.getElementById("wishForm");
    els.title = document.getElementById("wishTitle");
    els.album = document.getElementById("wishAlbum");
    els.albumAddBtn = document.getElementById("wishAlbumAddBtn");
    els.priority = document.getElementById("wishPriority");
    els.price = document.getElementById("wishPrice");
    els.link = document.getElementById("wishLink");
    els.chips = document.getElementById("wishAlbumChips");
    els.filterPriority = document.getElementById("wishFilterPriority");
    els.filterStatus = document.getElementById("wishFilterStatus");
    els.grid = document.getElementById("wishGrid");
    els.empty = document.getElementById("wishEmpty");
  }

  function populatePrioritySelects() {
    const opts = CONFIG.priorities
      .map((p) => `<option value="${p.id}">${p.emoji} ${p.label}</option>`)
      .join("");
    els.priority.innerHTML = opts;
    els.priority.value = "media";
    els.filterPriority.innerHTML = `<option value="">Todas prioridades</option>${opts}`;
  }

  async function loadAlbums() {
    const { categories: rows } = await Api.categories.list("wishlist");
    albums = rows;
    renderAlbumSelect();
    renderAlbumChips();
  }

  function renderAlbumSelect() {
    const current = els.album.value;
    els.album.innerHTML =
      `<option value="">Sem álbum</option>` +
      albums.map((a) => `<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join("");
    if (albums.some((a) => String(a.id) === current)) els.album.value = current;
  }

  function renderAlbumChips() {
    const allChip = `<button type="button" class="chip ${selectedAlbum === "" ? "selected" : ""}" data-album="">Todos os álbuns</button>`;
    const chips = albums
      .map(
        (a) => `
      <span class="chip ${String(selectedAlbum) === String(a.id) ? "selected" : ""}" data-album="${a.id}">
        ${a.emoji} ${escapeHtml(a.name)}
        <button type="button" class="chip-remove" data-remove-album="${a.id}" aria-label="Remover álbum">×</button>
      </span>`
      )
      .join("");
    els.chips.innerHTML = allChip + chips;

    els.chips.querySelectorAll(".chip[data-album]").forEach((chip) => {
      chip.addEventListener("click", () => {
        selectedAlbum = chip.dataset.album;
        renderAlbumChips();
        loadItems();
      });
    });

    els.chips.querySelectorAll("[data-remove-album]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.dataset.removeAlbum;
        if (!confirm("Remover esse álbum? Os itens dele ficam sem álbum.")) return;
        try {
          await Api.categories.remove(id);
          if (String(selectedAlbum) === String(id)) selectedAlbum = "";
          await loadAlbums();
          await loadItems();
          showToast("Álbum removido.");
        } catch (err) {
          reportError(err);
        }
      });
    });
  }

  function wireFilters() {
    els.filterPriority.addEventListener("change", loadItems);
    els.filterStatus.addEventListener("change", loadItems);
  }

  async function loadItems() {
    const params = {
      priority: els.filterPriority.value || undefined,
      purchased: els.filterStatus.value || undefined,
      category_id: selectedAlbum || undefined,
    };
    try {
      const { items } = await Api.wishlist.list(params);
      renderItems(items);
    } catch (err) {
      reportError(err);
    }
  }

  function wishCardHtml(item) {
    const pMeta = priorityMeta(item.priority);
    return `
      <article class="wish-card ${item.purchased ? "purchased" : ""}" data-id="${item.id}">
        <button type="button" class="item-delete" data-delete="${item.id}" aria-label="Excluir item">🗑</button>
        <div class="wish-title">${escapeHtml(item.title)}</div>
        <div class="wish-meta">
          <span class="badge badge-priority-${item.priority}">${pMeta.emoji} ${pMeta.label}</span>
          ${item.category_name ? `<span class="badge badge-category">${item.category_emoji} ${escapeHtml(item.category_name)}</span>` : ""}
        </div>
        ${item.price ? `<div class="wish-price">${escapeHtml(item.price)}</div>` : ""}
        <div class="wish-actions">
          <button type="button" class="btn btn-ghost btn-small" data-toggle="${item.id}">
            ${item.purchased ? "↩ Marcar como desejo" : "✓ Já comprei"}
          </button>
          ${item.link ? `<a class="btn btn-ghost btn-small" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">🔗 Ver</a>` : ""}
        </div>
      </article>
    `;
  }

  function renderItems(items) {
    els.empty.hidden = items.length > 0;
    if (!items.length) {
      els.grid.innerHTML = "";
      return;
    }
    els.grid.innerHTML = items.map(wishCardHtml).join("");
    wireItemCards();
  }

  function wireItemCards() {
    els.grid.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.toggle;
        const card = btn.closest(".wish-card");
        const nowPurchased = !card.classList.contains("purchased");
        try {
          await Api.wishlist.update(id, { purchased: nowPurchased });
          loadItems();
        } catch (err) {
          reportError(err);
        }
      });
    });

    els.grid.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.delete;
        if (!confirm("Excluir esse item da wishlist?")) return;
        try {
          await Api.wishlist.remove(id);
          loadItems();
        } catch (err) {
          reportError(err);
        }
      });
    });
  }

  function wireForm() {
    els.albumAddBtn.addEventListener("click", async () => {
      const name = prompt("Nome do novo álbum:");
      if (!name || !name.trim()) return;
      const style = pickCategoryStyle(albums.length);
      try {
        const { category } = await Api.categories.create({ kind: "wishlist", name: name.trim(), ...style });
        await loadAlbums();
        els.album.value = category.id;
        showToast("Álbum criado! 🎀");
      } catch (err) {
        reportError(err);
      }
    });

    els.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = els.title.value.trim();
      if (!title) return;
      try {
        await Api.wishlist.create({
          title,
          category_id: els.album.value || null,
          priority: els.priority.value,
          price: els.price.value.trim() || null,
          link: els.link.value.trim() || null,
        });
        els.title.value = "";
        els.price.value = "";
        els.link.value = "";
        showToast("Adicionado à wishlist! 🎀");
        loadItems();
      } catch (err) {
        reportError(err);
      }
    });
  }

  async function init() {
    cacheEls();
    populatePrioritySelects();
    wireFilters();
    wireForm();
    try {
      await loadAlbums();
      await loadItems();
    } catch (err) {
      reportError(err);
    }
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", () => {
  WishlistModule.init();
});

