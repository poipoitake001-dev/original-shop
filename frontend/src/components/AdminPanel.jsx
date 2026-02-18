import React, { useState, useEffect } from 'react'
import { 
  X, Package, ShoppingCart, Plus, Edit, Trash2, 
  RefreshCw, ChevronDown, ChevronUp, Save, Search,
  CheckCircle, Clock, XCircle, Truck, CheckSquare, Square,
  Filter, MoreHorizontal
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

// 获取token
const getToken = () => localStorage.getItem('admin_token')
const setToken = (token) => localStorage.setItem('admin_token', token)
const clearToken = () => localStorage.removeItem('admin_token')

// API请求封装
const adminRequest = async (url, options = {}) => {
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

// 管理后台面板组件
const AdminPanel = ({ isOpen, onClose, showToast }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeTab, setActiveTab] = useState('orders')
  const [loading, setLoading] = useState(false)
  
  // 登录表单
  const [loginForm, setLoginForm] = useState({ account: '', password: '' })
  
  // 订单数据
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [selectedOrders, setSelectedOrders] = useState([])
  const [showBatchActions, setShowBatchActions] = useState(false)
  
  // 商品数据
  const [products, setProducts] = useState([])
  const [editingProduct, setEditingProduct] = useState(null)
  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    price: '',
    stock: '',
    icon: '📦',
    status: 1
  })

  // 订单状态配置
  const statusConfig = {
    pending: { label: '待支付', color: 'text-yellow-400 bg-yellow-400/10', icon: Clock },
    paid: { label: '已支付', color: 'text-green-400 bg-green-400/10', icon: CheckCircle },
    delivered: { label: '已发货', color: 'text-blue-400 bg-blue-400/10', icon: Truck },
    completed: { label: '已完成', color: 'text-green-400 bg-green-400/10', icon: CheckCircle },
    cancelled: { label: '已取消', color: 'text-red-400 bg-red-400/10', icon: XCircle }
  }

  // 检查登录状态
  useEffect(() => {
    if (isOpen && getToken()) {
      setIsLoggedIn(true)
      loadData()
    }
  }, [isOpen])

  // 过滤订单
  useEffect(() => {
    let result = [...orders]
    
    // 按订单号搜索
    if (orderSearch.trim()) {
      const searchLower = orderSearch.toLowerCase()
      result = result.filter(order => 
        order.order_no.toLowerCase().includes(searchLower) ||
        order.email.toLowerCase().includes(searchLower) ||
        order.product_title.toLowerCase().includes(searchLower)
      )
    }
    
    // 按状态过滤
    if (orderStatusFilter !== 'all') {
      result = result.filter(order => order.status === orderStatusFilter)
    }
    
    setFilteredOrders(result)
  }, [orders, orderSearch, orderStatusFilter])

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    if (activeTab === 'orders') {
      const res = await adminRequest('/orders')
      if (res.code === 200) {
        setOrders(res.data?.list || [])
        setSelectedOrders([])
      } else if (res.code === 401) {
        handleLogout()
      }
    } else {
      const res = await adminRequest('/products')
      if (res.code === 200) {
        setProducts(res.data?.list || [])
      }
    }
    setLoading(false)
  }

  // 切换Tab时加载数据
  useEffect(() => {
    if (isLoggedIn) {
      loadData()
      setSelectedOrders([])
      setOrderSearch('')
      setOrderStatusFilter('all')
    }
  }, [activeTab, isLoggedIn])

  // 登录
  const handleLogin = async (e) => {
    e.preventDefault()
    if (!loginForm.account || !loginForm.password) {
      showToast('请输入账号和密码', 'error')
      return
    }
    
    setLoading(true)
    const res = await adminRequest('/users/login', {
      method: 'POST',
      body: JSON.stringify(loginForm)
    })
    setLoading(false)
    
    if (res.code === 200) {
      if (res.data.user.role !== 'admin') {
        showToast('需要管理员权限', 'error')
        return
      }
      setToken(res.data.token)
      setIsLoggedIn(true)
      showToast('登录成功', 'success')
      loadData()
    } else {
      showToast(res.message || '登录失败', 'error')
    }
  }

  // 登出
  const handleLogout = () => {
    clearToken()
    setIsLoggedIn(false)
    setOrders([])
    setProducts([])
    setSelectedOrders([])
  }

  // 选择/取消选择订单
  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id))
    }
  }

  // 更新订单状态
  const handleUpdateOrderStatus = async (orderId, status) => {
    const res = await adminRequest(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
    
    if (res.code === 200) {
      showToast('订单状态已更新', 'success')
      loadData()
    } else {
      showToast(res.message || '更新失败', 'error')
    }
  }

  // 批量更新订单状态
  const handleBatchUpdateStatus = async (status) => {
    if (selectedOrders.length === 0) {
      showToast('请先选择订单', 'error')
      return
    }
    
    setLoading(true)
    let successCount = 0
    let failCount = 0
    
    for (const orderId of selectedOrders) {
      const res = await adminRequest(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })
      if (res.code === 200) {
        successCount++
      } else {
        failCount++
      }
    }
    
    setLoading(false)
    showToast(`批量更新完成：成功 ${successCount} 个，失败 ${failCount} 个`, successCount > 0 ? 'success' : 'error')
    loadData()
    setShowBatchActions(false)
  }

  // 删除单个订单
  const handleDeleteOrder = async (orderId) => {
    if (!confirm('确定要彻底删除这个订单吗？此操作不可恢复！')) return
    
    const res = await adminRequest(`/orders/${orderId}`, { method: 'DELETE' })
    
    if (res.code === 200) {
      showToast('订单已删除', 'success')
      loadData()
    } else {
      showToast(res.message || '删除失败', 'error')
    }
  }

  // 批量彻底删除订单
  const handleBatchDelete = async () => {
    if (selectedOrders.length === 0) {
      showToast('请先选择订单', 'error')
      return
    }
    
    if (!confirm(`确定要彻底删除选中的 ${selectedOrders.length} 个订单吗？此操作不可恢复！`)) return
    
    setLoading(true)
    const res = await adminRequest('/orders/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids: selectedOrders })
    })
    setLoading(false)
    
    if (res.code === 200) {
      showToast(res.message, 'success')
      loadData()
      setShowBatchActions(false)
    } else {
      showToast(res.message || '批量删除失败', 'error')
    }
  }
  
  // 批量取消订单（仅改状态）
  const handleBatchCancel = async () => {
    if (selectedOrders.length === 0) {
      showToast('请先选择订单', 'error')
      return
    }
    
    if (!confirm(`确定要取消选中的 ${selectedOrders.length} 个订单吗？`)) return
    
    await handleBatchUpdateStatus('cancelled')
  }

  // 保存商品
  const handleSaveProduct = async (e) => {
    e.preventDefault()
    
    if (!productForm.title || !productForm.price) {
      showToast('请填写商品名称和价格', 'error')
      return
    }
    
    const data = {
      ...productForm,
      price: parseFloat(productForm.price),
      stock: parseInt(productForm.stock) || 0
    }
    
    setLoading(true)
    let res
    if (editingProduct) {
      res = await adminRequest(`/products/${editingProduct.id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
    } else {
      res = await adminRequest('/products', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    }
    setLoading(false)
    
    if (res.code === 200) {
      showToast(editingProduct ? '商品已更新' : '商品已添加', 'success')
      resetProductForm()
      loadData()
    } else {
      showToast(res.message || '保存失败', 'error')
    }
  }

  // 删除商品
  const handleDeleteProduct = async (id) => {
    if (!confirm('确定要删除这个商品吗？')) return
    
    const res = await adminRequest(`/products/${id}`, { method: 'DELETE' })
    
    if (res.code === 200) {
      showToast('商品已删除', 'success')
      loadData()
    } else {
      showToast(res.message || '删除失败', 'error')
    }
  }

  // 补货
  const handleRestock = async (id, currentStock) => {
    const addStock = prompt('请输入补货数量:', '10')
    if (!addStock) return
    
    const newStock = currentStock + parseInt(addStock)
    const res = await adminRequest(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock: newStock })
    })
    
    if (res.code === 200) {
      showToast(`已补货 ${addStock} 件`, 'success')
      loadData()
    } else {
      showToast(res.message || '补货失败', 'error')
    }
  }

  // 编辑商品
  const handleEditProduct = (product) => {
    setEditingProduct(product)
    setProductForm({
      title: product.title,
      description: product.description || '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      icon: product.icon || '📦',
      status: product.status
    })
  }

  // 重置表单
  const resetProductForm = () => {
    setEditingProduct(null)
    setProductForm({
      title: '',
      description: '',
      price: '',
      stock: '',
      icon: '📦',
      status: 1
    })
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-dark-card rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="p-4 border-b border-dark-border flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package size={24} className="text-primary" />
            管理后台
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-dark-input flex items-center justify-center hover:bg-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {!isLoggedIn ? (
          /* ========== 登录表单 ========== */
          <div className="p-8 flex-1 flex items-center justify-center">
            <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
              <h3 className="text-lg font-semibold text-center mb-6">管理员登录</h3>
              
              <input
                type="text"
                placeholder="账号 (admin)"
                value={loginForm.account}
                onChange={e => setLoginForm({ ...loginForm, account: e.target.value })}
                className="w-full h-12 px-4 bg-dark-input border border-dark-border rounded-xl text-white placeholder-slate-500 outline-none focus:border-primary"
              />
              
              <input
                type="password"
                placeholder="密码 (admin123)"
                value={loginForm.password}
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full h-12 px-4 bg-dark-input border border-dark-border rounded-xl text-white placeholder-slate-500 outline-none focus:border-primary"
              />
              
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary hover:bg-primary-hover rounded-xl font-medium transition-colors disabled:opacity-60"
              >
                {loading ? '登录中...' : '登录'}
              </button>
              
              <p className="text-xs text-slate-500 text-center">
                默认管理员: admin / admin123
              </p>
            </form>
          </div>
        ) : (
          /* ========== 管理面板 ========== */
          <>
            {/* Tab 切换 */}
            <div className="flex border-b border-dark-border">
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'orders' 
                    ? 'text-primary border-b-2 border-primary' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShoppingCart size={16} className="inline mr-2" />
                订单管理
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'products' 
                    ? 'text-primary border-b-2 border-primary' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package size={16} className="inline mr-2" />
                商品管理
              </button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-10">
                  <div className="spinner mx-auto mb-3"></div>
                  <p className="text-slate-400">加载中...</p>
                </div>
              ) : activeTab === 'orders' ? (
                /* ========== 订单列表 ========== */
                <div className="space-y-3">
                  {/* 搜索和筛选栏 */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    {/* 搜索框 */}
                    <div className="flex-1 min-w-[200px] relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="搜索订单号、邮箱、商品名..."
                        value={orderSearch}
                        onChange={e => setOrderSearch(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 bg-dark-input border border-dark-border rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
                      />
                    </div>
                    
                    {/* 状态筛选 */}
                    <div className="flex items-center gap-2">
                      <Filter size={14} className="text-slate-500" />
                      <select
                        value={orderStatusFilter}
                        onChange={e => setOrderStatusFilter(e.target.value)}
                        className="h-10 px-3 bg-dark-input border border-dark-border rounded-lg text-sm text-white outline-none focus:border-primary"
                      >
                        <option value="all">全部状态</option>
                        <option value="pending">待支付</option>
                        <option value="paid">已支付</option>
                        <option value="delivered">已发货</option>
                        <option value="completed">已完成</option>
                        <option value="cancelled">已取消</option>
                      </select>
                    </div>
                    
                    {/* 刷新按钮 */}
                    <button 
                      onClick={loadData}
                      className="h-10 px-4 bg-dark-input border border-dark-border rounded-lg text-sm text-slate-400 hover:text-white hover:border-primary transition-colors flex items-center gap-1"
                    >
                      <RefreshCw size={14} /> 刷新
                    </button>
                  </div>
                  
                  {/* 批量操作栏 */}
                  <div className="flex items-center justify-between py-2 px-3 bg-dark-input rounded-lg">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
                      >
                        {selectedOrders.length === filteredOrders.length && filteredOrders.length > 0 
                          ? <CheckSquare size={18} className="text-primary" /> 
                          : <Square size={18} />
                        }
                        全选
                      </button>
                      <span className="text-xs text-slate-500">
                        已选择 {selectedOrders.length} / {filteredOrders.length} 个订单
                      </span>
                    </div>
                    
                    {selectedOrders.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <button
                            onClick={() => setShowBatchActions(!showBatchActions)}
                            className="h-8 px-3 bg-primary/20 text-primary rounded-lg text-xs font-medium hover:bg-primary/30 transition-colors flex items-center gap-1"
                          >
                            <MoreHorizontal size={14} />
                            批量操作
                          </button>
                          
                          {showBatchActions && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-dark-card border border-dark-border rounded-lg shadow-xl z-10 py-1">
                              <button
                                onClick={() => handleBatchUpdateStatus('paid')}
                                className="w-full px-3 py-2 text-left text-xs hover:bg-dark-input text-green-400"
                              >
                                ✓ 标记为已支付
                              </button>
                              <button
                                onClick={() => handleBatchUpdateStatus('delivered')}
                                className="w-full px-3 py-2 text-left text-xs hover:bg-dark-input text-blue-400"
                              >
                                📦 标记为已发货
                              </button>
                              <button
                                onClick={() => handleBatchUpdateStatus('completed')}
                                className="w-full px-3 py-2 text-left text-xs hover:bg-dark-input text-green-400"
                              >
                                ✓ 标记为已完成
                              </button>
                              <div className="border-t border-dark-border my-1"></div>
                              <button
                                onClick={handleBatchCancel}
                                className="w-full px-3 py-2 text-left text-xs hover:bg-dark-input text-yellow-400"
                              >
                                ✗ 批量取消订单
                              </button>
                              <button
                                onClick={handleBatchDelete}
                                className="w-full px-3 py-2 text-left text-xs hover:bg-dark-input text-red-400"
                              >
                                🗑 彻底删除订单
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 订单统计 */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                    <span>全部订单 ({orders.length})</span>
                    {orderSearch && <span>搜索结果: {filteredOrders.length} 条</span>}
                  </div>
                  
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      <ShoppingCart size={40} className="mx-auto mb-2 opacity-50" />
                      <p>{orderSearch ? '未找到匹配的订单' : '暂无订单'}</p>
                    </div>
                  ) : (
                    filteredOrders.map(order => {
                      const status = statusConfig[order.status] || statusConfig.pending
                      const StatusIcon = status.icon
                      const isExpanded = expandedOrder === order.id
                      const isSelected = selectedOrders.includes(order.id)
                      
                      return (
                        <div 
                          key={order.id} 
                          className={`bg-dark-input rounded-xl overflow-hidden transition-all ${
                            isSelected ? 'ring-2 ring-primary' : ''
                          }`}
                        >
                          <div className="p-4 flex items-start gap-3">
                            {/* 选择框 */}
                            <button
                              onClick={() => toggleOrderSelection(order.id)}
                              className="mt-1 text-slate-400 hover:text-primary transition-colors"
                            >
                              {isSelected 
                                ? <CheckSquare size={18} className="text-primary" /> 
                                : <Square size={18} />
                              }
                            </button>
                            
                            {/* 订单内容 */}
                            <div 
                              className="flex-1 cursor-pointer"
                              onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-500 font-mono">{order.order_no}</span>
                                <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${status.color}`}>
                                  <StatusIcon size={12} />
                                  {status.label}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{order.product_title}</p>
                                  <p className="text-xs text-slate-500">
                                    {order.email} · 数量: {order.quantity}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-primary font-bold">¥{parseFloat(order.total_price).toFixed(2)}</span>
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-2 border-t border-dark-border ml-9">
                              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                <div>
                                  <span className="text-slate-500">创建时间:</span>
                                  <span className="ml-2">{new Date(order.created_at).toLocaleString('zh-CN')}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">规格:</span>
                                  <span className="ml-2">{order.spec || '默认'}</span>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 items-center mb-3">
                                <span className="text-sm text-slate-400">更改状态:</span>
                                {['pending', 'paid', 'delivered', 'completed', 'cancelled'].map(s => (
                                  <button
                                    key={s}
                                    onClick={() => handleUpdateOrderStatus(order.id, s)}
                                    disabled={order.status === s}
                                    className={`text-xs px-2 py-1 rounded transition-colors ${
                                      order.status === s 
                                        ? 'bg-primary text-white' 
                                        : 'bg-dark-border text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    {statusConfig[s].label}
                                  </button>
                                ))}
                              </div>
                              
                              {/* 删除按钮 */}
                              <div className="flex justify-end pt-2 border-t border-dark-border">
                                <button
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                >
                                  <Trash2 size={12} />
                                  彻底删除订单
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              ) : (
                /* ========== 商品管理 ========== */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* 商品表单 */}
                  <div className="bg-dark-input rounded-xl p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      {editingProduct ? <Edit size={16} /> : <Plus size={16} />}
                      {editingProduct ? '编辑商品' : '添加商品'}
                    </h3>
                    
                    <form onSubmit={handleSaveProduct} className="space-y-3">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">商品名称 *</label>
                        <input
                          type="text"
                          placeholder="输入商品名称"
                          value={productForm.title}
                          onChange={e => setProductForm({ ...productForm, title: e.target.value })}
                          className="w-full h-10 px-3 bg-dark-card border border-dark-border rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">商品描述</label>
                        <textarea
                          placeholder="输入商品描述"
                          value={productForm.description}
                          onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-primary resize-none"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">价格 *</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={productForm.price}
                            onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                            className="w-full h-10 px-3 bg-dark-card border border-dark-border rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">库存</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={productForm.stock}
                            onChange={e => setProductForm({ ...productForm, stock: e.target.value })}
                            className="w-full h-10 px-3 bg-dark-card border border-dark-border rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">图标 Emoji</label>
                          <input
                            type="text"
                            placeholder="📦"
                            value={productForm.icon}
                            onChange={e => setProductForm({ ...productForm, icon: e.target.value })}
                            className="w-full h-10 px-3 bg-dark-card border border-dark-border rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">状态</label>
                          <select
                            value={productForm.status}
                            onChange={e => setProductForm({ ...productForm, status: parseInt(e.target.value) })}
                            className="w-full h-10 px-3 bg-dark-card border border-dark-border rounded-lg text-sm text-white outline-none focus:border-primary"
                          >
                            <option value={1}>上架</option>
                            <option value={0}>下架</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 h-10 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <Save size={14} />
                          {editingProduct ? '保存修改' : '添加商品'}
                        </button>
                        {editingProduct && (
                          <button
                            type="button"
                            onClick={resetProductForm}
                            className="h-10 px-4 bg-dark-border rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
                          >
                            取消
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                  
                  {/* 商品列表 */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold">商品列表 ({products.length})</h3>
                      <button 
                        onClick={loadData}
                        className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        <RefreshCw size={14} /> 刷新
                      </button>
                    </div>
                    
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {products.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                          <Package size={40} className="mx-auto mb-2 opacity-50" />
                          <p>暂无商品</p>
                        </div>
                      ) : (
                        products.map(product => (
                          <div key={product.id} className="bg-dark-input rounded-xl p-3 flex items-center gap-3">
                            <span className="text-2xl">{product.icon || '📦'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{product.title}</p>
                                {product.status === 0 && (
                                  <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">下架</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                ¥{parseFloat(product.price).toFixed(2)} · 库存: {product.stock}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleRestock(product.id, product.stock)}
                                className="p-2 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                                title="补货"
                              >
                                <Plus size={16} />
                              </button>
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="编辑"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                title="删除"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 底部 */}
            <div className="p-3 border-t border-dark-border flex justify-between items-center text-xs text-slate-500">
              <span>已登录为管理员</span>
              <button 
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300"
              >
                退出登录
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AdminPanel
