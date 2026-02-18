import React, { useState, useCallback } from 'react'
import { Share2, Check, Link2, Image } from 'lucide-react'

/**
 * ShareButton — Hybrid share component with optional poster generation
 *
 * Mobile:  Uses navigator.share() (native share sheet)
 * Desktop: Falls back to navigator.clipboard.writeText()
 *
 * Props:
 *  - title       {string}  Share title (used by Web Share API)
 *  - text        {string}  Share description text
 *  - url         {string}  URL to share (defaults to current page)
 *  - onToast     {fn}      (message, type) => void — external toast callback
 *  - onPoster    {fn}      Callback to open poster modal (if provided, shows poster button)
 *  - variant     'icon' | 'button' | 'ghost'  — visual style
 *  - size        'sm' | 'md' | 'lg'
 *  - className   {string}  Additional classes
 */
const ShareButton = ({
  title = '',
  text = '',
  url,
  onToast,
  onPoster,
  variant = 'icon',
  size = 'md',
  className = '',
}) => {
  const [shared, setShared] = useState(false)
  const [animating, setAnimating] = useState(false)

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '')

  const triggerSuccess = useCallback(() => {
    setShared(true)
    setAnimating(true)
    setTimeout(() => setShared(false), 2200)
    setTimeout(() => setAnimating(false), 600)
  }, [])

  const handleShare = useCallback(async () => {
    // ── Try native Web Share API first (mobile) ──
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || document.title,
          text: text || '',
          url: shareUrl,
        })
        triggerSuccess()
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }

    // ── Fallback: copy to clipboard (desktop) ──
    try {
      await navigator.clipboard.writeText(shareUrl)
      triggerSuccess()
      onToast?.('链接已复制到剪贴板', 'success')
    } catch {
      try {
        const input = document.createElement('input')
        input.value = shareUrl
        input.style.position = 'fixed'
        input.style.opacity = '0'
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
        triggerSuccess()
        onToast?.('链接已复制到剪贴板', 'success')
      } catch {
        onToast?.('复制失败，请手动复制链接', 'error')
      }
    }
  }, [shareUrl, title, text, onToast, triggerSuccess])

  // ── Size config ──
  const sizes = {
    sm: { icon: 14, btn: 'w-8 h-8', text: 'text-xs', gap: 'gap-1', px: 'px-3 py-1.5' },
    md: { icon: 16, btn: 'w-9 h-9', text: 'text-sm', gap: 'gap-1.5', px: 'px-4 py-2' },
    lg: { icon: 18, btn: 'w-10 h-10', text: 'text-sm', gap: 'gap-2', px: 'px-5 py-2.5' },
  }
  const s = sizes[size] || sizes.md

  const Icon = shared ? Check : Share2
  const iconColor = shared ? 'text-emerald-400' : ''

  // ── Variant: icon (round button) ──
  if (variant === 'icon') {
    return (
      <button
        onClick={handleShare}
        title={shared ? '已分享' : '分享'}
        className={`
          ${s.btn} rounded-xl flex items-center justify-center
          bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] hover:border-white/[0.15]
          text-slate-400 hover:text-white
          backdrop-blur-sm transition-all duration-200 active:scale-95
          ${animating ? 'scale-110' : ''}
          ${iconColor}
          ${className}
        `}
      >
        <Icon size={s.icon} />
      </button>
    )
  }

  // ── Variant: ghost (text + icon) ──
  if (variant === 'ghost') {
    return (
      <button
        onClick={handleShare}
        className={`
          inline-flex items-center ${s.gap} ${s.text} font-medium
          text-slate-400 hover:text-white transition-all duration-200 active:scale-95
          ${iconColor}
          ${className}
        `}
      >
        <Icon size={s.icon} />
        <span>{shared ? '已复制' : '分享'}</span>
      </button>
    )
  }

  // ── Variant: button (full bordered — with optional poster button) ──
  if (onPoster) {
    return (
      <div className={`flex gap-2 ${className}`}>
        <button
          onClick={handleShare}
          className={`
            flex-1 ${s.px} rounded-xl border border-white/[0.06]
            ${s.text} font-medium transition-all duration-200 active:scale-[0.98]
            flex items-center justify-center ${s.gap}
            ${shared
              ? 'text-emerald-400 bg-emerald-500/[0.06] border-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
            }
          `}
        >
          {shared ? <Check size={s.icon} /> : <Link2 size={s.icon} />}
          {shared ? '已复制' : '复制链接'}
        </button>
        <button
          onClick={onPoster}
          className={`
            flex-1 ${s.px} rounded-xl border border-white/[0.06]
            ${s.text} font-medium transition-all duration-200 active:scale-[0.98]
            flex items-center justify-center ${s.gap}
            text-violet-400 hover:text-violet-300 hover:bg-violet-500/[0.06] border-violet-500/20
          `}
        >
          <Image size={s.icon} />
          生成海报
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleShare}
      className={`
        w-full ${s.px} rounded-xl border border-white/[0.06]
        ${s.text} font-medium transition-all duration-200 active:scale-[0.98]
        flex items-center justify-center ${s.gap}
        ${shared
          ? 'text-emerald-400 bg-emerald-500/[0.06] border-emerald-500/20'
          : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
        }
        ${className}
      `}
    >
      {shared ? <Check size={s.icon} /> : <Link2 size={s.icon} />}
      {shared ? '链接已复制' : '复制分享链接'}
    </button>
  )
}

export default ShareButton
