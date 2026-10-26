const TOKEN_KEY = 'seiftours_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch { /* réponse vide */ }

  if (res.status === 401 && path !== '/admin/login') onUnauthorized();

  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `Erreur ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}


export async function uploadFile(path, file, fields = {}) {
  const form = new FormData();
  form.append('file', file);
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));

  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${getToken()}` },
    body: form,                                   // pas de Content-Type : le navigateur le gère
  });

  let data = null;
  try { data = await res.json(); } catch { /* réponse vide */ }

  if (res.status === 401) onUnauthorized();
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `Erreur ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}