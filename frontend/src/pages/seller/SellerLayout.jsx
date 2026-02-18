import React, { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, NavLink, useNavigate, Link } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, Wallet, ArrowLeft, Menu, X, Store, LogOut, MessageCircle, Settings } from 'lucide-react'
import { authFetch } from '../../utils/api'

const SellerDashboard = lazy(() => import('./SellerDashboard'))
const SellerProducts = lazy(() => import('./SellerProducts'))
const SellerOrders = lazy(() => import('./SellerOrders'))
const SellerWallet = lazy(() => import('./SellerWallet'))

const navItems = [
  { path: '/seller', label: '仪表盘', icon: LayoutDashboard, end: true },
  { path: '/seller/products', label: '我的商品', icon: Package },
  { path: '/seller/orders', label: '我的订单', icon: ShoppingCart },
  { path: '/seller/wallet', label: '钱包', icon: Wallet },
  { path: '/user/messages', label: '消息', icon: MessageCircle },
  { path: '/account/profile', label: '账号设置', icon: Settings },
]

const SellerLayout = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const savedUser = localStorage.getItem('user_info')
    if (!savedUser) {
      navigate('/')
      return
    }
    const u = JSON.parse(savedUser)
    
    // If localStorage already says seller/admin, use it immediately
    if (u.role === 'seller' || u.role === 'admin') {
      setUser(u)
      return
    }
    
    // Otherwise, check server and refresh token (role may have been updated by admin)
    authFetch('/customer/refresh-token', { method: 'POST' }).then(res => {
      if (res.code === 200 && res.data) {
        const newUser = res.data.user
        if (newUser.role === 'seller' || newUser.role === 'admin') {
          // Update both token and user info in localStorage
          localStorage.setItem('user_token', res.data.token)
          localStorage.setItem('user_info', JSON.stringify(newUser))
          setUser(newUser)
        } else {
          navigate('/apply-seller')
        }
      } else {
        navigate('/apply-seller')
      }
    }).catch(() => {
      navigate('/apply-seller')
    })
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('user_info')
    localStorage.removeItem('user_token')
    navigate('/')
  }

  if (!user) return null

  const Loading = () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-gray-900 border-r border-gray-800 fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="p-5 border-b border-gray-800">
          <Link to="/seller" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Store size={20} />
            </div>
            <div>
              <h1 className="font-bold text-sm">卖家中心</h1>
              <p className="text-xs text-gray-500">{user.username}</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-gray-800 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={18} />
            返回商城
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 transition-colors"
          >
            <LogOut size={18} />
            退出登录
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Store size={20} />
                </div>
                <span className="font-bold text-sm">卖家中心</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="p-3 border-t border-gray-800">
              <Link to="/" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800">
                <ArrowLeft size={18} />
                返回商城
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Top bar - Mobile */}
        <header className="lg:hidden bg-gray-900/80 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20 backdrop-blur-sm">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">
            <Menu size={22} />
          </button>
          <span className="font-semibold text-sm">卖家中心</span>
          <Link to="/" className="text-gray-400 hover:text-white text-xs">商城</Link>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route index element={<SellerDashboard />} />
              <Route path="products" element={<SellerProducts />} />
              <Route path="orders" element={<SellerOrders />} />
              <Route path="wallet" element={<SellerWallet />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default SellerLayout
