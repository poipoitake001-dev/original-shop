import React, { useState, useRef, useCallback, useEffect } from 'react'
import { X, Download, Loader2, Image as ImageIcon } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import html2canvas from 'html2canvas'

/**
 * PosterModal — Generate & display a shareable product poster image
 *
 * Props:
 *  - isOpen     {boolean}
 *  - onClose    {fn}
 *  - product    {object}  Product data
 *  - url        {string}  Share URL (for QR code)
 *  - siteName   {string}  Site branding name
 *  - onToast    {fn}      Toast callback
 */
const PosterModal = ({ isOpen, onClose, product, url, siteName = '', onToast }) => {
  const posterRef = useRef(null)
  const [posterImage, setPosterImage] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const shareUrl = url || window.location.href
  const brandName = siteName || '星际卡密商城'

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setPosterImage(null)
      setImageLoaded(false)
    }
  }, [isOpen])

  // Auto-generate poster once the template image loads
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
  }, [])

  // Generate poster using html2canvas
  const generatePoster = useCallback(async () => {
    if (!posterRef.current) return
    setGenerating(true)
    try {
      // Small delay to ensure rendering is complete
      await new Promise(r => setTimeout(r, 200))

      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 375,
        windowWidth: 375,
      })

      const dataUrl = canvas.toDataURL('image/png')
      setPosterImage(dataUrl)
    } catch (err) {
      console.error('Poster generation failed:', err)
      onToast?.('海报生成失败，请重试', 'error')
    }
    setGenerating(false)
  }, [onToast])

  // Generate automatically once image loads
  useEffect(() => {
    if (isOpen && imageLoaded && !posterImage && !generating) {
      generatePoster()
    }
  }, [isOpen, imageLoaded, posterImage, generating, generatePoster])

  // Download the poster
  const handleDownload = useCallback(() => {
    if (!posterImage) return
    try {
      const link = document.createElement('a')
      link.download = `${product?.title || 'poster'}.png`
      link.href = posterImage
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      onToast?.('海报已保存', 'success')
    } catch {
      onToast?.('下载失败，请长按图片保存', 'error')
    }
  }, [posterImage, product, onToast])

  if (!isOpen || !product) return null

  const price = parseFloat(product.price || 0).toFixed(2)
  const sellerName = product.seller_nickname || product.seller_name || ''
  const sellerAvatar = product.seller_avatar_url || product.seller_avatar || ''
  const productImg = product.image_url || ''

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl w-full max-w-sm max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ImageIcon size={16} className="text-violet-400" />
            分享海报
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Poster preview or loading */}
          {posterImage ? (
            <div className="space-y-4">
              {/* Generated image */}
              <div className="rounded-xl overflow-hidden shadow-lg border border-white/[0.06]">
                <img
                  src={posterImage}
                  alt="分享海报"
                  className="w-full"
                  style={{ display: 'block' }}
                />
              </div>

              {/* Tip */}
              <p className="text-center text-xs text-slate-500">
                长按图片保存到相册 · 或点击下方按钮下载
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={28} className="text-violet-500 animate-spin mb-3" />
              <p className="text-sm text-slate-400">正在生成海报...</p>
            </div>
          )}
        </div>

        {/* Footer action */}
        {posterImage && (
          <div className="px-4 pb-4 pt-1">
            <button
              onClick={handleDownload}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-violet-500/20"
            >
              <Download size={16} />
              保存海报
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* HIDDEN POSTER TEMPLATE — captured by html2canvas       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div
        ref={posterRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '375px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#ffffff',
          color: '#1a1a2e',
          overflow: 'hidden',
        }}
      >
        {/* ── Top accent bar ── */}
        <div style={{
          height: '4px',
          background: 'linear-gradient(90deg, #7c3aed, #6366f1, #3b82f6)',
        }} />

        {/* ── Product image ── */}
        <div style={{
          width: '375px',
          height: '280px',
          overflow: 'hidden',
          background: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {productImg && (
            <img
              src={productImg}
              alt=""
              crossOrigin="anonymous"
              onLoad={handleImageLoad}
              onError={handleImageLoad}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}
          {!productImg && (
            <div
              onLoad={handleImageLoad}
              ref={(el) => { if (el && !imageLoaded) { setImageLoaded(true) } }}
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '48px',
              }}
            >
              🛒
            </div>
          )}
        </div>

        {/* ── Product Info Section ── */}
        <div style={{ padding: '20px 24px 16px' }}>
          {/* Title */}
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            lineHeight: 1.4,
            color: '#0f172a',
            marginBottom: '8px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {product.title}
          </div>

          {/* Description */}
          {product.description && (
            <div style={{
              fontSize: '12px',
              color: '#64748b',
              lineHeight: 1.5,
              marginBottom: '12px',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {product.description}
            </div>
          )}

          {/* Price */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '2px',
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#f59e0b' }}>¥</span>
            <span style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#f59e0b',
              lineHeight: 1,
            }}>
              {price}
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: '#e2e8f0', marginBottom: '16px' }} />

          {/* Seller info + QR code */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Seller */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              {/* Seller avatar */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                overflow: 'hidden',
                flexShrink: 0,
                background: sellerAvatar ? '#f1f5f9' : 'linear-gradient(135deg, #7c3aed, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {sellerAvatar ? (
                  <img
                    src={sellerAvatar}
                    alt=""
                    crossOrigin="anonymous"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>
                    {sellerName ? sellerName.charAt(0).toUpperCase() : 'S'}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1e293b',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}>
                  {sellerName || brandName}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {sellerName ? '推荐好物' : ''}
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
            }}>
              <div style={{
                padding: '6px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}>
                <QRCodeCanvas
                  value={shareUrl}
                  size={72}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#1e293b"
                />
              </div>
              <span style={{ fontSize: '9px', color: '#94a3b8' }}>扫码查看</span>
            </div>
          </div>
        </div>

        {/* ── Footer branding ── */}
        <div style={{
          padding: '12px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            来自 {brandName}
          </span>
          <span style={{ fontSize: '10px', color: '#cbd5e1' }}>
            扫描二维码 · 立即购买
          </span>
        </div>
      </div>
    </div>
  )
}

export default PosterModal
