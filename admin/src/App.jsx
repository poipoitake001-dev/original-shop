import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Users, Settings,
  LogOut, Menu, X, Bell, Search, TrendingUp, DollarSign,
  ShoppingBag, UserCheck, AlertCircle, CheckCircle, Clock,
  Eye, Edit, Trash2, Plus, RefreshCw, Filter, MoreHorizontal,
  ChevronDown, ChevronUp, Save, Image, Tag, Layers, CreditCard,
  FileText, MessageSquare, Shield, Megaphone
} from 'lucide-react'
import { adminRequest, getToken, setToken, clearToken } from './utils/api'

// ==================== 登录页面 ====================
const LoginPage = ({ onLogin }) => {
  const [form, setForm] = useState({ account: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.account || !form.password) {
      setError('请输入账号和密码')
      return
    }
    setLoading(true)
    setError('')
    
    const res = await adminRequest('/admin/login', {
      method: 'POST',
      body: JSON.stringify(form)
    })
    
    setLoading(false)
    if (res.code === 200 && res.token) {
      setToken(res.token)
      onLogin()
    } else {
      setError(res.message || '登录失败')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-700">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">管理后台</h1>
            <p className="text-slate-400 mt-2">Space Card Shop</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">管理员账号</label>
              <input
                type="text"
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                placeholder="请输入账号"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">密码</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                placeholder="请输入密码"
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            默认账号: admin / admin123
          </p>
        </div>
      </div>
    </div>
  )
}

// ==================== 仪表盘 ====================
const Dashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalUsers: 0,
    todayOrders: 0,
    todayRevenue: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    const res = await adminRequest('/admin/stats')
    if (res.code === 200) {
      setStats(res.data || {})
    }
    setLoading(false)
  }

  const statCards = [
    { label: '总订单数', value: stats.totalOrders || 0, icon: ShoppingCart, color: 'bg-blue-500' },
    { label: '总收入', value: `¥${(stats.totalRevenue || 0).toFixed(2)}`, icon: DollarSign, color: 'bg-green-500' },
    { label: '商品数量', value: stats.totalProducts || 0, icon: Package, color: 'bg-purple-500' },
    { label: '用户数量', value: stats.totalUsers || 0, icon: Users, color: 'bg-orange-500' },
    { label: '今日订单', value: stats.todayOrders || 0, icon: TrendingUp, color: 'bg-cyan-500' },
    { label: '今日收入', value: `¥${(stats.todayRevenue || 0).toFixed(2)}`, icon: CreditCard, color: 'bg-pink-500' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">仪表盘</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">{card.label}</p>
                <p className="text-2xl font-bold mt-1">{loading ? '...' : card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}>
                <card.icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================== 订单管理 ====================
const OrdersPage = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    const res = await adminRequest('/admin/orders')
    if (res.code === 200) {
      setOrders(res.data || [])
    }
    setLoading(false)
  }

  const statusMap = {
    pending: { text: '待支付', cls: 'bg-yellow-500/20 text-yellow-400' },
    paid: { text: '已支付', cls: 'bg-green-500/20 text-green-400' },
    completed: { text: '已完成', cls: 'bg-blue-500/20 text-blue-400' },
    cancelled: { text: '已取消', cls: 'bg-red-500/20 text-red-400' },
    refunded: { text: '已退款', cls: 'bg-gray-500/20 text-gray-400' },
  }

  const filteredOrders = orders.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false
    if (search && !o.order_no?.includes(search) && !o.contact?.includes(search)) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">订单管理</h1>
        <button onClick={loadOrders} className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">
          <RefreshCw size={16} /> 刷新
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="搜索订单号/联系方式"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-48"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">全部状态</option>
          <option value="pending">待支付</option>
          <option value="paid">已支付</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">订单号</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">商品</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">金额</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">状态</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">时间</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">加载中...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">暂无订单</td></tr>
            ) : filteredOrders.map(order => (
              <tr key={order.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                <td className="px-4 py-3 text-sm font-mono">{order.order_no}</td>
                <td className="px-4 py-3 text-sm">{order.product_title || order.title}</td>
                <td className="px-4 py-3 text-sm text-green-400">¥{parseFloat(order.total_amount || 0).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${statusMap[order.status]?.cls || 'bg-slate-600'}`}>
                    {statusMap[order.status]?.text || order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">{order.created_at?.slice(0, 16)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ==================== 商品管理 ====================
const ProductsPage = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    const res = await adminRequest('/admin/products')
    if (res.code === 200) {
      setProducts(res.data || [])
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除该商品？')) return
    const res = await adminRequest(`/admin/products/${id}`, { method: 'DELETE' })
    if (res.code === 200) {
      loadProducts()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">商品管理</h1>
        <button onClick={loadProducts} className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">
          <RefreshCw size={16} /> 刷新
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">商品</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">价格</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">库存</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">销量</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">状态</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">加载中...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">暂无商品</td></tr>
            ) : products.map(p => (
              <tr key={p.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.image_url && <img src={p.image_url} className="w-10 h-10 rounded object-cover" />}
                    <span className="text-sm">{p.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-green-400">¥{parseFloat(p.price || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm">{p.stock || 0}</td>
                <td className="px-4 py-3 text-sm">{p.sales || 0}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${p.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {p.status === 'active' ? '上架' : '下架'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ==================== 用户管理 ====================
const UsersPage = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    const res = await adminRequest('/admin/users')
    if (res.code === 200) {
      setUsers(res.data || [])
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <button onClick={loadUsers} className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">
          <RefreshCw size={16} /> 刷新
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">用户</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">邮箱</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">角色</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">注册时间</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">加载中...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">暂无用户</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm">
                      {(u.username || u.nickname || 'U')[0].toUpperCase()}
                    </div>
                    <span className="text-sm">{u.username || u.nickname || '未知'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">{u.email || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : u.role === 'seller' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-600 text-slate-300'}`}>
                    {u.role === 'admin' ? '管理员' : u.role === 'seller' ? '卖家' : '用户'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">{u.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ==================== 分类管理 ====================
const CategoriesPage = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setLoading(true)
    const res = await adminRequest('/admin/categories')
    if (res.code === 200) {
      setCategories(res.data || [])
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">分类管理</h1>
        <button onClick={loadCategories} className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">
          <RefreshCw size={16} /> 刷新
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-slate-400">加载中...</p>
        ) : categories.length === 0 ? (
          <p className="text-slate-400">暂无分类</p>
        ) : categories.map(cat => (
          <div key={cat.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{cat.icon || '📦'}</span>
              <div>
                <h3 className="font-medium">{cat.name}</h3>
                <p className="text-sm text-slate-400">{cat.slug}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================== 设置页面 ====================
const SettingsPage = () => {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    const res = await adminRequest('/admin/settings')
    if (res.code === 200) {
      setSettings(res.data || {})
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await adminRequest('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
    setSaving(false)
    if (res.code === 200) {
      alert('保存成功')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">系统设置</h1>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save size={16} /> {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">加载中...</p>
      ) : (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">站点名称</label>
            <input
              type="text"
              value={settings.site_name || ''}
              onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">站点描述</label>
            <textarea
              value={settings.site_description || ''}
              onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg h-24"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">联系邮箱</label>
            <input
              type="email"
              value={settings.contact_email || ''}
              onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== 主布局 ====================
const AdminLayout = ({ onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const navigate = useNavigate()

  const navItems = [
    { path: '/', label: '仪表盘', icon: LayoutDashboard },
    { path: '/orders', label: '订单管理', icon: ShoppingCart },
    { path: '/products', label: '商品管理', icon: Package },
    { path: '/users', label: '用户管理', icon: Users },
    { path: '/categories', label: '分类管理', icon: Layers },
    { path: '/settings', label: '系统设置', icon: Settings },
  ]

  const handleLogout = () => {
    clearToken()
    onLogout()
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* 侧边栏 */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-800 border-r border-slate-700 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Shield size={24} className="text-white" />
            </div>
            {sidebarOpen && <span className="font-bold text-lg">管理后台</span>}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 w-full"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>退出登录</span>}
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

// ==================== 主应用 ====================
const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!getToken())

  return (
    <BrowserRouter>
      {isLoggedIn ? (
        <AdminLayout onLogout={() => setIsLoggedIn(false)} />
      ) : (
        <LoginPage onLogin={() => setIsLoggedIn(true)} />
      )}
    </BrowserRouter>
  )
}

export default App
