// Tiny fetch wrapper: attaches the access token and workspace header, and on a 401
// silently refreshes the session once (via the httpOnly cookie) and retries.
let accessToken = null;
let workspaceId = null;
let refreshing = null;
let onAuthLost = () => {};

export const setAccessToken = (t) => { accessToken = t; };
export const setWorkspaceId = (id) => { workspaceId = id; };
export const setAuthLostHandler = (fn) => { onAuthLost = fn; };

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
  /** First field-level message if the server sent one, else the general message. */
  get friendly() { return this.details?.[0]?.message || this.message; }
}

function send(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (auth && workspaceId) headers['X-Workspace-Id'] = workspaceId;
  return fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

async function parse(res) {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Something went wrong', data.details);
  return data;
}

/** Returns the new session payload, or null if there is no valid refresh cookie. Concurrent calls share one request. */
export function refreshSession() {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST' })
    .then(async (r) => {
      if (!r.ok) return null;
      const data = await r.json();
      accessToken = data.accessToken;
      return data;
    })
    .catch(() => null)
    .finally(() => { refreshing = null; });
  return refreshing;
}

export async function api(path, opts = {}) {
  let res = await send(path, opts);
  if (res.status === 401 && opts.auth !== false) {
    if (await refreshSession()) res = await send(path, opts);
    else onAuthLost();
  }
  return parse(res);
}
