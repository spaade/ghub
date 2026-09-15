/**
 * ============================================================
 *  CONFIGURAÇÃO DO HUB — textos e metadados de UI
 * ============================================================
 */

const CONFIG = {
  herName: "Gustavo",
  herNameKatakana: "グスタボ",

  priorities: [
    { id: "alta", label: "Alta", emoji: "🔥" },
    { id: "media", label: "Média", emoji: "⚡" },
    { id: "baixa", label: "Baixa", emoji: "🌙" },
  ],

  // Usados ao criar uma categoria/álbum nova rapidinho (via prompt),
  // pra já sair com uma cor/emoji bonitinhos sem precisar perguntar.
  categoryEmojis: ["📌", "🎧", "🦖", "🎵", "💻", "🎯", "🏋️", "📚", "🛍️", "🛰️", "⚡", "🎮"],
  categoryColors: ["#6958ff", "#ff2f78", "#6e7b9b", "#b9a8ff", "#32364a", "#8d79f7"],
};

function priorityMeta(id) {
  return CONFIG.priorities.find((p) => p.id === id) || CONFIG.priorities[1];
}

function pickCategoryStyle(index) {
  const emoji = CONFIG.categoryEmojis[index % CONFIG.categoryEmojis.length];
  const color = CONFIG.categoryColors[index % CONFIG.categoryColors.length];
  return { emoji, color };
}
