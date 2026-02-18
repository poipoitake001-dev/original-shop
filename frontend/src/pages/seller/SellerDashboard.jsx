import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, ShoppingCart, Wallet, Clock, Plus, ArrowRight, TrendingUp } from 'lucide-react'
import { authFetch } from '../../utils/api'

const SellerDashboard = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/seller/dashboard').then(res => {
      if (res.code === 200) setData(res.data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-center text-gray-400 py-12">加载失败</div>
  }

  const stats = [
    {
      label: '商品总数',
      value: data.products?.total || 0,
      sub: `${data.products?.live || 0} 在售`,
      icon: Package,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: '待审核',
      value: data.products?.pending || 0,
      sub: `${data.products?.rejected || 0} 被拒绝`,
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      label: '总收入',
      value: `¥${parseFloat(data.orders?.total_earnings || 0).toFixed(2)}`,
      sub: `${data.orders?.total_orders || 0} 笔订单`,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: '钱包余额',
      value: `¥${parseFloat(data.wallet?.balance || 0).toFixed(2)}`,
      sub: `冻结 ¥${parseFloat(data.wallet?.frozen_balance || 0).toFixed(2)}`,
      icon: Wallet,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ]

  const statusMap = {
    pending: { text: '待支付', cls: 'text-yellow-400 bg-yellow-500/10' },
    paid: { text: '已支付', cls: 'text-blue-400 bg-blue-500/10' },
    delivered: { text: '已发货', cls: 'text-emerald-400 bg-emerald-500/10' },
    completed: { text: '已完成', cls: 'text-green-400 bg-green-500/10' },
    cancelled: { text: '已取消', cls: 'text-gray-400 bg-gray-500/10' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">仪表盘</h1>
        <Link
          to="/seller/products"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          发布商品
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>
                <s.icon size={20} className={s.color} />
              </div>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            <p className="text-xs text-gray-600 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold">最近订单</h2>
          <Link to="/seller/orders" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            查看全部 <ArrowRight size={14} />
          </Link>
        </div>
        {data.recentOrders && data.recentOrders.length > 0 ? (
          <div className="divide-y divide-gray-800">
            {data.recentOrders.map(order => {
              const st = statusMap[order.status] || statusMap.pending
              return (
                <div key={order.id} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{order.product_title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">#{order.order_no}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-medium">¥{parseFloat(order.seller_amount || 0).toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">暂无订单</div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/seller/products" className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors group">
          <Package size={24} className="text-blue-400 mb-3" />
          <h3 className="font-semibold mb-1">管理商品</h3>
          <p className="text-sm text-gray-500">添加、编辑商品和管理卡密库存</p>
        </Link>
        <Link to="/seller/wallet" className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors group">
          <Wallet size={24} className="text-purple-400 mb-3" />
          <h3 className="font-semibold mb-1">钱包提现</h3>
          <p className="text-sm text-gray-500">查看余额、交易流水和申请提现</p>
        </Link>
      </div>
    </div>
  )
}

export default SellerDashboard
