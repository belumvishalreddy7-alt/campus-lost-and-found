/* Thin fetch wrapper around the REST API + client-side session handling. */

const TOKEN_KEY = 'clf.token';
const USER_KEY = 'clf.user';

export const session = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  get user() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  get isLoggedIn() {
    return Boolean(this.token);
  },
  get isAdmin() {
    return this.user?.role === 'admin';
  },
  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

/**
 * Call the API.
 * @param {string} path e.g. '/items?q=wallet'
 * @param {{method?: string, body?: object, form?: FormData}} options
 */
export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  if (session.token) headers.Authorization = `Bearer ${session.token}`;

  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload });
  } catch {
    const offline = new Error('Cannot reach the server. Check your connection and try again.');
    offline.status = 0;
    throw offline;
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 401 && session.isLoggedIn) session.clear();
    const error = new Error(data?.message || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const Auth = {
  signup: (payload) => api('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => api('/auth/login', { method: 'POST', body: payload }),
  me: () => api('/auth/me'),
  logout: () => api('/auth/logout', { method: 'POST' }).catch(() => null),
};

export const Items = {
  list: (params = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, value);
    });
    const query = search.toString();
    return api(`/items${query ? `?${query}` : ''}`);
  },
  get: (id) => api(`/items/${id}`),
  create: (body) => api('/items', { method: 'POST', body }),
  createWithImage: (form) => api('/items', { method: 'POST', form }),
  update: (id, body) => api(`/items/${id}`, { method: 'PUT', body }),
  remove: (id) => api(`/items/${id}`, { method: 'DELETE' }),
  mine: () => api('/users/me/items'),
};

export const Claims = {
  create: (body) => api('/claims', { method: 'POST', body }),
  mine: () => api('/users/me/claims'),
  decide: (id, status) => api(`/claims/${id}`, { method: 'PATCH', body: { status } }),
};

export const Admin = {
  stats: () => api('/admin/stats'),
  items: (params = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });
    return api(`/admin/items?${search.toString()}`);
  },
  claims: (params = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });
    return api(`/admin/claims?${search.toString()}`);
  },
  users: () => api('/admin/users'),
  meta: () => api('/meta'),
};
