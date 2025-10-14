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

export function logout(redirect = true) {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  if (redirect) {
    window.location.href = "/"; // força redirecionamento para login
  }
}

/**
 * fetchWithAuth
 * - input: same args as fetch
 * - if token exists, adds Authorization header
 * - if response is 401 => clear session and redirect to login
 * - throws on non-ok responses (caller can catch)
 */
export async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(input, { ...init, headers });

  if (res.status === 401 || res.status === 403) {
    // token expirado ou inválido -> limpar e redirecionar
    logout(true);
    throw new Error("Não autorizado. Faça login novamente.");
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
    // anexar resposta para debug se desejar
    (err as any).response = res;
    throw err;
  }

  return res;
}

/**
 * Optional extension point:
 * If you later implement refresh tokens, you can add logic here:
 * - on 401: call refresh endpoint, setToken(newToken), retry original request once.
 * Keep refresh token in httpOnly cookie for better security.
 */
