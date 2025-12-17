const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password) => request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMenu: () => request('/api/menu'),
  createMenuItem: (item) => request('/api/menu', { method: 'POST', body: JSON.stringify(item) }),
  updateMenuItem: (id, item) => request(`/api/menu/${id}`, { method: 'PUT', body: JSON.stringify(item) }),
  getQueue: () => request('/api/orders/queue'),
  createOrder: (order) => request('/api/orders', { method: 'POST', body: JSON.stringify(order) }),
  validateOrder: (id) => request(`/api/orders/${id}/validate`, { method: 'POST' }),
  markReady: (id) => request(`/api/orders/${id}/ready`, { method: 'POST' }),
  markServed: (id) => request(`/api/orders/${id}/served`, { method: 'POST' }),
  uploadImage: async (file) => {
    const token = localStorage.getItem('admin_token');
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${API_URL}/api/uploads`, {
      method: 'POST',
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  }
};

export { API_URL };
