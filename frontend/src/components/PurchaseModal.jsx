import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, ArrowRight, CheckCircle, XCircle, AlertTriangle, Loader2, Star, ShieldCheck, User, Trophy, Award, MessageCircle, ChevronRight, Package } from 'lucide-react'
import { EMAIL_REGEX, STOCK_LIMIT } from '../utils/storage'
import productDefault from '../assets/product-default.png'
import PaymentPage from './PaymentPage'

// API 基础地址
const API_BASE = import.meta.env.VITE_API_URL || '/api'

// API 请求 - 修复：传递用户 Token 以关联订单到登录用户
const createOrderAPI = async (orderData) => {
  try {
    // 获取用户 Token（如果已登录）
    const token = localStorage.getItem('user_token')
    const headers = { 'Content-Type': 'application/json' }
    
    // 如果用户已登录，添加 Authorization header
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(orderData)
    })
    return await res.json()
  } catch (err) {
    return { code: 500, message: '网络请求失败' }
  }
}

const PurchaseModal = ({ isOpen, product, onClose, showToast, onPaymentSuccess }) => {
  // 状态
  const [quantity, setQuantity] = useState(1)
  const [email, setEmail] = useState('')
  const [isEmailValid, setIsEmailValid] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // 支付页面状态
  const [showPayment, setShowPayment] = useState(false)
  const [orderInfo, setOrderInfo] = useState(null)

  // 库存限制 (Module 2)
  const maxStock = Math.min(product?.stock ?? STOCK_LIMIT, STOCK_LIMIT)

  // 重置状态并加载用户邮箱
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1)
      setLoading(false)
      setShowPayment(false)
      setOrderInfo(null)
      
      // 自动填充登录用户的邮箱
      try {
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
        const userEmail = userInfo.email || ''
        setEmail(userEmail)
        setIsEmailValid(EMAIL_REGEX.test(userEmail))
      } catch {
        setEmail('')
        setIsEmailValid(false)
      }
    }
  }, [isOpen, product])

  // 邮箱验证 (Module 3)
  useEffect(() => {
    setIsEmailValid(EMAIL_REGEX.test(email))
  }, [email])

  // 价格计算 (Module 2)
  const unitPrice = parseFloat(product?.price || 0)
  const totalPrice = (unitPrice * quantity).toFixed(2)

  // 数量控制 (Module 2)
  const handleQuantityChange = (delta) => {
    const newQty = quantity + delta
    if (newQty >= 1 && newQty <= maxStock) {
      setQuantity(newQty)
    }
  }

  // 提交订单并跳转支付页面
  const handleSubmitOrder = async () => {
    setLoading(true)
    
    // 发送订单到后端数据库
    const result = await createOrderAPI({
      product_id: product.id,
      quantity: quantity,
      email: email
    })
    
    setLoading(false)
    
    if (result.code === 200) {
      // 保存订单信息并打开支付页面
      setOrderInfo({
        orderNo: result.data.order_no,
        orderId: result.data.id,
        productTitle: product.title,
        quantity: quantity,
        email: email,
        total: totalPrice
      })
      setShowPayment(true)
    } else {
      showToast(result.message || '创建订单失败', 'error')
    }
  }

  // 支付成功回调
  const handlePaymentSuccess = (openOrderList = false) => {
    setShowPayment(false)
    onClose()
    // 如果需要打开订单列表
    if (openOrderList && onPaymentSuccess) {
      onPaymentSuccess()
    }
  }

  if (!isOpen || !product) return null

  // 显示支付页面
  if (showPayment && orderInfo) {
    return (
      <PaymentPage
        isOpen={true}
        order={orderInfo}
        onClose={() => {
          setShowPayment(false)
          onClose()
        }}
        onSuccess={handlePaymentSuccess}
        showToast={showToast}
      />
    )
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-dark-card rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="sticky top-0 bg-dark-card p-4 border-b border-dark-border flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold">确认购买</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-dark-input flex items-center justify-center hover:bg-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {/* 商品信息 */}
          <div className="flex gap-4 mb-6 p-4 bg-dark-input rounded-2xl">
            <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden">
              <img 
                src={product.image_url || productDefault} 
                alt={product.title} 
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = productDefault }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1 truncate">{product.title}</h3>
              <p className="text-primary font-bold text-xl">¥{unitPrice.toFixed(2)}</p>
            </div>
          </div>

          {/* 卖家信息卡片 - Enhanced */}
          {product.seller_id && product.seller_name && (() => {
            const sellerName = product.seller_nickname || product.seller_name
            const sellerAvatar = product.seller_avatar_url || product.seller_avatar
            const sellerRating = (parseFloat(product.seller_rating) || 5.0)
            const sellerReviewCount = product.seller_review_count || 0
            const sellerSoldCount = product.seller_sold_count || 0
            const isVerified = product.seller_verified === 1 || product.seller_verified === true
            const isExcellentSeller = product.badge_excellent_seller === 1 || product.badge_excellent_seller === true
            const isExcellentBuyer = product.badge_excellent_buyer === 1 || product.badge_excellent_buyer === true

            return (
              <div className="mb-5 rounded-2xl border border-white/[0.06] bg-[#111827]/70 backdrop-blur-sm overflow-hidden">
                {/* Main seller info */}
                <div className="p-4">
                  <div className="flex items-start gap-3.5">
                    {/* Avatar - Clickable */}
                    <Link
                      to={`/u/${product.seller_id}`}
                      className="flex-shrink-0 relative group/avatar"
                    >
                      <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/[0.08] group-hover/avatar:border-violet-500/40 transition-colors shadow-lg shadow-black/20">
                        {sellerAvatar ? (
                          <img src={sellerAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                            <span className="text-base font-bold text-white/90">
                              {sellerName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Online dot */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#111827] rounded-lg flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-md" />
                      </div>
                    </Link>

                    {/* Name + Badges + Stats */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: Name + Mini Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <Link
                          to={`/u/${product.seller_id}`}
                          className="font-bold text-sm text-white hover:text-violet-300 transition-colors truncate max-w-[140px]"
                        >
                          {sellerName}
                        </Link>
                        {isVerified && (
                          <span className="flex-shrink-0 w-[18px] h-[18px] rounded-md bg-blue-500/15 border border-blue-500/30 flex items-center justify-center" title="学生认证">
                            <ShieldCheck size={11} className="text-blue-400" />
                          </span>
                        )}
                        {isExcellentSeller && (
                          <span className="flex-shrink-0 w-[18px] h-[18px] rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center" title="优秀卖家">
                            <Trophy size={11} className="text-amber-400" />
                          </span>
                        )}
                        {isExcellentBuyer && (
                          <span className="flex-shrink-0 w-[18px] h-[18px] rounded-md bg-slate-400/10 border border-slate-400/20 flex items-center justify-center" title="优秀买家">
                            <Award size={11} className="text-slate-300" />
                          </span>
                        )}
                      </div>

                      {/* Row 2: Quick Stats */}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Package size={11} className="text-slate-500" />
                          已售 <span className="text-white font-semibold">{sellerSoldCount}</span>
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Star size={11} className="text-amber-400 fill-amber-400" />
                          <span className="text-amber-400 font-semibold">{sellerRating.toFixed(1)}</span>
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-500">{sellerReviewCount} 评价</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons bar */}
                <div className="flex border-t border-white/[0.06]">
                  <Link
                    to={`/user/messages?to=${product.seller_id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.03] transition-all border-r border-white/[0.06]"
                  >
                    <MessageCircle size={14} />
                    联系卖家
                  </Link>
                  <Link
                    to={`/u/${product.seller_id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-slate-400 hover:text-violet-400 hover:bg-violet-500/[0.04] transition-all"
                  >
                    查看主页
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            )
          })()}

          {/* 数量选择器 (Module 2) */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-400">购买数量</label>
              <span className="text-xs text-slate-500">库存上限: {maxStock}</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold transition-all ${
                  quantity <= 1 
                    ? 'bg-dark-border text-slate-600 cursor-not-allowed' 
                    : 'bg-dark-input hover:bg-primary text-white'
                }`}
              >
                −
              </button>
              <div className="flex-1 h-12 bg-dark-input rounded-xl flex items-center justify-center text-xl font-semibold">
                {quantity}
              </div>
              <button 
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= maxStock}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold transition-all ${
                  quantity >= maxStock 
                    ? 'bg-dark-border text-slate-600 cursor-not-allowed' 
                    : 'bg-dark-input hover:bg-primary text-white'
                }`}
              >
                +
              </button>
            </div>
            {quantity >= maxStock && (
              <p className="text-xs text-warning mt-2 flex items-center gap-1">
                <AlertTriangle size={12} />
                已达到库存上限
              </p>
            )}
          </div>

          {/* 邮箱输入 (Module 3) */}
          <div className="mb-5">
            <label className="text-sm text-slate-400 mb-2 block">接收邮箱</label>
            <div className="relative">
              <input
                type="email"
                placeholder="请输入有效邮箱地址"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={`w-full h-12 px-4 pr-10 bg-dark-input border rounded-xl text-white placeholder-slate-500 outline-none transition-colors ${
                  email && !isEmailValid 
                    ? 'border-red-500 focus:border-red-500' 
                    : isEmailValid 
                      ? 'border-green-500 focus:border-green-500' 
                      : 'border-dark-border focus:border-primary'
                }`}
              />
              {email && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isEmailValid 
                    ? <CheckCircle size={18} className="text-green-500" />
                    : <XCircle size={18} className="text-red-500" />
                  }
                </div>
              )}
            </div>
            {email && !isEmailValid && (
              <p className="text-xs text-red-400 mt-1">请输入有效的邮箱地址</p>
            )}
          </div>

          {/* 价格汇总 */}
          <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-2xl p-4 mb-6">
            <div className="flex justify-between text-sm text-slate-400 mb-2">
              <span>单价</span>
              <span>¥{unitPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400 mb-3">
              <span>数量</span>
              <span>× {quantity}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-white/10">
              <span className="font-medium">应付金额</span>
              <span className="text-2xl font-bold text-primary">¥{totalPrice}</span>
            </div>
          </div>

          {/* 提交按钮 */}
          <button
            onClick={handleSubmitOrder}
            disabled={!isEmailValid || loading}
            className={`w-full h-14 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
              isEmailValid && !loading
                ? 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/25' 
                : 'bg-dark-border text-slate-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                创建订单中...
              </>
            ) : (
              <>
                立即支付
                <ArrowRight size={20} />
              </>
            )}
          </button>
          
          <p className="text-xs text-slate-500 text-center mt-3">
            点击后将跳转到支付页面
          </p>
        </div>
      </div>
    </div>
  )
}

export default PurchaseModal
