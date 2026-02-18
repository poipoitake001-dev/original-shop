import React, { useState, useEffect } from 'react'
import { X, Megaphone, ChevronLeft, ChevronRight, Image, Video } from 'lucide-react'
import { API_BASE } from '../utils/api'

const AnnouncementBar = () => {
  const [announcements, setAnnouncements] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedMedia, setExpandedMedia] = useState(false)

  // 获取公告列表
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch(`${API_BASE}/announcements`)
        const data = await res.json()
        if (data.code === 200 && data.data?.list?.length > 0) {
          setAnnouncements(data.data.list)
        }
      } catch (error) {
        console.error('获取公告失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAnnouncements()
  }, [])

  // 自动轮播
  useEffect(() => {
    if (announcements.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % announcements.length)
      setExpandedMedia(false)
    }, 5000)
    return () => clearInterval(timer)
  }, [announcements.length])

  // 检查是否被用户关闭过（本次会话）
  useEffect(() => {
    const closed = sessionStorage.getItem('announcement_closed')
    if (closed === 'true') {
      setIsVisible(false)
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    sessionStorage.setItem('announcement_closed', 'true')
  }

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + announcements.length) % announcements.length)
    setExpandedMedia(false)
  }

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % announcements.length)
    setExpandedMedia(false)
  }

  // 不显示的情况：加载中、无公告、用户关闭
  if (isLoading || announcements.length === 0 || !isVisible) {
    return null
  }

  const current = announcements[currentIndex]
  const bgColor = current.bg_color || '#6366f1'
  const isMediaType = current.type === 'image' || current.type === 'video'

  // 渲染公告内容
  const renderContent = () => {
    const contentText = current.content || ''
    
    // 文字类型公告
    if (current.type === 'text' || !current.type) {
      if (current.link) {
        return (
          <a 
            href={current.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white text-sm font-medium hover:underline truncate block"
          >
            {contentText}
          </a>
        )
      }
      return (
        <span className="text-white text-sm font-medium truncate block">
          {contentText}
        </span>
      )
    }

    // 媒体类型公告（图片/视频）
    return (
      <div className="flex items-center justify-center gap-2">
        {current.type === 'image' && <Image size={14} className="text-white/80" />}
        {current.type === 'video' && <Video size={14} className="text-white/80" />}
        <button
          onClick={() => setExpandedMedia(!expandedMedia)}
          className="text-white text-sm font-medium hover:underline"
        >
          {contentText || (current.type === 'image' ? '查看图片公告' : '查看视频公告')}
          {expandedMedia ? ' ▲' : ' ▼'}
        </button>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden transition-all duration-300">
      {/* 主公告栏 */}
      <div 
        style={{ background: `linear-gradient(90deg, ${bgColor} 0%, ${bgColor}dd 100%)` }}
      >
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3">
          {/* 图标 */}
          <Megaphone size={16} className="text-white/90 flex-shrink-0" />
          
          {/* 切换按钮（多条时显示） */}
          {announcements.length > 1 && (
            <button 
              onClick={handlePrev}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <ChevronLeft size={16} className="text-white/80" />
            </button>
          )}

          {/* 公告内容 */}
          <div className="flex-1 text-center min-w-0">
            {renderContent()}
          </div>

          {/* 切换按钮（多条时显示） */}
          {announcements.length > 1 && (
            <button 
              onClick={handleNext}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <ChevronRight size={16} className="text-white/80" />
            </button>
          )}

          {/* 指示器（多条时显示） */}
          {announcements.length > 1 && (
            <div className="flex gap-1 ml-2">
              {announcements.map((_, idx) => (
                <span 
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    idx === currentIndex ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}

          {/* 关闭按钮 */}
          <button 
            onClick={handleClose}
            className="p-1 hover:bg-white/20 rounded transition-colors ml-2 flex-shrink-0"
            title="关闭公告"
          >
            <X size={16} className="text-white/80" />
          </button>
        </div>
      </div>

      {/* 媒体展开区域 */}
      {isMediaType && expandedMedia && current.media_url && (
        <div 
          className="bg-slate-900/95 backdrop-blur-sm border-t border-slate-700"
          style={{ borderColor: `${bgColor}40` }}
        >
          <div className="max-w-4xl mx-auto px-4 py-4">
            {current.type === 'image' && (
              <div className="flex justify-center">
                {current.link ? (
                  <a href={current.link} target="_blank" rel="noopener noreferrer">
                    <img 
                      src={current.media_url} 
                      alt={current.content || '公告图片'}
                      className="max-h-64 rounded-lg shadow-lg hover:scale-105 transition-transform cursor-pointer"
                      style={{ maxWidth: '100%' }}
                    />
                  </a>
                ) : (
                  <img 
                    src={current.media_url} 
                    alt={current.content || '公告图片'}
                    className="max-h-64 rounded-lg shadow-lg"
                    style={{ maxWidth: '100%' }}
                  />
                )}
              </div>
            )}
            {current.type === 'video' && (
              <div className="flex justify-center">
                <video 
                  src={current.media_url}
                  controls
                  className="max-h-64 rounded-lg shadow-lg"
                  style={{ maxWidth: '100%' }}
                >
                  您的浏览器不支持视频播放
                </video>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AnnouncementBar
