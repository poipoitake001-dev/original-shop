const API_BASE = import.meta.env.VITE_API_URL || '/api'

// 获取token
export const getToken = () => localStorage.getItem('admin_token')
export const setToken = (token) => localStorage.setItem('admin_token', token)
export const clearToken = () => localStorage.removeItem('admin_token')

// API请求封装
export const adminRequest = async (url, options = {}) => {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  
  try {
    const res = await fetch(API_BASE + url, { ...options, headers })
    const data = await res.json()
    return data
  } catch (err) {
    return { code: 500, message: '网络请求失败' }
  }
}

export { API_BASE }
