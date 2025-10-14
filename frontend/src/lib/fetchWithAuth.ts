// frontend/src/lib/fetchWithAuth.ts
import { API_URL } from "../config";

// tokens stored in localStorage keys (same as seu código atual)
const TOKEN_KEY = "token";
const USER_ID_KEY = "user_id";
const USER_ROLE_KEY = "user_role";
const USER_NAME_KEY = "user_name";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearTokenData() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
  localStorage.removeItem(USER_NAME_KEY);
}

export function logout(redirect = true) {
  // opcional: tentar limpar backend (se existir /auth/logout)
  fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).finally(() => {
    clearTokenData();
    if (redirect) {
      window.location.href = "/"; // força redirecionamento para login
    }
  });
}

/**
 * tryRefresh
 * - tenta chamar POST /auth/refresh com credentials: include
 * - se retornar access_token, grava via setToken e retorna true
 * - se falhar retorna false
 *
 * IMPORTANTE: o backend precisa expor /auth/refresh que lê o cookie httpOnly.
 */
async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "include", // envia cookies (refresh cookie)
    });

    if (!res.ok) {
      return false;
    }

    const payload = await res.json().catch(() => null);
    const newToken = payload?.access_token;
    if (newToken) {
      setToken(newToken);
      // se o backend retornar user, atualize também (opcional)
      if (payload.user) {
        localStorage.setItem(USER_ID_KEY, String(payload.user.id));
        localStorage.setItem(USER_ROLE_KEY, payload.user.role);
        localStorage.setItem(USER_NAME_KEY, payload.user.nome);
      }
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

/**
 * fetchWithAuth
 * - input: same args as fetch
 * - if token exists, adds Authorization header
 * - if response is 401/403 -> try refresh once (if available) and retry request
 * - if still unauthorized -> clear session and redirect to login
 * - throws on non-ok responses (caller can catch)
 */
export async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}) {
  let token = getToken();
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // prefer explicit credentials: include when using cookies for refresh, but keep default if caller set it
  const cred = init.credentials ?? "same-origin";

  let res = await fetch(input, { ...init, headers, credentials: cred });

  // if unauthorized, attempt refresh (only once)
  if (res.status === 401 || res.status === 403) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      // retry original request with new token
      const newToken = getToken();
      const headers2 = new Headers(init.headers || {});
      headers2.set("Accept", "application/json");
      if (newToken) headers2.set("Authorization", `Bearer ${newToken}`);

      res = await fetch(input, { ...init, headers: headers2, credentials: cred });

      // if still not ok, handle below
    } else {
      // refresh failed -> logout and redirect
      clearTokenData();
      window.location.href = "/";
      throw new Error("Não autorizado. Faça login novamente.");
    }
  }

  if (!res.ok) {
    // tenta extrair message do body JSON, fallback para statusText
    let msg = res.statusText;
    try {
      const payload = await res.json();
      msg = payload?.detail || payload?.message || msg;
    } catch (e) {
      // body não JSON ou vazio
    }
    const err = new Error(msg || `HTTP error ${res.status}`);
    (err as any).response = res;
    throw err;
  }

  return res;
}

/**
 * Optional: helper para chamadas GET simples que retornam JSON
 */
export async function fetchJsonWithAuth(input: RequestInfo, init: RequestInit = {}) {
  const res = await fetchWithAuth(input, init);
  return res.json();
}
