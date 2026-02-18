// API 基础地址
// 开发环境使用代理 /api，生产环境使用环境变量或默认值
const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const api = {
  // 获取商品列表
  getProducts: async (params = {}) => {
    try {
      const query = Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&')
      const res = await fetch(`${API_BASE}/products${query ? '?' + query : ''}`)
      return await res.json()
    } catch {
      return { code: 500, message: '网络请求失败' }
    }
  },

  // 获取分类列表
  getCategories: async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`)
      return await res.json()
    } catch {
      return { code: 500, message: '网络请求失败' }
    }
  },

  // 获取公告列表
  getAnnouncements: async () => {
    try {
      const res = await fetch(`${API_BASE}/announcements`)
      return await res.json()
    } catch {
      return { code: 500, message: '网络请求失败' }
    }
  },

  // 查询订单
  queryOrder: async (orderNo) => {
    try {
      const res = await fetch(`${API_BASE}/orders/query/${encodeURIComponent(orderNo)}`)
      return await res.json()
    } catch {
      return { code: 500, message: '网络请求失败' }
    }
  }
}

/**
 * 带认证的 fetch 封装
 * 自动携带 Bearer Token
 */
export async function authFetch(path, options = {}) {
  const token = localStorage.getItem('user_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
    })
    return await res.json()
  } catch {
    return { code: 500, message: '网络请求失败' }
  }
}

// 用户资料 API
export const profileApi = {
  // 获取当前用户资料
  get: () => authFetch('/users/profile'),
  // 更新资料 (nickname, avatarUrl)
  update: (data) => authFetch('/users/profile', { method: 'PATCH', body: data }),
  // 获取用户公开信息
  getPublic: (userId) => fetch(`${API_BASE}/users/${userId}/public`).then(r => r.json()).catch(() => ({ code: 500, message: '网络请求失败' })),
}

// 评价 API
export const reviewApi = {
  // 提交评价
  submit: (data) => authFetch('/reviews', { method: 'POST', body: data }),
  // 获取订单评价状态
  getByOrder: (orderId) => authFetch(`/reviews/order/${orderId}`),
  // 获取用户评价列表
  getByUser: (userId, page = 1) => authFetch(`/reviews/user/${userId}?page=${page}`),
}

export { API_BASE }
