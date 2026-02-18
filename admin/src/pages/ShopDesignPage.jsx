import React, { useState, useEffect } from 'react'
import { Palette, Save, RefreshCw, Image, Type, Mail, Phone, MessageSquare } from 'lucide-react'
import { adminRequest } from '../utils/api'

const ShopDesignPage = () => {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

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
    else alert(res.message || '保存失败')
  }

  const tabs = [
    { id: 'basic', label: '基本信息', icon: Type },
    { id: 'appearance', label: '外观设置', icon: Palette },
    { id: 'contact', label: '联系方式', icon: Mail },
  ]

  if (loading) {
    return <div className="text-center py-8 text-slate-400">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">店铺装修</h1>
        <div className="flex gap-2">
          <button onClick={loadSettings} className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">
            <RefreshCw size={16} /> 刷新
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            <Save size={16} /> {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* 基本信息 */}
      {activeTab === 'basic' && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm text-slate-400 mb-2">站点名称</label>
            <input type="text" value={settings.site_name || ''} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg" placeholder="我的卡密商城" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">页面标题</label>
            <input type="text" value={settings.page_title || ''} onChange={(e) => setSettings({ ...settings, page_title: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg" placeholder="显示在浏览器标签上的标题" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">站点描述</label>
            <textarea value={settings.site_description || ''} onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg h-24" placeholder="简短描述您的网站" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">页脚文字</label>
            <input type="text" value={settings.footer_text || ''} onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg" placeholder="© 2024 我的商城" />
          </div>
        </div>
      )}

      {/* 外观设置 */}
      {activeTab === 'appearance' && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Logo 图片地址</label>
            <input type="text" value={settings.site_logo_url || ''} onChange={(e) => setSettings({ ...settings, site_logo_url: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg" placeholder="https://..." />
            {settings.site_logo_url && (
              <div className="mt-2 p-2 bg-slate-700 rounded-lg inline-block">
                <img src={settings.site_logo_url} alt="Logo" className="h-12 object-contain" onError={(e) => e.target.style.display = 'none'} />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Favicon 图标地址</label>
            <input type="text" value={settings.favicon_url || ''} onChange={(e) => setSettings({ ...settings, favicon_url: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg" placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">主题颜色</label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings.theme_color || '#6366f1'} onChange={(e) => setSettings({ ...settings, theme_color: e.target.value })}
                  className="w-12 h-10 rounded cursor-pointer border-0" />
                <input type="text" value={settings.theme_color || '#6366f1'} onChange={(e) => setSettings({ ...settings, theme_color: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">背景颜色</label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings.bg_color || '#0f172a'} onChange={(e) => setSettings({ ...settings, bg_color: e.target.value })}
                  className="w-12 h-10 rounded cursor-pointer border-0" />
                <input type="text" value={settings.bg_color || '#0f172a'} onChange={(e) => setSettings({ ...settings, bg_color: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg border border-slate-600" style={{ backgroundColor: settings.bg_color || '#0f172a' }}>
            <p className="text-sm text-slate-400 mb-2">预览效果</p>
            <button className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: settings.theme_color || '#6366f1' }}>
              主题按钮
            </button>
          </div>
        </div>
      )}

      {/* 联系方式 */}
      {activeTab === 'contact' && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm text-slate-400 mb-2">联系邮箱</label>
            <input type="email" value={settings.contact_email || ''} onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg" placeholder="support@example.com" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">联系电话</label>
            <input type="text" value={settings.contact_phone || ''} onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg" placeholder="400-xxx-xxxx" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">微信号</label>
            <input type="text" value={settings.contact_wechat || ''} onChange={(e) => setSettings({ ...settings, contact_wechat: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg" placeholder="微信号" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">客服二维码图片地址</label>
            <input type="text" value={settings.contact_qr_url || ''} onChange={(e) => setSettings({ ...settings, contact_qr_url: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg" placeholder="https://..." />
            {settings.contact_qr_url && (
              <div className="mt-2 p-2 bg-slate-700 rounded-lg inline-block">
                <img src={settings.contact_qr_url} alt="QR" className="w-32 h-32 object-contain" onError={(e) => e.target.style.display = 'none'} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ShopDesignPage
