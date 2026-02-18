import React, { useState, useEffect, useCallback } from 'react'
import { X, Clock, CheckCircle, AlertCircle, RefreshCw, Copy, CreditCard, QrCode, Zap, AlertTriangle } from 'lucide-react'
import { OrderStorage } from '../utils/storage'

// API 基础地址
const API_BASE = import.meta.env.VITE_API_URL || '/api'

// 获取公开支付配置
const fetchPaymentConfig = async () => {
  try {
    const res = await fetch(`${API_BASE}/admin/payment-config/public`)
    const data = await res.json()
    if (data.code === 200) {
      return data.data
    }
    return null
  } catch {
    return null
  }
}

// 查询订单支付状态 API
const checkPaymentStatus = async (orderNo) => {
  try {
    const res = await fetch(`${API_BASE}/orders/query/${orderNo}`)
    const data = await res.json()
    if (data.code === 200) {
      return data.data.status
    }
    return null
  } catch {
    return null
  }
}

// 创建支付网关URL（System 1）
const createPaymentUrl = async (orderId, orderNo, amount) => {
  try {
    const res = await fetch(`${API_BASE}/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, orderNo, amount })
    })
    const data = await res.json()
    if (data.code === 200) {
      return data.data.payUrl
    }
    return null
  } catch {
    return null
  }
}

const PaymentPage = ({ isOpen, order, onClose, onSuccess, showToast }) => {
  const [timeLeft, setTimeLeft] = useState(300) // 5分钟倒计时
  const [paymentStatus, setPaymentStatus] = useState('pending') // pending, checking, success, failed, expired
  const [copied, setCopied] = useState(false)
  const [paymentConfig, setPaymentConfig] = useState(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('system1') // system1 or system2
  const [redirecting, setRedirecting] = useState(false)

  // 加载支付配置
  useEffect(() => {
    if (isOpen) {
      setConfigLoading(true)
      fetchPaymentConfig().then(config => {
        setPaymentConfig(config)
        setConfigLoading(false)
        // 自动选择可用的支付方式
        if (config) {
          if (config.system1Available && !config.system2Available) {
            setActiveTab('system1')
          } else if (!config.system1Available && config.system2Available) {
            setActiveTab('system2')
          } else if (config.system1Available && config.system2Available) {
            setActiveTab('system1') // 默认快速支付
          }
        }
      })
    }
  }, [isOpen])

  // 倒计时
  useEffect(() => {
    if (!isOpen || paymentStatus !== 'pending') return
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setPaymentStatus('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, paymentStatus])

  // 轮询检测支付状态
  useEffect(() => {
    if (!isOpen || !order?.orderNo || paymentStatus !== 'pending') return

    const pollInterval = setInterval(async () => {
      const status = await checkPaymentStatus(order.orderNo)
      
      if (status === 'paid' || status === 'delivered' || status === 'completed') {
        setPaymentStatus('success')
        clearInterval(pollInterval)
        
        // 保存到本地存储
        OrderStorage.save({
          id: order.orderNo,
          email: order.email,
          total: order.total,
          items: [{ name: order.productTitle, quantity: order.quantity, icon: '📦' }],
          date: new Date().toISOString(),
          status: 'paid'
        })
        
        showToast('支付成功！正在打开订单详情...', 'success')
        
        // 支付成功后自动打开订单列表
        setTimeout(() => {
          onSuccess(true)
          onClose()
        }, 1500)
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [isOpen, order, paymentStatus])

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(300)
      setPaymentStatus('pending')
      setCopied(false)
      setRedirecting(false)
    }
  }, [isOpen])

  // 格式化时间
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分钟${secs.toString().padStart(2, '0')}秒`
  }

  // 复制订单号
  const handleCopyOrderNo = () => {
    navigator.clipboard.writeText(order?.orderNo || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 处理快速支付（System 1 - 跳转支付网关）
  const handleFastPayment = async () => {
    setRedirecting(true)
    showToast('正在跳转到支付页面...', 'info')
    
    const payUrl = await createPaymentUrl(order.orderId, order.orderNo, order.total)
    
    if (payUrl) {
      // 跳转到支付网关
      window.location.href = payUrl
    } else {
      setRedirecting(false)
      showToast('创建支付链接失败，请重试', 'error')
    }
  }

  // 处理"我已支付"按钮
  const [checkingPayment, setCheckingPayment] = useState(false)
  
  const handleManualPaymentConfirm = async () => {
    if (checkingPayment) return
    
    setCheckingPayment(true)
    showToast('正在查询支付状态...', 'info')
    
    try {
      const status = await checkPaymentStatus(order.orderNo)
      
      if (status === 'paid' || status === 'delivered' || status === 'completed') {
        setPaymentStatus('success')
      } else {
        // 状态仍为 pending，显示友好提示
        showToast('付款确认正在进行中，请等待最多30秒。系统将自动检测支付结果。', 'warning')
      }
    } catch (error) {
      showToast('查询失败，请稍后再试', 'error')
    } finally {
      setCheckingPayment(false)
    }
  }

  if (!isOpen || !order) return null

  // 判断支付系统可用性
  const system1Available = paymentConfig?.system1Available
  const system2Available = paymentConfig?.system2Available
  const bothAvailable = system1Available && system2Available
  const noneAvailable = !system1Available && !system2Available

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[95vh] overflow-y-auto shadow-2xl text-gray-800">
        {/* 头部 - 金额显示 */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X size={18} />
          </button>
          
          <p className="text-5xl font-bold mb-2">¥{order.total}</p>
          
          {paymentStatus === 'pending' && (
            <div className="flex items-center justify-center gap-2 text-blue-100">
              <Clock size={16} />
              <span>过期时间：{formatTime(timeLeft)}</span>
            </div>
          )}
          
          {paymentStatus === 'success' && (
            <div className="flex items-center justify-center gap-2 text-green-200">
              <CheckCircle size={20} />
              <span className="text-lg">支付成功</span>
            </div>
          )}
          
          {paymentStatus === 'expired' && (
            <div className="flex items-center justify-center gap-2 text-red-200">
              <AlertCircle size={20} />
              <span>订单已过期</span>
            </div>
          )}
        </div>

        {/* 加载中 */}
        {configLoading && (
          <div className="p-12 text-center">
            <RefreshCw size={32} className="animate-spin mx-auto text-blue-500 mb-4" />
            <p className="text-gray-500">加载支付方式...</p>
          </div>
        )}

        {/* 维护模式 - 没有可用的支付方式 */}
        {!configLoading && noneAvailable && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={40} className="text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">维护模式</h3>
            <p className="text-gray-500 mb-6">暂无可用的支付方式，请稍后再试或联系客服</p>
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl text-gray-700 font-medium transition-colors"
            >
              返回
            </button>
          </div>
        )}

        {/* 支付内容区域 */}
        {!configLoading && !noneAvailable && paymentStatus !== 'success' && paymentStatus !== 'expired' && (
          <>
            {/* 标签切换 - 两种支付都可用时显示 */}
            {bothAvailable && (
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('system1')}
                  className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${
                    activeTab === 'system1'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Zap size={18} />
                  快速支付
                </button>
                <button
                  onClick={() => setActiveTab('system2')}
                  className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${
                    activeTab === 'system2'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <QrCode size={18} />
                  扫码支付
                </button>
              </div>
            )}

            {/* System 1: 快速支付 */}
            {((system1Available && !system2Available) || (bothAvailable && activeTab === 'system1')) && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <CreditCard size={48} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">在线快速支付</h3>
                  <p className="text-gray-500 text-sm">点击下方按钮跳转至安全支付页面</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-500 text-lg">💡</span>
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">支持多种支付方式</p>
                      <p className="text-blue-600">支付宝、微信支付、银行卡等</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleFastPayment}
                  disabled={redirecting}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {redirecting ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      跳转中...
                    </>
                  ) : (
                    <>
                      <Zap size={20} />
                      立即支付 ¥{order.total}
                    </>
                  )}
                </button>

                {/* 我已付款辅助按钮 */}
                <button
                  onClick={handleManualPaymentConfirm}
                  disabled={checkingPayment}
                  className="w-full mt-3 py-3 border-2 border-green-500 text-green-600 hover:bg-green-50 font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {checkingPayment ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      查询中...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      我已付款
                    </>
                  )}
                </button>
                <p className="text-center text-gray-400 text-xs mt-2">
                  支付完成后点击此按钮确认，或等待系统自动检测
                </p>
              </div>
            )}

            {/* System 2: 扫码支付 */}
            {((system2Available && !system1Available) || (bothAvailable && activeTab === 'system2')) && (
              <div className="p-6">
                {/* 二维码区域 */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="absolute -inset-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl transform rotate-3"></div>
                    <div className="absolute -inset-3 bg-gradient-to-l from-blue-100 to-cyan-100 rounded-2xl transform -rotate-3"></div>
                    
                    <div className="relative bg-white p-4 rounded-xl shadow-lg">
                      {paymentConfig?.system2?.qrCodeImageUrl ? (
                        <img 
                          src={paymentConfig.system2.qrCodeImageUrl} 
                          alt="收款二维码" 
                          className="w-48 h-48 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded-lg">
                          <div className="text-center text-gray-400">
                            <QrCode size={48} className="mx-auto mb-2" />
                            <p className="text-sm">二维码未配置</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 支付说明 */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-500 text-lg">💡</span>
                    <p className="text-sm text-yellow-700">
                      {paymentConfig?.system2?.instructionText || '请使用微信或支付宝扫描二维码完成支付'}
                    </p>
                  </div>
                </div>

                {/* 金额提醒 */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-red-600 font-medium">请务必支付准确金额</span>
                    <span className="text-red-600 font-bold text-xl">¥{order.total}</span>
                  </div>
                </div>

                {/* 我已支付按钮 */}
                <button
                  onClick={handleManualPaymentConfirm}
                  disabled={checkingPayment}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {checkingPayment ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      查询中...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      我已支付
                    </>
                  )}
                </button>

                <p className="text-center text-gray-400 text-xs mt-3">
                  付款确认正在进行中，请等待最多30秒
                </p>
              </div>
            )}
          </>
        )}

        {/* 支付成功 */}
        {paymentStatus === 'success' && (
          <div className="p-8 text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={48} className="text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">支付成功</h3>
            <p className="text-gray-500 mb-6">卡密将发送到您的邮箱</p>
            <button 
              onClick={() => { onSuccess(); onClose(); }}
              className="px-8 py-3 bg-green-500 hover:bg-green-600 rounded-xl text-white font-medium transition-colors"
            >
              完成
            </button>
          </div>
        )}

        {/* 订单过期 */}
        {paymentStatus === 'expired' && (
          <div className="p-8 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={48} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">订单已过期</h3>
            <p className="text-gray-500 mb-6">请重新下单</p>
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-gray-500 hover:bg-gray-600 rounded-xl text-white font-medium transition-colors"
            >
              关闭
            </button>
          </div>
        )}

        {/* 订单摘要 - 始终显示 */}
        {!configLoading && !noneAvailable && (
          <div className="mx-6 mb-4 bg-gray-50 rounded-xl p-4">
            <h3 className="text-center font-semibold text-gray-600 mb-4 pb-2 border-b border-gray-200">订单摘要</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">订单金额</span>
                <span className="font-bold text-blue-600">¥{order.total}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">商品名称</span>
                <span className="text-gray-800 text-right max-w-[200px] truncate">{order.productTitle}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">购买数量</span>
                <span className="text-gray-800">{order.quantity}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">支付方式</span>
                <span className="text-gray-800">
                  {bothAvailable ? (activeTab === 'system1' ? '在线支付' : '扫码支付') : 
                   system1Available ? '在线支付' : '扫码支付'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">接收邮箱</span>
                <span className="text-gray-800">{order.email}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">订单号</span>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-mono text-xs">#{order.orderNo}</span>
                  <button 
                    onClick={handleCopyOrderNo}
                    className="text-blue-500 hover:text-blue-600"
                  >
                    <Copy size={12} />
                  </button>
                  {copied && <span className="text-xs text-green-500">已复制</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 底部操作区 */}
        {!configLoading && !noneAvailable && paymentStatus === 'pending' && (
          <div className="p-4 border-t border-gray-100">
            <button 
              onClick={onClose}
              className="w-full py-3 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              取消支付
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default PaymentPage
