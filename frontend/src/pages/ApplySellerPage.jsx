import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Store, ArrowLeft, Clock, CheckCircle, XCircle, Send } from 'lucide-react'
import { authFetch } from '../utils/api'

const ApplySellerPage = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // loading | form | pending | approved | rejected
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    shopName: '',
    realName: '',
    contactPhone: '',
    contactWechat: '',
    shopDescription: '',
    reason: ''
  })

  useEffect(() => {
    const savedUser = localStorage.getItem('user_info')
    if (!savedUser) {
      navigate('/')
      return
    }
    const u = JSON.parse(savedUser)
    setUser(u)

    if (u.role === 'seller') {
      setStatus('approved')
      return
    }

    // Check application status from server (may differ from stale localStorage)
    authFetch('/seller/apply/status').then(async (res) => {
      if (res.code === 200) {
        const { role, sellerStatus, application: app } = res.data
        if (sellerStatus === 'approved' || role === 'seller') {
          setStatus('approved')
          // Refresh token so the JWT has the correct role
          const tokenRes = await authFetch('/customer/refresh-token', { method: 'POST' })
          if (tokenRes.code === 200 && tokenRes.data) {
            localStorage.setItem('user_token', tokenRes.data.token)
            localStorage.setItem('user_info', JSON.stringify(tokenRes.data.user))
            setUser(tokenRes.data.user)
          } else {
            // Fallback: update user_info only
            const updatedUser = { ...u, role: 'seller', sellerStatus: 'approved' }
            localStorage.setItem('user_info', JSON.stringify(updatedUser))
            setUser(updatedUser)
          }
        } else if (sellerStatus === 'pending') {
          setStatus('pending')
          setApplication(app)
        } else if (sellerStatus === 'rejected') {
          setStatus('rejected')
          setApplication(app)
        } else {
          setStatus('form')
        }
      } else {
        setStatus('form')
      }
    })
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.shopName.trim() || !form.realName.trim()) {
      setError('请填写店铺名称和真实姓名')
      return
    }

    setLoading(true)
    setError('')

    const res = await authFetch('/seller/apply', {
      method: 'POST',
      body: form,
    })

    setLoading(false)

    if (res.code === 200) {
      setStatus('pending')
    } else {
      setError(res.message || '提交失败')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900/80 border-b border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Store size={20} className="text-indigo-400" />
            卖家入驻
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Approved */}
        {status === 'approved' && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">申请已通过</h2>
            <p className="text-gray-400 mb-8">恭喜！您已成为卖家，可以开始管理您的店铺了。</p>
            <Link
              to="/seller"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition-colors"
            >
              <Store size={18} />
              进入卖家中心
            </Link>
          </div>
        )}

        {/* Pending */}
        {status === 'pending' && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock size={40} className="text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">审核中</h2>
            <p className="text-gray-400 mb-4">您的卖家申请正在审核中，请耐心等待管理员审批。</p>
            {application && (
              <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6 text-left">
                <h3 className="font-medium mb-4 text-gray-300">申请详情</h3>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>店铺名称：<span className="text-white">{application.shop_name}</span></p>
                  <p>真实姓名：<span className="text-white">{application.real_name}</span></p>
                  <p>提交时间：<span className="text-white">{new Date(application.created_at).toLocaleString('zh-CN')}</span></p>
                </div>
              </div>
            )}
            <Link to="/" className="inline-block mt-8 text-gray-400 hover:text-white transition-colors">
              返回商城
            </Link>
          </div>
        )}

        {/* Rejected */}
        {status === 'rejected' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} className="text-red-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">申请未通过</h2>
            {application?.admin_note && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300 text-sm">
                拒绝原因：{application.admin_note}
              </div>
            )}
            <p className="text-gray-400 mb-6">您可以修改信息后重新申请。</p>
            <button
              onClick={() => setStatus('form')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition-colors"
            >
              重新申请
            </button>
          </div>
        )}

        {/* Application Form */}
        {status === 'form' && (
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store size={32} className="text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">申请成为卖家</h2>
              <p className="text-gray-400">填写以下信息，提交后等待管理员审核</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">店铺名称 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.shopName}
                  onChange={e => setForm(f => ({ ...f, shopName: e.target.value }))}
                  placeholder="为您的店铺起一个好名字"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">真实姓名 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.realName}
                  onChange={e => setForm(f => ({ ...f, realName: e.target.value }))}
                  placeholder="用于实名认证"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">联系电话</label>
                  <input
                    type="text"
                    value={form.contactPhone}
                    onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
                    placeholder="选填"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">微信号</label>
                  <input
                    type="text"
                    value={form.contactWechat}
                    onChange={e => setForm(f => ({ ...f, contactWechat: e.target.value }))}
                    placeholder="选填"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">店铺简介</label>
                <textarea
                  value={form.shopDescription}
                  onChange={e => setForm(f => ({ ...f, shopDescription: e.target.value }))}
                  placeholder="简要描述您的店铺经营范围"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">申请理由</label>
                <textarea
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="说明您想成为卖家的理由"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Send size={18} />
                    提交申请
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default ApplySellerPage
