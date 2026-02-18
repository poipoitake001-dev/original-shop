import React, { useState } from 'react'
import { Search, FileQuestion, CheckCircle, Clock, Truck, XCircle, Package } from 'lucide-react'
import { OrderStorage } from '../utils/storage'

// API 基础地址
const API_BASE = import.meta.env.VITE_API_URL || '/api'

// API 查询订单
const queryOrderAPI = async (orderNo) => {
  try {
    const res = await fetch(`${API_BASE}/orders/query/${orderNo}`)
    return await res.json()
  } catch (err) {
    return { code: 500, message: '网络请求失败' }
  }
}

// 订单状态配置
const statusConfig = {
  pending: { label: '待支付', color: 'text-yellow-400 bg-yellow-400/10', icon: Clock },
  paid: { label: '已支付', color: 'text-green-400 bg-green-400/10', icon: CheckCircle },
  delivered: { label: '已发货', color: 'text-blue-400 bg-blue-400/10', icon: Truck },
  completed: { label: '已完成', color: 'text-green-400 bg-green-400/10', icon: CheckCircle },
  cancelled: { label: '已取消', color: 'text-red-400 bg-red-400/10', icon: XCircle }
}

const OrderTracker = ({ showToast }) => {
  const [orderNo, setOrderNo] = useState('')
  const [order, setOrder] = useState(null)
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState(null) // 'api' 或 'local'

  const handleSearch = async () => {
    if (!orderNo.trim()) {
      showToast('请输入订单号', 'error')
      return
    }

    setLoading(true)
    setOrder(null)
    setSource(null)

    // 先尝试从后端 API 查询
    const apiResult = await queryOrderAPI(orderNo.trim())
    
    if (apiResult.code === 200 && apiResult.data) {
      // 从数据库找到订单
      setOrder({
        id: apiResult.data.order_no,
        email: apiResult.data.email,
        total: parseFloat(apiResult.data.total_price).toFixed(2),
        items: [{
          name: apiResult.data.product_title,
          quantity: apiResult.data.quantity,
          icon: '📦'
        }],
        date: apiResult.data.created_at,
        status: apiResult.data.status,
        spec: apiResult.data.spec
      })
      setSource('api')
    } else {
      // 如果 API 没找到，尝试从 LocalStorage 查询（兼容旧订单）
      const localOrders = OrderStorage.getAll()
      const localOrder = localOrders.find(o => o.id === orderNo.trim())
      
      if (localOrder) {
        setOrder(localOrder)
        setSource('local')
      }
    }

    setSearched(true)
    setLoading(false)

    if (!order && apiResult.code !== 200) {
      // 如果两边都没找到
      const localOrders = OrderStorage.getAll()
      const localOrder = localOrders.find(o => o.id === orderNo.trim())
      if (!localOrder) {
        showToast('未找到订单', 'error')
      }
    }
  }

  const status = order ? (statusConfig[order.status] || statusConfig.paid) : null
  const StatusIcon = status?.icon || CheckCircle

  return (
    <div className="bg-dark-card rounded-2xl p-6 border border-dark-border">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Search size={20} />
        订单追踪
      </h3>

      <div className="space-y-3 mb-4">
        <input
          type="text"
          placeholder="输入订单号 (如: ORD-xxx 或 SC-xxx)"
          value={orderNo}
          onChange={e => setOrderNo(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSearch()}
          className="w-full h-11 px-4 bg-dark-input border border-dark-border rounded-xl text-white placeholder-slate-500 outline-none focus:border-primary transition-colors"
        />
      </div>

      <button
        onClick={handleSearch}
        disabled={loading}
        className="w-full h-11 bg-primary hover:bg-primary-hover rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? (
          <span>查询中...</span>
        ) : (
          <>
            <Search size={18} />
            查询订单
          </>
        )}
      </button>

      {/* 订单结果 */}
      {searched && order && (
        <div className="mt-5 p-4 bg-dark-input rounded-xl animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 font-mono">{order.id}</span>
            <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${status.color}`}>
              <StatusIcon size={12} />
              {status.label}
            </span>
          </div>
          
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{item.icon || '📦'}</span>
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-slate-400">× {item.quantity}</p>
              </div>
            </div>
          ))}
          
          {order.email && (
            <div className="text-sm text-slate-400 mb-2">
              邮箱: <span className="text-white">{order.email}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center pt-3 border-t border-dark-border">
            <span className="text-sm text-slate-400">
              {new Date(order.date).toLocaleString('zh-CN')}
            </span>
            <span className="text-lg font-bold text-primary">¥{order.total}</span>
          </div>
          
          {source === 'api' && (
            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
              <CheckCircle size={12} />
              订单已同步到服务器
            </p>
          )}
        </div>
      )}

      {searched && !order && !loading && (
        <div className="mt-5 text-center py-6 text-slate-500">
          <FileQuestion size={32} className="mx-auto mb-2 opacity-50" />
          <p>未找到匹配的订单</p>
          <p className="text-xs mt-1">请检查订单号是否正确</p>
        </div>
      )}
    </div>
  )
}

export default OrderTracker
