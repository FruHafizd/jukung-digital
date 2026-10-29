import { store } from './store.js';

async function request(method, url, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch('/api' + url, opts);
  } catch (e) {
    store.toast('Server aplikasi tidak merespons. Pastikan start.bat masih berjalan.', true);
    throw e;
  }
  if (!res.ok) {
    let msg = `Terjadi kesalahan (${res.status}).`;
    try {
      const data = await res.json();
      if (data.detail) msg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } catch (_) { /* bukan JSON */ }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body = {}) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  del: (url) => request('DELETE', url),
};

export function qs(params) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined && v !== false) p.set(k, v === true ? '1' : v);
  });
  const s = p.toString();
  return s ? '?' + s : '';
}
