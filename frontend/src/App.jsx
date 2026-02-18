import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { Routes, Route, useNavigate, Link } from 'react-router-dom'
import { ShoppingBag, Rocket, Menu, X, User, LogOut, Package, Search, Zap, Shield, Award, CreditCard, Store, Bell } from 'lucide-react'
import { api } from './utils/api'
import { STOCK_LIMIT } from './utils/storage'
import Toast from './components/Toast'
import ProductCard from './components/ProductCard'
import PurchaseModal from './components/PurchaseModal'
import FloatingServiceWidget from './components/FloatingServiceWidget'
import HeroBanner from './components/HeroBanner'
import SearchFilter from './components/SearchFilter'
import EmptyState from './components/EmptyState'
import AuthModal from './components/AuthModal'
import MyOrdersModal from './components/MyOrdersModal'
import CoreFeatures from './components/CoreFeatures'

// 懒加载页面
const SellerLayout = lazy(() => import('./pages/seller/SellerLayout'))
const AccountLayout = lazy(() => import('./pages/account/AccountLayout'))
const PublicProfile = lazy(() => import('./pages/PublicProfile'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const ApplySellerPage = lazy(() => import('./pages/ApplySellerPage'))
const UserMessages = lazy(() => import('./pages/UserMessages'))
const InfoPage = lazy(() => import('./pages/InfoPage'))

// 路由入口组件
const App = () => {
  return (
    <Routes>
      <Route path="/seller/*" element={
        <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>}>
          <SellerLayout />
        </Suspense>
      } />
      <Route path="/account/*" element={
        <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>}>
          <AccountLayout />
        </Suspense>
      } />
      <Route path="/u/:userId" element={
        <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>}>
          <PublicProfile />
        </Suspense>
      } />
      <Route path="/p/:id" element={
        <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>}>
          <ProductDetail />
        </Suspense>
      } />
      <Route path="/apply-seller" element={
        <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>}>
          <ApplySellerPage />
        </Suspense>
      } />
      <Route path="/user/messages" element={
        <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>}>
          <UserMessages />
        </Suspense>
      } />
      <Route path="/pages/:slug" element={
        <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>}>
          <InfoPage />
        </Suspense>
      } />
      <Route path="/*" element={<StorefrontPage />} />
    </Routes>
  )
}

