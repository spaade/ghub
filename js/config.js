/**
 * ============================================================
 *  CONFIGURAÇÃO DO HUB — textos e metadados de UI
 * ============================================================
 */

const CONFIG = {
  herName: "Mireia",
  herNameKatakana: "ミレイア",

  priorities: [
    { id: "alta", label: "Alta", emoji: "🔥" },
    { id: "media", label: "Média", emoji: "⚡" },
    { id: "baixa", label: "Baixa", emoji: "🌙" },
  ],

  // Usados ao criar uma categoria/álbum nova rapidinho (via prompt),
  // pra já sair com uma cor/emoji bonitinhos sem precisar perguntar.
  categoryEmojis: ["📌", "🌸", "📚", "💻", "🧹", "🎯", "🛍️", "🏠", "💡", "🎨", "🎵", "🐾"],
  categoryColors: ["#a233c4", "#e8b923", "#17a398", "#e0577e", "#bb7ee0", "#5f4180"],
};

function priorityMeta(id) {
  return CONFIG.priorities.find((p) => p.id === id) || CONFIG.priorities[1];
}

function pickCategoryStyle(index) {
  const emoji = CONFIG.categoryEmojis[index % CONFIG.categoryEmojis.length];
  const color = CONFIG.categoryColors[index % CONFIG.categoryColors.length];
  return { emoji, color };
}
