const API = '/api';

export const getToken = () => {
  const adminPath = window.location.pathname.startsWith('/admin');
  if (adminPath) {
    return localStorage.getItem('nw-admin-token') || localStorage.getItem('nw-customer-token');
  }
  return localStorage.getItem('nw-customer-token') || localStorage.getItem('nw-admin-token');
};

export async function api(path, opts = {}) {
  const token = getToken();
  const headers = {
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
    ...(opts.headers || {})
  };

  if (!(opts.body instanceof FormData) && !headers['Content-Type'] && opts.body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}
