const BASE = import.meta.env.VITE_API_URL || "/api";

export async function api(path, { method = "GET", token, body } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error("No se pudo contactar el API");
    err.status = 0;
    throw err;
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Error de API");
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function loginRequest(email, password) {
  return api("/auth/login", { method: "POST", body: { email, password } });
}
