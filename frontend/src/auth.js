const TOKEN_KEY = 'debugai.token';
const USER_KEY = 'debugai.user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch { return null; }
}

export function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  clearAuth();
  window.location.href = '/login.html';
}

/** Redirect to login if not authenticated. Call at top of protected pages. */
export function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

/** API helper that includes JWT token */
export async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearAuth();
    window.location.href = '/login.html';
    throw new Error('Session expired');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }
  return data;
}
