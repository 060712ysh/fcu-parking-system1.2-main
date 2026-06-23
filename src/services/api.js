const API_BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'API 請求失敗')
  return data
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  parking: (params) => request(`/parking?${new URLSearchParams(params)}`),
  hotspots: () => request('/tow-hotspots'),
  reports: () => request('/reports'),
  report: (body) => request('/reports', { method: 'POST', body: JSON.stringify(body) }),
  favorites: (userId) => request(`/users/${userId}/favorites`),
  addFavorite: (userId, parkingLotId) => request(`/users/${userId}/favorites`, { method: 'POST', body: JSON.stringify({ parkingLotId }) }),
  removeFavorite: (userId, parkingLotId) => request(`/users/${userId}/favorites/${parkingLotId}`, { method: 'DELETE' }),
  carLocation: (userId) => request(`/users/${userId}/car-location`),
  saveCarLocation: (userId, body) => request(`/users/${userId}/car-location`, { method: 'POST', body: JSON.stringify(body) }),
  clearCarLocation: (userId) => request(`/users/${userId}/car-location`, { method: 'DELETE' }),
  reserve: (body) => request('/reservations', { method: 'POST', body: JSON.stringify(body) }),
  transactions: (userId) => request(`/users/${userId}/transactions`),
  adminStats: () => request('/admin/stats'),
  adminCreateParking: (body) => request('/admin/parking', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateParking: (id, body) => request(`/admin/parking/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  adminDeleteParking: (id) => request(`/admin/parking/${id}`, { method: 'DELETE' }),
}
