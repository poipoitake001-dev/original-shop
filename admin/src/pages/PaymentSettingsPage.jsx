import React, { useState, useEffect } from 'react'
import { CreditCard, Save, RefreshCw, Upload, Image as ImageIcon, QrCode } from 'lucide-react'
import { adminRequest } from '../utils/api'

const PaymentSettingsPage = () => {
  const [settings, setSettings] = useState({
    // API 网关支付
    gateway_enabled: false,
    gateway_url: '',
    gateway_merchant_id: '',
    gateway_merchant_key: '',
    gateway_notify_url: '',
    
    // 手动二维码支付
    manual_qr_enabled: false,
    manual_qr_image: '',
    manual_qr_description: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    setLoading(true)
    const res = await adminRequest('/admin/settings')
    if (res.code === 200) {
      const data = res.data || {}
      setSettings({
        gateway_enabled: data.gateway_enabled || false,
        gateway_url: data.gateway_url || '',
        gateway_merchant_id: data.gateway_merchant_id || '',
        gateway_merchant_key: data.gateway_merchant_key || '',
        gateway_notify_url: data.gateway_notify_url || `${window.location.origin}/api/payment/notify`,
        manual_qr_enabled: data.manual_qr_enabled || false,
        manual_qr_image: data.manual_qr_image || '',
        manual_qr_description: data.manual_qr_description || '请扫描二维码完成支付，支付后请联系客服确认订单'
      })
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
    } else {
      alert(res.message || '保存失败')
    }
  }

  const handleImageUpload = async (e, field) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }

    // 验证文件大小（限制 2MB）
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB')
      return
    }

    setUploading(true)
    
    // 转换为 Base64
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target.result
      setSettings({ ...settings, [field]: base64 })
      setUploading(false)
    }
    reader.onerror = () => {
      alert('图片读取失败')
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-400">加载中...</div>
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">支付设置</h1>
          <p className="text-sm text-slate-400 mt-1">配置网站的支付方式和参数</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadSettings} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
          >
            <RefreshCw size={16} /> 刷新
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving || uploading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Save size={16} /> {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>

      {/* API 网关支付 */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
              <CreditCard className="text-indigo-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">API 网关支付</h2>
              <p className="text-sm text-slate-400">对接第三方支付网关，自动处理支付回调</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={settings.gateway_enabled}
              onChange={(e) => setSettings({ ...settings, gateway_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">API 网关地址</label>
            <input 
              type="text" 
              value={settings.gateway_url} 
              onChange={(e) => setSettings({ ...settings, gateway_url: e.target.value })}
              disabled={!settings.gateway_enabled}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:border-indigo-500 focus:outline-none transition" 
              placeholder="https://api.payment-gateway.com" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">商户 ID</label>
              <input 
                type="text" 
                value={settings.gateway_merchant_id} 
                onChange={(e) => setSettings({ ...settings, gateway_merchant_id: e.target.value })}
                disabled={!settings.gateway_enabled}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:border-indigo-500 focus:outline-none transition" 
                placeholder="merchant_123456" 
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">商户密钥</label>
              <input 
                type="password" 
                value={settings.gateway_merchant_key} 
                onChange={(e) => setSettings({ ...settings, gateway_merchant_key: e.target.value })}
                disabled={!settings.gateway_enabled}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:border-indigo-500 focus:outline-none transition" 
                placeholder="••••••••••••••••" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">异步通知地址（只读）</label>
            <input 
              type="text" 
              value={settings.gateway_notify_url} 
              readOnly
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg cursor-not-allowed text-slate-400" 
            />
            <p className="text-xs text-slate-500 mt-1">此地址用于接收支付网关的异步通知，请在支付网关后台配置</p>
          </div>
        </div>
      </div>

      {/* 手动二维码支付 */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
              <QrCode className="text-green-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">手动二维码支付</h2>
              <p className="text-sm text-slate-400">展示收款二维码，用户支付后手动确认订单</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={settings.manual_qr_enabled}
              onChange={(e) => setSettings({ ...settings, manual_qr_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">收款二维码</label>
            <div className="flex items-start gap-4">
              {/* 图片预览 */}
              <div className="flex-shrink-0">
                {settings.manual_qr_image ? (
                  <div className="relative group">
                    <img 
                      src={settings.manual_qr_image} 
                      alt="收款二维码" 
                      className="w-32 h-32 object-cover rounded-lg border-2 border-slate-600"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="128"%3E%3Crect fill="%23334155" width="128" height="128"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-size="14"%3E加载失败%3C/text%3E%3C/svg%3E'
                      }}
                    />
                    <button
                      onClick={() => setSettings({ ...settings, manual_qr_image: '' })}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-slate-700 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center">
                    <ImageIcon className="text-slate-500" size={32} />
                  </div>
                )}
              </div>

              {/* 上传按钮 */}
              <div className="flex-1">
                <label className={`flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-600 transition ${!settings.manual_qr_enabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Upload size={16} />
                  <span>{uploading ? '上传中...' : '点击上传图片'}</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'manual_qr_image')}
                    disabled={!settings.manual_qr_enabled || uploading}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-slate-500 mt-2">支持 JPG、PNG 格式，建议尺寸 400x400 像素，大小不超过 2MB</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">支付说明</label>
            <textarea 
              value={settings.manual_qr_description} 
              onChange={(e) => setSettings({ ...settings, manual_qr_description: e.target.value })}
              disabled={!settings.manual_qr_enabled}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg h-24 disabled:opacity-50 disabled:cursor-not-allowed focus:border-green-500 focus:outline-none transition resize-none" 
              placeholder="请输入支付说明文字，例如：请扫描二维码完成支付，支付后请联系客服确认订单"
            />
            <p className="text-xs text-slate-500 mt-1">此文字将显示在支付页面，引导用户完成支付</p>
          </div>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">支付方式说明</p>
            <ul className="space-y-1 text-blue-300/80">
              <li>• API 网关支付：适合有技术对接能力的商户，支持自动到账和订单状态更新</li>
              <li>• 手动二维码支付：适合个人或小型商户，需要手动确认订单状态</li>
              <li>• 两种支付方式可以同时启用，用户可在支付页面选择</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentSettingsPage
