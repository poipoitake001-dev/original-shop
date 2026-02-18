import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Play, Pause, Sparkles } from 'lucide-react'
import { API_BASE } from '../utils/api'

const HeroBanner = () => {
  const [announcements, setAnnouncements] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const videoRef = useRef(null)
  const autoPlayRef = useRef(null)

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
    if (announcements.length <= 1 || isPaused) return
    
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % announcements.length)
    }, 6000)
    
    return () => clearInterval(autoPlayRef.current)
  }, [announcements.length, isPaused])

  // 处理视频静音切换
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted, currentIndex])

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + announcements.length) % announcements.length)
  }

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % announcements.length)
  }

  const handleDotClick = (index) => {
    setCurrentIndex(index)
  }

  if (isLoading) {
    return (
      <div className="hero-banner-skeleton">
        <div className="animate-pulse bg-slate-800/50 rounded-2xl h-64 md:h-80 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-slate-600 animate-spin" />
        </div>
      </div>
    )
  }

  if (announcements.length === 0) {
    // 默认欢迎横幅
    return (
      <div className="hero-banner-default">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-purple-900/30 to-slate-900 border border-primary/30 shadow-glow">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9IiM2MzY2ZjEiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9nPjwvc3ZnPg==')] opacity-50"></div>
          <div className="relative px-6 py-16 md:py-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full text-primary text-sm mb-4">
              <Sparkles size={16} />
              <span>星际探索者专属</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-primary bg-clip-text text-transparent">
              欢迎来到星际卡密商城
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              探索宇宙级的数字商品，开启您的星际之旅
            </p>
          </div>
        </div>
      </div>
    )
  }

  const current = announcements[currentIndex]
  const bgColor = current.bg_color || '#6366f1'

  // 渲染不同类型的内容
  const renderContent = () => {
    switch (current.type) {
      case 'video':
        return (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              src={current.media_url}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="w-full h-full object-cover"
            />
            {/* 视频覆盖层 */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/40"></div>
            {/* 文字内容 */}
            {current.content && (
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <p className="text-white text-lg md:text-2xl font-medium drop-shadow-lg">
                  {current.content}
                </p>
              </div>
            )}
            {/* 视频控制按钮 */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-full backdrop-blur-sm transition-all"
                title={isMuted ? '取消静音' : '静音'}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-full backdrop-blur-sm transition-all"
                title={isPaused ? '播放' : '暂停'}
              >
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
              </button>
            </div>
          </div>
        )

      case 'image':
        return (
          <div className="relative w-full h-full">
            <img
              src={current.media_url}
              alt={current.content || '公告图片'}
              className="w-full h-full object-cover"
            />
            {/* 图片覆盖层 */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-slate-900/30"></div>
            {/* 文字内容 */}
            {current.content && (
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <p className="text-white text-lg md:text-2xl font-medium drop-shadow-lg">
                  {current.content}
                </p>
              </div>
            )}
          </div>
        )

      default: // text
        return (
          <div 
            className="relative w-full h-full flex items-center justify-center p-6 md:p-8"
            style={{ background: `linear-gradient(135deg, ${bgColor}40 0%, ${bgColor}20 50%, transparent 100%)` }}
          >
            {/* 装饰背景 */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
            </div>
            {/* 文字内容 */}
            <div className="relative text-center max-w-3xl">
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-4"
                style={{ backgroundColor: `${bgColor}30`, color: bgColor }}
              >
                <Sparkles size={16} />
                <span>公告</span>
              </div>
              <p className="text-white text-xl md:text-3xl font-medium leading-relaxed">
                {current.content}
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="hero-banner relative">
      {/* 主容器 */}
      <div 
        className="relative overflow-hidden rounded-2xl border shadow-glow transition-all duration-500"
        style={{ 
          borderColor: `${bgColor}40`,
          boxShadow: `0 0 40px ${bgColor}20, 0 0 80px ${bgColor}10`
        }}
      >
        {/* 内容区域 */}
        <div className="relative h-64 md:h-80 lg:h-96 bg-slate-900">
          {current.link ? (
            <a 
              href={current.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full h-full cursor-pointer"
            >
              {renderContent()}
            </a>
          ) : (
            renderContent()
          )}
        </div>

        {/* 导航按钮 */}
        {announcements.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm transition-all z-10"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm transition-all z-10"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* 指示器 */}
        {announcements.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {announcements.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleDotClick(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex 
                    ? 'w-6 bg-white' 
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default HeroBanner
