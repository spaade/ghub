/**
 * Wrapper fino sobre fetch pras rotas /api/*.
 */

function buildQuery(params) {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return "";
  return "?" + new URLSearchParams(entries).toString();
}

async function apiRequest(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }

  if (!res.ok || !data || data.ok === false) {
    const message = (data && data.error) || `Erro ${res.status}`;
    throw new Error(message);
  }
  return data;
}

const Api = {
  categories: {
    list: (kind) => apiRequest(`/api/categories${buildQuery({ kind })}`),
    create: (payload) => apiRequest("/api/categories", { method: "POST", body: payload }),
    remove: (id) => apiRequest(`/api/categories${buildQuery({ id })}`, { method: "DELETE" }),
  },
  tasks: {
    list: (params) => apiRequest(`/api/tasks${buildQuery(params)}`),
    create: (payload) => apiRequest("/api/tasks", { method: "POST", body: payload }),
    update: (id, payload) => apiRequest(`/api/tasks${buildQuery({ id })}`, { method: "PATCH", body: payload }),
    remove: (id) => apiRequest(`/api/tasks${buildQuery({ id })}`, { method: "DELETE" }),
  },
  wishlist: {
    list: (params) => apiRequest(`/api/wishlist${buildQuery(params)}`),
    create: (payload) => apiRequest("/api/wishlist", { method: "POST", body: payload }),
    update: (id, payload) => apiRequest(`/api/wishlist${buildQuery({ id })}`, { method: "PATCH", body: payload }),
    remove: (id) => apiRequest(`/api/wishlist${buildQuery({ id })}`, { method: "DELETE" }),
  },
};