// 原有的商城前台页面
const StorefrontPage = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [toast, setToast] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  // 从服务端注入的 window.__SITE_CONFIG__ 立即读取，避免闪烁
  const [siteConfig, setSiteConfig] = useState(() => {
    const injected = window.__SITE_CONFIG__
    if (injected) {
      // 立即设置标题和favicon，不等待API
      if (injected.pageTitle || injected.siteName) {
        document.title = injected.pageTitle || injected.siteName
      }
      if (injected.faviconUrl) {
        const link = document.querySelector("link[rel='icon']")
        if (link) link.href = injected.faviconUrl
      }
      return {
        site_name: injected.siteName,
        page_title: injected.pageTitle,
        favicon_url: injected.faviconUrl,
        site_logo_url: injected.siteLogo,
        theme_color: injected.primary,
        bg_color: injected.bg,
        default_product_image: injected.defaultImg,
        contact_email: injected.contactEmail,
        support_hours: injected.supportHours,
        footer_description: injected.footerDesc,
      }
    }
    return null
  })
  
  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  
  // 用户认证状态
  const [user, setUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showOrdersModal, setShowOrdersModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)
  const [showOrderLookup, setShowOrderLookup] = useState(false)
  
  // 订单追踪状态
  const [trackingOrderNo, setTrackingOrderNo] = useState('')
  const [trackingLoading, setTrackingLoading] = useState(false)

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
  }, [])

  // 加载商品
  const loadProducts = async () => {
    setLoading(true)
    setError(false)
    const result = await api.getProducts({ status: 1 })
    setLoading(false)
    
    if (result.code === 200) {
      const productsWithStock = (result.data?.list || []).map(p => ({
        ...p,
        stock: p.stock ?? STOCK_LIMIT
      }))
      setProducts(productsWithStock)
    } else {
      setError(true)
      showToast('加载商品失败', 'error')
    }
  }

  useEffect(() => {
    loadProducts()
    // 加载站点配置
    fetch('/api/settings/public').then(r => r.json()).then(res => {
      if (res.code === 200 && res.data) {
        setSiteConfig(res.data)
        // 动态设置主题色 CSS 变量
        if (res.data.theme_color) {
          document.documentElement.style.setProperty('--primary', res.data.theme_color)
        }
        if (res.data.bg_color) {
          document.documentElement.style.setProperty('--bg-color', res.data.bg_color)
          document.body.style.backgroundColor = res.data.bg_color
        }
        // 动态设置页面标题
        if (res.data.page_title) {
          document.title = res.data.page_title
        } else if (res.data.site_name) {
          document.title = res.data.site_name
        }
        // 动态设置 favicon
        if (res.data.favicon_url) {
          let link = document.querySelector("link[rel='icon']")
          if (link) { link.href = res.data.favicon_url }
        }
      }
    }).catch(() => {})
    // 检查本地存储的用户信息
    const savedUser = localStorage.getItem('user_info')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        localStorage.removeItem('user_info')
        localStorage.removeItem('user_token')
      }
    }
    
    // 轮询未读消息数
    const pollUnread = () => {
      const tk = localStorage.getItem('user_token')
      if (!tk) return
      fetch('/api/messages/unread-count', { headers: { Authorization: 'Bearer ' + tk } })
        .then(r => r.json())
        .then(res => { if (res.code === 200) setUnreadMsgCount(res.data?.count || 0) })
        .catch(() => {})
    }
    pollUnread()
    const unreadTimer = setInterval(pollUnread, 15000)
    return () => clearInterval(unreadTimer)
    
    // 处理支付回跳：从支付网关返回后，URL 带有 ?orderResult=订单号
    const urlParams = new URLSearchParams(window.location.search)
    const orderResultNo = urlParams.get('orderResult')
    if (orderResultNo) {
      setTrackingOrderNo(orderResultNo)
      // 清除URL参数，防止刷新重复触发
      window.history.replaceState({}, '', window.location.pathname)
      // 自动查询订单状态
      setTimeout(async () => {
        const result = await api.queryOrder(orderResultNo)
        if (result.code === 200 && result.data) {
          const order = result.data
          if (order.status === 'paid' || order.status === 'delivered' || order.status === 'completed') {
            if (order.card_keys && order.card_keys.length > 0) {
              const keys = Array.isArray(order.card_keys) ? order.card_keys : JSON.parse(order.card_keys)
              showToast(`支付成功！卡密: ${keys.join(', ')}`, 'success')
            } else {
              showToast('支付成功！卡密正在处理中，请稍后查询', 'success')
            }
          } else if (order.status === 'pending') {
            showToast('支付处理中，请稍等片刻后查询订单', 'info')
          }
        }
      }, 500)
    }
  }, [])

  // 处理登录成功
  const handleLoginSuccess = useCallback((userData) => {
    setUser(userData)
    showToast(`欢迎回来，${userData.username}！`, 'success')
  }, [showToast])

  // 处理退出登录
  const handleLogout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('user_info')
    localStorage.removeItem('user_token')
    setShowUserMenu(false)
    showToast('已退出登录', 'info')
  }, [showToast])

  // 筛选商品（客户端筛选）
  const filteredProducts = useMemo(() => {
    let result = [...products]
    
    // 分类筛选
    if (selectedCategory) {
      result = result.filter(p => p.category_id === selectedCategory)
    }
    
    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(p => 
        p.title?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      )
    }
    
    return result
  }, [products, selectedCategory, searchQuery])

  // 处理搜索
  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
  }, [])

  // 处理分类切换
  const handleCategoryChange = useCallback((categoryId) => {
    setSelectedCategory(categoryId)
  }, [])

  // 清除所有筛选
  const handleClearFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedCategory('')
  }, [])

  // 订单追踪查询
  const handleTrackOrder = useCallback(async (e) => {
    e?.preventDefault()
    if (!trackingOrderNo.trim()) {
      showToast('请输入订单号', 'error')
      return
    }
    
    setTrackingLoading(true)
    try {
      const result = await api.queryOrder(trackingOrderNo.trim())
      setTrackingLoading(false)
      
      if (result.code === 200 && result.data) {
        const order = result.data
        // 显示订单信息
        if (order.card_keys && order.card_keys.length > 0) {
          const keys = Array.isArray(order.card_keys) ? order.card_keys : JSON.parse(order.card_keys)
          showToast(`订单已完成！卡密: ${keys.join(', ')}`, 'success')
        } else if (order.status === 'paid' || order.status === 'delivered') {
          showToast('订单已支付，卡密正在处理中', 'success')
        } else if (order.status === 'pending') {
          showToast('订单待支付，请完成支付', 'info')
        } else {
          showToast(`订单状态: ${order.status}`, 'info')
        }
      } else {
        showToast(result.message || '未找到该订单', 'error')
      }
    } catch (err) {
      setTrackingLoading(false)
      showToast('查询失败，请重试', 'error')
    }
  }, [trackingOrderNo, showToast])

  // 渲染商品列表
  const renderProductGrid = () => {
    if (loading) {
      return (
        <EmptyState type="loading" />
      )
    }

    if (error) {
      return (
        <EmptyState type="error" onRetry={loadProducts} />
      )
    }

    if (products.length === 0) {
      return (
        <EmptyState type="no-products" />
      )
    }

    if (filteredProducts.length === 0) {
      return (
        <EmptyState 
          type="no-results" 
          searchQuery={searchQuery}
          onClear={handleClearFilters}
        />
      )
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-fade-in">
        {filteredProducts.map((product, index) => (
          <div 
            key={product.id}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ProductCard 
              product={product} 
              isLoggedIn={!!user}
              defaultImage={siteConfig?.default_product_image}
              onClick={(p) => {
                if (!user) {
                  showToast('请先登录后再购买', 'info')
                  setShowAuthModal(true)
                } else {
                  setSelectedProduct(p)
                }
              }}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* 头部 */}
      <header className="bg-black/40 backdrop-blur-2xl border-b border-white/[0.05] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            {siteConfig?.site_logo_url ? (
              <img src={siteConfig.site_logo_url} alt="" className="w-9 h-9 rounded-lg object-contain" />
            ) : (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, var(--primary, #6366f1), #8b5cf6)' }}>
                <Rocket size={18} className="text-white" />
              </div>
            )}
            {siteConfig && (
              <span className="hidden sm:block font-bold text-lg text-white tracking-tight">
                {siteConfig.site_name || ''}
              </span>
            )}
          </Link>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-2">
            {/* 查询订单按钮 */}
            <button
              onClick={() => setShowOrderLookup(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-white border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.04] rounded-lg transition-all text-sm"
            >
              <Search size={14} />
              查询订单
            </button>
            <button
              onClick={() => setShowOrderLookup(true)}
              className="sm:hidden p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all"
              title="查询订单"
            >
              <Search size={18} />
            </button>

            {user ? (
              <>
                {/* 消息铃铛 */}
                <Link
                  to="/user/messages"
                  className="relative p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                  title="消息"
                >
                  <Bell size={18} />
                  {unreadMsgCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                    </span>
                  )}
                </Link>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/[0.06] rounded-xl transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-500 rounded-lg flex items-center justify-center text-sm font-medium">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">
                    {user.username}
                  </span>
                </button>
                
                {/* 用户下拉菜单 */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-slate-700">
                      <p className="font-medium truncate">{user.username}</p>
                      <p className="text-slate-400 text-xs truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { setShowOrdersModal(true); setShowUserMenu(false); }}
                      className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                      <Package size={16} className="text-slate-400" />
                      我的订单
                    </button>
                    {user.role === 'seller' ? (
                      <Link
                        to="/seller"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-2 text-emerald-400"
                      >
                        <Store size={16} />
                        卖家中心
                      </Link>
                    ) : (
                      <Link
                        to="/apply-seller"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-2 text-blue-400"
                      >
                        <Store size={16} />
                        成为卖家
                      </Link>
                    )}
                    <Link
                      to="/account/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-2 text-slate-300"
                    >
                      <Shield size={16} className="text-slate-400" />
                      账号设置
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-2 text-red-400"
                    >
                      <LogOut size={16} />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors text-sm font-medium"
              >
                <User size={16} />
                <span className="hidden sm:inline">登录</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1 relative z-10">
        <div className="max-w-6xl mx-auto w-full px-4 py-6 space-y-8">
          
          {/* Hero Banner - 多媒体公告区 */}
          <section className="hero-section">
            <HeroBanner />
          </section>

          {/* 核心优势徽章 */}
          <CoreFeatures />

          {/* 搜索和筛选区 */}
          <section className="search-section">
            <SearchFilter
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              onSearch={handleSearch}
              onCategoryChange={handleCategoryChange}
            />
          </section>

          {/* 主内容区域 */}
          <section id="products" className="content-section">
            <div className="w-full">
              {/* 标题和计数 */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                  <ShoppingBag size={24} className="text-primary" />
                  <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    {selectedCategory || searchQuery ? '筛选结果' : '全部商品'}
                  </span>
                </h2>
                {!loading && !error && (
                  <span className="text-slate-500 text-sm">
                    共 {filteredProducts.length} 件商品
                  </span>
                )}
              </div>

              {/* 商品网格 */}
              {renderProductGrid()}
            </div>
          </section>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-black/30 backdrop-blur-lg">
        {/* 主内容 — 3 列 */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* 列 1: 品牌 */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                {siteConfig?.site_logo_url ? (
                  <img src={siteConfig.site_logo_url} alt="" className="w-8 h-8 rounded-lg object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary, #6366f1), #8b5cf6)' }}>
                    <Rocket size={16} className="text-white" />
                  </div>
                )}
                <span className="font-bold text-white">{siteConfig?.site_name || ''}</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed mb-5">
                {siteConfig?.footer_description || siteConfig?.site_description || ''}
              </p>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
                  <CreditCard size={14} className="text-blue-400" />
                  <span className="text-xs text-slate-400">支付宝</span>
                </div>
                <div className="px-3 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
                  <CreditCard size={14} className="text-green-400" />
                  <span className="text-xs text-slate-400">微信支付</span>
                </div>
              </div>
            </div>

            {/* 列 2: 信息 */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">信息</h4>
              <ul className="space-y-2.5">
                <li><Link to="/pages/terms" className="text-sm text-slate-500 hover:text-white transition-colors">服务条款</Link></li>
                <li><Link to="/pages/privacy" className="text-sm text-slate-500 hover:text-white transition-colors">隐私政策</Link></li>
                <li><Link to="/pages/help" className="text-sm text-slate-500 hover:text-white transition-colors">帮助中心</Link></li>
              </ul>
            </div>

            {/* 列 3: 支持 */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">支持</h4>
              <ul className="space-y-2.5">
                <li className="text-sm text-slate-500">
                  <span className="text-slate-600">邮箱</span>
                  <span className="ml-2 text-slate-400">{siteConfig?.contact_email || ''}</span>
                </li>
                <li className="text-sm text-slate-500">
                  <span className="text-slate-600">工作时间</span>
                  <span className="ml-2 text-slate-400">{siteConfig?.support_hours || ''}</span>
                </li>
                <li>
                  <Link to="/user/messages" className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors mt-1">
                    <Bell size={14} />
                    联系在线客服
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </footer>

      {/* 购买弹窗 */}
      <PurchaseModal 
        isOpen={!!selectedProduct}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        showToast={showToast}
        onPaymentSuccess={() => {
          // 支付成功后自动打开订单列表
          setTimeout(() => setShowOrdersModal(true), 300)
        }}
      />

      {/* 登录/注册弹窗 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* 我的订单弹窗 */}
      <MyOrdersModal
        isOpen={showOrdersModal}
        onClose={() => setShowOrdersModal(false)}
        user={user}
      />

      {/* 浮动客服按钮 */}
      <FloatingServiceWidget />

      {/* 订单查询弹窗 */}
      {showOrderLookup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowOrderLookup(false)}>
          <div className="bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Search size={28} className="text-indigo-400" />
                </div>
                <h2 className="text-lg font-bold text-white">查询订单</h2>
                <p className="text-sm text-slate-400 mt-1">输入订单号查看订单状态和卡密</p>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); setShowOrderLookup(false); handleTrackOrder(e); }}>
                <input
                  type="text"
                  value={trackingOrderNo}
                  onChange={e => setTrackingOrderNo(e.target.value)}
                  placeholder="请输入订单号..."
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none mb-4"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={trackingLoading || !trackingOrderNo.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {trackingLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Search size={16} /> 查询</>
                  )}
                </button>
              </form>
              <button onClick={() => setShowOrderLookup(false)} className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast 提示 */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* 点击外部关闭用户菜单 */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  )
}

export default App
