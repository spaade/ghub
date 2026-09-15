function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

function buildBasicAuthHeader({ auth, username, password }) {
  const credentials = auth || (username && password ? `${username}:${password}` : "");
  if (!credentials) return null;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

export function getGowaConfig(env = process.env) {
  return {
    baseUrl: normalizeBaseUrl(env.GOWA_BASE_URL),
    phone: String(env.GOWA_TO || "").trim(),
    auth: String(env.GOWA_AUTH || "").trim(),
    username: String(env.GOWA_AUTH_USER || "").trim(),
    password: String(env.GOWA_AUTH_PASSWORD || "").trim(),
    deviceId: String(env.GOWA_DEVICE_ID || "").trim(),
  };
}

export async function sendGowaMessage({ baseUrl, phone, message, auth, username, password, deviceId, dryRun = false }) {
  if (!baseUrl) throw new Error("GOWA_BASE_URL nao configurada");
  if (!phone) throw new Error("GOWA_TO nao configurado");
  if (!message || !String(message).trim()) throw new Error("Mensagem vazia");

  const url = `${normalizeBaseUrl(baseUrl)}/send/message`;
  const headers = { "Content-Type": "application/json" };
  const basicAuth = buildBasicAuthHeader({ auth, username, password });
  if (basicAuth) headers.Authorization = basicAuth;
  if (deviceId) headers["X-Device-Id"] = deviceId;

  const body = { phone, message };
  if (dryRun) {
    return { dryRun: true, url, body };
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`GOWA retornou HTTP ${response.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }

  return { status: response.status, data };
}
