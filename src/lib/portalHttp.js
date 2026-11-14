const KEY = 'seiftours_portal_token';
export const getPortalToken = () => localStorage.getItem(KEY);
export const setPortalToken = (t) => localStorage.setItem(KEY, t);
export const clearPortalToken = () => localStorage.removeItem(KEY);

export async function portalApi(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  const t = getPortalToken();
  if (auth && t) headers.Authorization = `Bearer ${t}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch { /* vide */ }
  if (res.status === 401 && auth) clearPortalToken();
  if (!res.ok) {
    const err = new Error(data?.message || `Erreur ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}