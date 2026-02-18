// LocalStorage 订单管理
const ORDERS_STORAGE_KEY = 'ecommerce_orders'

export const OrderStorage = {
  getAll: () => {
    try {
      return JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY)) || []
    } catch {
      return []
    }
  },
  save: (order) => {
    const orders = OrderStorage.getAll()
    orders.unshift(order)
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders))
  },
  find: (orderId, email) => {
    const orders = OrderStorage.getAll()
    return orders.find(o => o.id === orderId && o.email.toLowerCase() === email.toLowerCase())
  }
}

// 生成唯一订单ID
export const generateOrderId = () => `ORD-${Date.now()}`

// 邮箱验证正则
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// 默认库存限制
export const STOCK_LIMIT = 10
