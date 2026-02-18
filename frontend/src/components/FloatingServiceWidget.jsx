import React, { useState, useEffect } from 'react'
import { Bot, Mail, Phone, X, MessageCircle, Sparkles } from 'lucide-react'
import { API_BASE } from '../utils/api'

// 默认二维码（可选）
import defaultQr from '../assets/cs-qr.jpg'

const FloatingServiceWidget = () => {
  const [settings, setSettings] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showPopup, setShowPopup] = useState(false)
  const [imageError, setImageError] = useState(false)

  // 获取客服设置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/settings/public`)
        const data = await res.json()
        if (data.code === 200 && data.data) {
          setSettings(data.data)
        }
      } catch (error) {
        console.error('获取客服设置失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // 确定要显示的二维码 URL
  const qrUrl = settings?.contact_qr_url || defaultQr
  const hasQrCode = settings?.contact_qr_url || defaultQr
  const hasContactInfo = settings?.contact_wechat || settings?.contact_email || settings?.contact_phone

  // 如果没有任何联系方式，使用默认二维码
  const shouldShowWidget = hasQrCode || hasContactInfo

  if (isLoading) {
    return null // 加载中不显示
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* 弹出层 */}
      {showPopup && shouldShowWidget && (
        <div className="absolute bottom-full right-0 mb-4 animate-fade-in">
          <div className="bg-slate-800/95 backdrop-blur-lg rounded-2xl border border-slate-700 shadow-2xl p-5 min-w-[220px]">
            {/* 关闭按钮 */}
            <button 
              onClick={() => setShowPopup(false)}
              className="absolute top-3 right-3 p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={16} className="text-slate-400" />
            </button>

            {/* 头部 */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-500 rounded-xl flex items-center justify-center">
                <Bot size={22} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">智能客服</p>
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  在线
                </p>
              </div>
            </div>
            
            {/* 二维码 */}
            {hasQrCode && !imageError && (
              <div className="mb-4">
                <div className="bg-white p-2 rounded-xl">
                  <img 
                    src={qrUrl}
                    alt="客服二维码" 
                    className="w-40 h-40 mx-auto rounded-lg object-cover"
                    onError={() => setImageError(true)}
                  />
                </div>
                <p className="text-xs text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
                  <Sparkles size={12} className="text-primary" />
                  扫码添加专属客服
                </p>
              </div>
            )}

            {/* 联系方式 */}
            {hasContactInfo && (
              <div className="space-y-2.5 pt-3 border-t border-slate-700">
                {settings?.contact_wechat && (
                  <div className="flex items-center gap-3 text-sm text-slate-300 bg-slate-700/50 px-3 py-2 rounded-lg">
                    <MessageCircle size={16} className="text-green-400 flex-shrink-0" />
                    <span className="truncate">微信: {settings.contact_wechat}</span>
                  </div>
                )}
                {settings?.contact_email && (
                  <a 
                    href={`mailto:${settings.contact_email}`} 
                    className="flex items-center gap-3 text-sm text-slate-300 bg-slate-700/50 px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Mail size={16} className="text-blue-400 flex-shrink-0" />
                    <span className="truncate">{settings.contact_email}</span>
                  </a>
                )}
                {settings?.contact_phone && (
                  <a 
                    href={`tel:${settings.contact_phone}`}
                    className="flex items-center gap-3 text-sm text-slate-300 bg-slate-700/50 px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Phone size={16} className="text-yellow-400 flex-shrink-0" />
                    <span>{settings.contact_phone}</span>
                  </a>
                )}
              </div>
            )}

            {/* 如果什么都没有 */}
            {!hasQrCode && !hasContactInfo && (
              <p className="text-slate-500 text-sm text-center py-4">
                暂无客服信息
              </p>
            )}
          </div>
          
          {/* 箭头 */}
          <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-3 h-3 bg-slate-800 border-r border-b border-slate-700"></div>
        </div>
      )}

      {/* 客服按钮 - 带脉冲发光效果 */}
      <div className="relative">
        {/* 脉冲发光圈 */}
        {!showPopup && (
          <>
            <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping"></div>
            <div className="absolute inset-[-4px] rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 blur-md animate-pulse"></div>
          </>
        )}
        
        <button 
          onClick={() => setShowPopup(!showPopup)}
          className={`
            relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center 
            transition-all duration-300 hover:scale-110
            ${showPopup 
              ? 'bg-slate-700 shadow-slate-900/30' 
              : 'bg-gradient-to-br from-primary to-purple-500 shadow-primary/40'
            }
          `}
          title="联系客服"
        >
          {showPopup ? (
            <X size={24} className="text-white" />
          ) : (
            <Bot size={26} className="text-white" />
          )}
        </button>
      </div>
    </div>
  )
}

export default FloatingServiceWidget
