import React, { useState, useEffect } from 'react'
import { X, Package, Clock, CheckCircle, XCircle, Truck, ChevronRight, Copy, Check, RefreshCw, Star, Send, Loader2 } from 'lucide-react'
import { API_BASE, authFetch, reviewApi } from '../utils/api'

const statusConfig = {
  pending: { label: '待支付', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Clock },
  paid: { label: '已支付', color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle },
  awaiting_delivery: { label: '待发货', color: 'text-orange-400', bg: 'bg-orange-500/10', icon: Package },
  delivered: { label: '已发货', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Truck },
  completed: { label: '已完成', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle },
  cancelled: { label: '已取消', color: 'text-red-400', bg: 'bg-red-500/10', icon: XCircle }
}

const MyOrdersModal = ({ isOpen, onClose, user }) => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)
  
  // 评价相关状态
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewTarget, setReviewTarget] = useState(null) // { orderId, targetUserId, targetName }
  const [reviewScore, setReviewScore] = useState(5)
  const [reviewHover, setReviewHover] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewedOrders, setReviewedOrders] = useState({}) // orderId -> boolean

  useEffect(() => {
    if (isOpen && user) {
      loadOrders()
    }
  }, [isOpen, user])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('user_token')
      const res = await fetch(`${API_BASE}/customer/orders?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.code === 200) {
        setOrders(data.data.list || [])
      }
    } catch (error) {
      console.error('加载订单失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(index)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 检查订单是否已评价
  const checkReviewStatus = async (orderId) => {
    if (reviewedOrders[orderId] !== undefined) return reviewedOrders[orderId]
    try {
      const res = await reviewApi.getByOrder(orderId)
      if (res.code === 200) {
        setReviewedOrders(prev => ({ ...prev, [orderId]: res.data.hasReviewed }))
        return res.data.hasReviewed
      }
    } catch {}
    return false
  }

  // 打开评价弹窗
  const openReview = (order) => {
    // 买家评卖家: targetUserId = seller_id
    const targetUserId = order.seller_id
    const targetName = order.seller_name || '卖家'
    if (!targetUserId) return
    setReviewTarget({ orderId: order.id, targetUserId, targetName })
    setReviewScore(5)
    setReviewHover(0)
    setReviewComment('')
    setShowReviewModal(true)
  }

  // 提交评价
  const submitReview = async () => {
    if (!reviewTarget) return
    setReviewSubmitting(true)
    const res = await reviewApi.submit({
      orderId: reviewTarget.orderId,
      targetUserId: reviewTarget.targetUserId,
      score: reviewScore,
      comment: reviewComment
    })
    setReviewSubmitting(false)
    if (res.code === 200) {
      setReviewedOrders(prev => ({ ...prev, [reviewTarget.orderId]: true }))
      setShowReviewModal(false)
    } else {
      alert(res.message || '评价失败')
    }
  }

  // 当选中订单详情时，检查评价状态
  useEffect(() => {
    if (selectedOrder && selectedOrder.status === 'completed' && selectedOrder.seller_id) {
      checkReviewStatus(selectedOrder.id)
    }
  }, [selectedOrder])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl animate-scale-in flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-500 rounded-xl flex items-center justify-center">
              <Package size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">我的订单</h2>
              <p className="text-slate-400 text-sm">共 {orders.length} 个订单</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadOrders}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              title="刷新"
            >
              <RefreshCw size={18} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* 订单列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="spinner w-8 h-8 border-4 border-slate-600 border-t-primary rounded-full mx-auto mb-4 animate-spin" />
              <p className="text-slate-400">加载中...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400">暂无订单记录</p>
              <p className="text-slate-500 text-sm mt-2">快去挑选心仪的商品吧</p>
            </div>
          ) : selectedOrder ? (
            // 订单详情
            <div className="animate-fade-in">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex items-center gap-1 text-slate-400 hover:text-white mb-4 transition-colors"
              >
                <ChevronRight size={18} className="rotate-180" />
                返回订单列表
              </button>

              <div className="bg-slate-700/30 rounded-xl p-4 space-y-4">
                {/* 订单基本信息 */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">订单号</p>
                    <p className="font-mono text-sm">{selectedOrder.order_no}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm ${statusConfig[selectedOrder.status]?.bg} ${statusConfig[selectedOrder.status]?.color}`}>
                    {statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                  </div>
                </div>

                {/* 商品信息 */}
                <div className="border-t border-slate-600 pt-4">
                  <p className="text-slate-400 text-sm mb-2">商品信息</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedOrder.product_title}</p>
                      {selectedOrder.spec && (
                        <p className="text-slate-400 text-sm">规格: {selectedOrder.spec}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-primary font-bold">¥{selectedOrder.total_price}</p>
                      <p className="text-slate-400 text-sm">x{selectedOrder.quantity}</p>
                    </div>
                  </div>
                </div>

                {/* 卡密信息（如果有） */}
                {selectedOrder.card_keys && (
                  <div className="border-t border-slate-600 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🔑</span>
                      <p className="text-slate-400 text-sm font-medium">卡密信息</p>
                    </div>
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 space-y-3 border border-slate-700">
                      {(() => {
                        // 解析卡密：支持 JSON 数组或分号分隔的字符串
                        let cardKeys = []
                        try {
                          const parsed = JSON.parse(selectedOrder.card_keys)
                          cardKeys = Array.isArray(parsed) ? parsed : [parsed]
                        } catch {
                          // 不是 JSON，尝试用分号分隔（支持中英文分号）
                          cardKeys = selectedOrder.card_keys.split(/[;；\n]/).filter(k => k.trim())
                        }
                        
                        return cardKeys.map((key, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-primary font-bold text-sm">#{idx + 1}</span>
                              <code className="flex-1 text-sm text-green-400 break-all font-mono">{key.trim()}</code>
                            </div>
                            <button
                              onClick={() => copyToClipboard(key.trim(), idx)}
                              className="p-2 hover:bg-slate-600 rounded-lg transition-colors flex-shrink-0 group"
                              title="复制卡密"
                            >
                              {copiedKey === idx ? (
                                <Check size={16} className="text-green-400" />
                              ) : (
                                <Copy size={16} className="text-slate-400 group-hover:text-white" />
                              )}
                            </button>
                          </div>
                        ))
                      })()}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">💡 点击右侧按钮可复制卡密</p>
                  </div>
                )}

                {/* 时间信息 */}
                <div className="border-t border-slate-600 pt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">创建时间</p>
                    <p>{formatDate(selectedOrder.created_at)}</p>
                  </div>
                  {selectedOrder.pay_time && (
                    <div>
                      <p className="text-slate-400">支付时间</p>
                      <p>{formatDate(selectedOrder.pay_time)}</p>
                    </div>
                  )}
                </div>

                {/* 评价按钮 - 仅已完成且有卖家的订单 */}
                {selectedOrder.status === 'completed' && selectedOrder.seller_id && (
                  <div className="border-t border-slate-600 pt-4">
                    {reviewedOrders[selectedOrder.id] ? (
                      <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <CheckCircle size={16} className="text-emerald-400" />
                        <span className="text-sm text-emerald-400">已完成评价</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => openReview(selectedOrder)}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl text-sm font-medium transition-all"
                      >
                        <Star size={16} />
                        评价卖家
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // 订单列表
            <div className="space-y-3">
              {orders.map(order => {
                const StatusIcon = statusConfig[order.status]?.icon || Clock
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="bg-slate-700/30 hover:bg-slate-700/50 rounded-xl p-4 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${statusConfig[order.status]?.bg} ${statusConfig[order.status]?.color}`}>
                            <StatusIcon size={12} />
                            {statusConfig[order.status]?.label || order.status}
                          </span>
                          <span className="text-slate-500 text-xs font-mono">{order.order_no}</span>
                        </div>
                        <p className="font-medium truncate">{order.product_title}</p>
                        <p className="text-slate-400 text-sm">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-primary font-bold">¥{order.total_price}</p>
                        <ChevronRight size={18} className="text-slate-500 ml-auto mt-2" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 评价弹窗 */}
      {showReviewModal && reviewTarget && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={(e) => e.target === e.currentTarget && setShowReviewModal(false)}
        >
          <div className="bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold">评价卖家</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* 目标用户 */}
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-1">评价对象</p>
                <p className="font-medium text-lg">{reviewTarget.targetName}</p>
              </div>

              {/* 星级评分 */}
              <div>
                <p className="text-sm text-slate-400 mb-3 text-center">服务评分</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setReviewHover(s)}
                      onMouseLeave={() => setReviewHover(0)}
                      onClick={() => setReviewScore(s)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        size={32}
                        className={`transition-colors ${
                          s <= (reviewHover || reviewScore)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm mt-2 text-yellow-400 font-medium">
                  {['', '很差', '较差', '一般', '满意', '非常满意'][reviewScore]}
                </p>
              </div>

              {/* 评论输入 */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">评价内容（选填）</label>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="分享您的购物体验..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 outline-none focus:border-indigo-500 resize-none text-sm"
                />
                <p className="text-xs text-slate-500 text-right mt-1">{reviewComment.length}/500</p>
              </div>

              {/* 提交按钮 */}
              <button
                onClick={submitReview}
                disabled={reviewSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl font-medium transition-colors"
              >
                {reviewSubmitting ? (
                  <><Loader2 size={16} className="animate-spin" /> 提交中...</>
                ) : (
                  <><Send size={16} /> 提交评价</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyOrdersModal
