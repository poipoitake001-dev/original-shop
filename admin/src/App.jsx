import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Users, Settings,
  LogOut, Shield, Layers, RefreshCw, Plus, Trash2, Search
} from 'lucide-react'
import { adminRequest, getToken, setToken, clearToken } from './utils/api'
import { LoginPage, Dashboard, OrdersPage } from './pages/index'
import ProductsPage from './pages/ProductsPage'

// ==================== 分类管理 ====================
const CategoriesPage = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', icon: '📁', sort_order: 0 })

  useEffect(() => { loadCategories() }, [])

  const loadCategories = async () => {
    setLoading(true)
    const res = await adminRequest('/admin/categories')
    if (res.code === 200) setCategories(res.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.slug) { alert('请填写分类名称和标识'); return }
    const res = await adminRequest('/admin/categories', { method: 'POST', body: JSON.stringify(form) })
    if (res.code === 200) {
      setShowForm(false)
      setForm({ name: '', slug: '', icon: '📁', sort_order: 0 })
      loadCategories()
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除该分类？')) return
    const res = await adminRequest(`/admin/categories/${id}`, { method: 'DELETE' })
    if (res.code === 200) loadCategories()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">分类管理</h1>
        <div className="flex gap-2">
          <button onClick={loadCategories} className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">
            <RefreshCw size={16} /> 刷新
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700">
            <Plus size={16} /> 添加分类
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm text-slate-400 mb-1">名称</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg w-40" placeholder="分类名称" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">标识</label>
              <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg w-32" placeholder="slug" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">图标</label>
              <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg w-20" />
            </div>
            <button type="submit" className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700">保存</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-600 rounded-lg hover:bg-slate-500">取消</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-slate-400">加载中...</p>
        ) : categories.length === 0 ? (
          <p className="text-slate-400">暂无分类</p>
        ) : categories.map(cat => (
          <div key={cat.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{cat.icon || '📦'}</span>
              <div>
                <h3 className="font-medium">{cat.name}</h3>
                <p className="text-sm text-slate-400">{cat.slug}</p>
              </div>
            </div>
            <button onClick={() => handleDelete(cat.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================== 用户管理 ====================
const UsersPage = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    const res = await adminRequest('/admin/users')
    if (res.code === 200) setUsers(res.data || [])
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
                      {(u.username || 'U')[0].toUpperCase()}
                    </div>
                    <span className="text-sm">{u.username || u.nickname || '未知'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">{u.email || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-600 text-slate-300'}`}>
                    {u.role === 'admin' ? '管理员' : '用户'}
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

// ==================== 设置页面 ====================
const SettingsPage = () => {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    setLoading(true)
    const res = await adminRequest('/admin/settings')
    if (res.code === 200) setSettings(res.data || {})
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await adminRequest('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) })
    setSaving(false)
    if (res.code === 200) alert('保存成功')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">系统设置</h1>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
      {loading ? (
        <p className="text-slate-400">加载中...</p>
      ) : (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4 max-w-xl">
          <div>
            <label className="block text-sm text-slate-400 mb-2">站点名称</label>
            <input type="text" value={settings.site_name || ''} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">站点描述</label>
            <textarea value={settings.site_description || ''} onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg h-24" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">联系邮箱</label>
            <input type="email" value={settings.contact_email || ''} onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg" />
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== 主布局 ====================
const AdminLayout = ({ onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const navItems = [
    { path: '/', label: '仪表盘', icon: LayoutDashboard },
    { path: '/orders', label: '订单管理', icon: ShoppingCart },
    { path: '/products', label: '商品管理', icon: Package },
    { path: '/categories', label: '分类管理', icon: Layers },
    { path: '/users', label: '用户管理', icon: Users },
    { path: '/settings', label: '系统设置', icon: Settings },
  ]

  const handleLogout = () => { clearToken(); onLogout() }

  return (
    <div className="min-h-screen bg-slate-900 flex">
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
            <NavLink key={item.path} to={item.path} end={item.path === '/'}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 w-full">
            <LogOut size={20} />
            {sidebarOpen && <span>退出登录</span>}
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/users" element={<UsersPage />} />
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
