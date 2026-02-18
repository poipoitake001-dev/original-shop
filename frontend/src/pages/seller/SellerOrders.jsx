import React, { useState, useEffect } from 'react'
import { ShoppingCart, TrendingUp, Filter } from 'lucide-react'
import { authFetch } from '../../utils/api'

const statusMap = {
  pending: { text: '待支付', cls: 'bg-yellow-500/10 text-yellow-400' },
  paid: { text: '已支付', cls: 'bg-blue-500/10 text-blue-400' },
  delivered: { text: '已发货', cls: 'bg-cyan-500/10 text-cyan-400' },
  completed: { text: '已完成', cls: 'bg-emerald-500/10 text-emerald-400' },
  cancelled: { text: '已取消', cls: 'bg-gray-500/10 text-gray-400' },
}

const SellerOrders = () => {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 15

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit })
    if (filter) params.set('status', filter)

    Promise.all([
      authFetch(`/seller/orders?${params}`),
      authFetch('/seller/orders/stats'),
    ]).then(([ordersRes, statsRes]) => {
      if (ordersRes.code === 200) {
        setOrders(ordersRes.data.list || [])
        setTotal(ordersRes.data.total || 0)
      }
      if (statsRes.code === 200) setStats(statsRes.data)
      setLoading(false)
    })
  }, [page, filter])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">我的订单</h1>

      {/* Revenue Summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">总订单</p>
            <p className="text-xl font-bold">{stats.total_orders || 0}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">总收入</p>
            <p className="text-xl font-bold text-emerald-400">¥{parseFloat(stats.total_revenue || 0).toFixed(2)}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">净收入</p>
            <p className="text-xl font-bold text-blue-400">¥{parseFloat(stats.total_earnings || 0).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={16} className="text-gray-400" />
        {[
          { value: '', label: '全部' },
          { value: 'pending', label: '待支付' },
          { value: 'paid', label: '已支付' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <ShoppingCart size={48} className="mx-auto mb-4 opacity-30" />
          <p>暂无订单</p>
        </div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs">
                    <th className="px-4 py-3 text-left font-medium">订单号</th>
                    <th className="px-4 py-3 text-left font-medium">商品</th>
                    <th className="px-4 py-3 text-left font-medium">买家</th>
                    <th className="px-4 py-3 text-right font-medium">金额</th>
                    <th className="px-4 py-3 text-right font-medium">佣金</th>
                    <th className="px-4 py-3 text-right font-medium">净收入</th>
                    <th className="px-4 py-3 text-center font-medium">状态</th>
                    <th className="px-4 py-3 text-right font-medium">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {orders.map(order => {
                    const st = statusMap[order.status] || statusMap.pending
                    return (
                      <tr key={order.id} className="hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">#{order.order_no?.slice(-8)}</td>
                        <td className="px-4 py-3 truncate max-w-[200px]">{order.product_title}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{order.email}</td>
                        <td className="px-4 py-3 text-right">¥{parseFloat(order.total_price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-yellow-400 text-xs">-¥{parseFloat(order.commission_amount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-emerald-400">¥{parseFloat(order.seller_amount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs">
                          {new Date(order.created_at).toLocaleDateString('zh-CN')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm disabled:opacity-30 hover:bg-gray-700 transition-colors"
              >
                上一页
              </button>
              <span className="text-sm text-gray-400">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm disabled:opacity-30 hover:bg-gray-700 transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default SellerOrders
