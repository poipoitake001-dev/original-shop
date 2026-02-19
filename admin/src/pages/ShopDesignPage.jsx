import React, { useState, useEffect } from 'react'
import { Palette, Save, RefreshCw, Upload, Image as ImageIcon, Globe, Mail, Phone, Award, Sparkles } from 'lucide-react'
import { adminRequest } from '../utils/api'

const ShopDesignPage = () => {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    setLoading(true)
    console.log('=== 加载店铺装修设置 ===')

    const res = await adminRequest('/settings')
    console.log('加载的数据:', res)

    if (res.code === 200) {
      setSettings(res.data || {})
    } else {
      console.error('加载失败:', res)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)

    console.log('=== 保存店铺装修设置 ===')
    console.log('发送的数据:', settings)
    console.log('数据字段数量:', Object.keys(settings).length)

    try {
      const res = await adminRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      })

      console.log('服务器响应:', res)

      setSaving(false)

      if (res.code === 200) {
        alert('保存成功')
      } else {
        const errorMsg = res.message || '保存失败'
        console.error('保存失败:', errorMsg, res)
        alert(`保存失败: ${errorMsg}`)
      }
    } catch (error) {
      console.error('请求异常:', error)
      setSaving(false)
      alert(`请求失败: ${error.message || '网络错误'}`)
    }
  }

  const handleImageUpload = async (e, field) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB')
      return
    }

    setUploading(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      setSettings({ ...settings, [field]: event.target.result })
      setUploading(false)
    }
    reader.onerror = () => {
      alert('图片读取失败')
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const ImageUploadField = ({ label, field, preview = true, previewSize = 'h-12' }) => (
    <div>
      <label className="block text-sm text-slate-400 mb-2">{label}</label>
      <div className="flex items-start gap-4">
        {preview && settings[field] && (
          <div className="flex-shrink-0 relative group">
            <img
              src={settings[field]}
              alt={label}
              className={`${previewSize} object-contain rounded-lg border-2 border-slate-600 bg-slate-700 p-2`}
              onError={(e) => e.target.style.display = 'none'}
            />
            <button
              onClick={() => setSettings({ ...settings, [field]: '' })}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1">
          <label className={`flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-600 transition ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Upload size={16} />
            <span>{uploading ? '上传中...' : '点击上传图片'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, field)}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return <div className="text-center py-8 text-slate-400">加载中...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">店铺装修</h1>
          <p className="text-sm text-slate-400 mt-1">自定义网站外观、品牌信息和联系方式</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadSettings} className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition">
            <RefreshCw size={16} /> 刷新
          </button>
          <button onClick={handleSave} disabled={saving || uploading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
            <Save size={16} /> {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>

      {/* 基本信息 */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
            <Globe className="text-blue-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">站点信息</h2>
            <p className="text-sm text-slate-400">配置网站的基本信息和 SEO 设置</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">站点名称</label>
            <input type="text" value={settings.site_name || ''} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none transition" placeholder="我的卡密商城" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">页面标题</label>
            <input type="text" value={settings.page_title || ''} onChange={(e) => setSettings({ ...settings, page_title: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none transition" placeholder="显示在浏览器标签上的标题" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">站点描述</label>
            <textarea value={settings.site_description || ''} onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg h-24 focus:border-indigo-500 focus:outline-none transition resize-none" placeholder="简短描述您的网站，用于 SEO 优化" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">页脚文字</label>
            <input type="text" value={settings.footer_text || ''} onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none transition" placeholder="© 2026 我的商城" />
          </div>
        </div>
      </div>

      {/* 外观设置 */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
            <Palette className="text-purple-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">外观设置</h2>
            <p className="text-sm text-slate-400">自定义网站的视觉风格和品牌元素</p>
          </div>
        </div>
        <div className="space-y-4">
          <ImageUploadField label="网站 Logo" field="site_logo_url" />
          <ImageUploadField label="Favicon 图标" field="favicon_url" previewSize="w-8 h-8" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">主题颜色</label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings.theme_color || '#6366f1'} onChange={(e) => setSettings({ ...settings, theme_color: e.target.value })}
                  className="w-12 h-10 rounded cursor-pointer border-0" />
                <input type="text" value={settings.theme_color || '#6366f1'} onChange={(e) => setSettings({ ...settings, theme_color: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none transition" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">背景颜色</label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings.bg_color || '#0f172a'} onChange={(e) => setSettings({ ...settings, bg_color: e.target.value })}
                  className="w-12 h-10 rounded cursor-pointer border-0" />
                <input type="text" value={settings.bg_color || '#0f172a'} onChange={(e) => setSettings({ ...settings, bg_color: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none transition" />
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
      </div>

      {/* 核心优势徽章 */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
            <Award className="text-yellow-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">核心优势徽章</h2>
            <p className="text-sm text-slate-400">展示网站的核心特色和优势，最多配置 3 个</p>
          </div>
        </div>

        {[1, 2, 3].map(num => (
          <div key={num} className="p-4 bg-slate-700/50 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Sparkles size={16} />
              <span>优势 {num}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">标题</label>
                <input
                  type="text"
                  value={settings[`feature_${num}_title`] || ''}
                  onChange={(e) => setSettings({ ...settings, [`feature_${num}_title`]: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none transition text-sm"
                  placeholder={`例如：${num === 1 ? '极速发货' : num === 2 ? '7x24 客服' : '正品保障'}`}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">描述</label>
                <input
                  type="text"
                  value={settings[`feature_${num}_desc`] || ''}
                  onChange={(e) => setSettings({ ...settings, [`feature_${num}_desc`]: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none transition text-sm"
                  placeholder="简短描述"
                />
              </div>
            </div>
            <ImageUploadField
              label="徽章图标"
              field={`feature_${num}_icon`}
              previewSize="w-12 h-12"
            />
          </div>
        ))}
      </div>

      {/* 联系方式 */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
            <Mail className="text-green-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">联系方式</h2>
            <p className="text-sm text-slate-400">配置客服联系信息，方便用户咨询</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">联系邮箱</label>
            <input type="email" value={settings.contact_email || ''} onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none transition" placeholder="support@example.com" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">联系电话</label>
            <input type="text" value={settings.contact_phone || ''} onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none transition" placeholder="400-xxx-xxxx" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">微信号</label>
            <input type="text" value={settings.contact_wechat || ''} onChange={(e) => setSettings({ ...settings, contact_wechat: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none transition" placeholder="微信号" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">QQ 号</label>
            <input type="text" value={settings.contact_qq || ''} onChange={(e) => setSettings({ ...settings, contact_qq: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none transition" placeholder="QQ 号" />
          </div>
        </div>
        <ImageUploadField label="客服二维码" field="contact_qr_url" previewSize="w-32 h-32" />
      </div>

      {/* 社交账号 */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-pink-600/20 rounded-lg flex items-center justify-center">
            <Phone className="text-pink-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">社交账号</h2>
            <p className="text-sm text-slate-400">配置社交媒体链接，扩大品牌影响力</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">微博链接</label>
            <input type="url" value={settings.social_weibo || ''} onChange={(e) => setSettings({ ...settings, social_weibo: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none transition" placeholder="https://weibo.com/..." />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">抖音链接</label>
            <input type="url" value={settings.social_douyin || ''} onChange={(e) => setSettings({ ...settings, social_douyin: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none transition" placeholder="https://douyin.com/..." />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">小红书链接</label>
            <input type="url" value={settings.social_xiaohongshu || ''} onChange={(e) => setSettings({ ...settings, social_xiaohongshu: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none transition" placeholder="https://xiaohongshu.com/..." />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">B站链接</label>
            <input type="url" value={settings.social_bilibili || ''} onChange={(e) => setSettings({ ...settings, social_bilibili: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none transition" placeholder="https://bilibili.com/..." />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShopDesignPage
