import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Star, ShieldCheck, Trophy, Package, MessageCircle,
  ChevronRight, Loader2, AlertCircle, Tag, Layers, Share2,
  CreditCard, Heart, Eye, Zap, Clock, MessageSquare, Bookmark
} from 'lucide-react'
import { STOCK_LIMIT } from '../utils/storage'
import PurchaseModal from '../components/PurchaseModal'
import ShareOptionsModal from '../components/ShareOptionsModal'
import PosterModal from '../components/PosterModal'
import Toast from '../components/Toast'
import productDefault from '../assets/product-default.png'

const ProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPurchase, setShowPurchase] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [showPoster, setShowPoster] = useState(false)
  const [toast, setToast] = useState(null)
  const [wanted, setWanted] = useState(false)
  const [wantCount, setWantCount] = useState(0)

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/products/${id}`)
        const data = await res.json()
        if (data.code === 200 && data.data) {
          setProduct(data.data)
          setWantCount(data.data.want_count || 0)
        } else {
          setError(data.message || '商品不存在')
        }
      } catch {
        setError('加载失败')
      }
      setLoading(false)
    }
    load()

    const token = localStorage.getItem('user_token')
    if (token) {
      fetch(`/api/products/${id}/want-status`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()).then(res => {
        if (res.code === 200) setWanted(res.data?.wanted || false)
      }).catch(() => {})
    }
  }, [id])

  const shareUrl = window.location.origin + `/p/${id}`
  const shareTitle = product ? `${product.title} - ¥${parseFloat(product.price || 0).toFixed(2)}` : '商品详情'
  const shareText = product?.description || '来看看这个商品！'

  const handleCopyLink = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl })
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      showToast('链接已复制到剪贴板', 'success')
    } catch {
      showToast('复制失败', 'error')
    }
  }, [shareUrl, shareTitle, shareText])

  const handleBuy = () => {
    if (!localStorage.getItem('user_info')) {
      showToast('请先登录后再购买', 'info')
      return
    }
    setShowPurchase(true)
  }

  const handleToggleWant = async () => {
    const token = localStorage.getItem('user_token')
    if (!token) { showToast('请先登录', 'info'); return }
    try {
      const res = await fetch(`/api/products/${id}/want`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      }).then(r => r.json())
      if (res.code === 200) {
        setWanted(res.data.wanted)
        setWantCount(res.data.wantCount)
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 size={32} className="text-violet-500 animate-spin" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white px-4">
        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-8 text-center max-w-sm">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2">商品不存在</h2>
          <p className="text-sm text-slate-400 mb-6">{error || '该商品可能已下架'}</p>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm font-medium transition-colors">
            <ArrowLeft size={16} /> 返回首页
          </Link>
        </div>
      </div>
    )
  }

  // ── Derived data ──
  const rawPrice = parseFloat(product.price || 0)
  const priceInt = Math.floor(rawPrice)
  const priceDec = (rawPrice % 1).toFixed(2).slice(1)
  const stock = product.stock ?? STOCK_LIMIT
  const isOutOfStock = stock <= 0
  const fallbackImg = product.image_url || productDefault
  const sellerName = product.seller_nickname || product.seller_name || ''
  const sellerAvatar = product.seller_avatar_url || product.seller_avatar || ''
  const sellerRating = parseFloat(product.seller_rating || 5.0)
  const sellerReviewCount = product.seller_review_count || 0
  const sellerSoldCount = product.seller_sold_count || 0
  const isVerified = product.seller_verified === 1 || product.seller_verified === true
  const isExcellentSeller = product.badge_excellent_seller === 1 || product.badge_excellent_seller === true
  const hasSeller = product.seller_id && sellerName
  const viewCount = product.view_count || 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ═══════════════════════════════════════════════════ */}
      {/* TOP: Seller Bar (full width, like Xianyu header)    */}
      {/* ═══════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-[#0b1120]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Back */}
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors mr-1">
            <ArrowLeft size={20} />
          </button>

          {/* Seller info */}
          {hasSeller && (
            <Link to={`/u/${product.seller_id}`} className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/[0.1] flex-shrink-0">
                {sellerAvatar ? (
                  <img src={sellerAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{sellerName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
              <span className="font-semibold text-sm text-white truncate">{sellerName}</span>
              {isVerified && (
                <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  <ShieldCheck size={9} /> 认证
                </span>
              )}
              {isExcellentSeller && (
                <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  <Trophy size={9} /> 优秀
                </span>
              )}
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 ml-1">
                <Star size={10} className="text-amber-400 fill-amber-400" />{sellerRating.toFixed(1)}
                <span className="text-slate-700">·</span>
                售出{sellerSoldCount}件
              </span>
            </Link>
          )}
          {!hasSeller && <div className="flex-1" />}

          {/* Right actions */}
          <button onClick={() => setShowShareOptions(true)} className="text-slate-400 hover:text-white transition-colors">
            <Share2 size={18} />
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════ */}
      {/* MAIN CONTENT                                        */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 py-5">

        {/* ── DESKTOP: Two columns | MOBILE: Stack ── */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ════════════════════════════════════════════ */}
          {/* LEFT: Image Gallery                          */}
          {/* ════════════════════════════════════════════ */}
          <div className="lg:w-[55%] flex-shrink-0">
            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-white/[0.06]">
              <img
                src={fallbackImg}
                alt={product.title}
                className="w-full aspect-[4/3] object-cover"
                onError={(e) => { e.target.src = productDefault }}
              />
              {/* Overlays */}
              {wantCount > 0 && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-xs text-white/80">
                  <Heart size={12} className="text-rose-400 fill-rose-400" />
                  {wantCount}人想要
                </div>
              )}
              {viewCount > 0 && (
                <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-[11px] text-white/60">
                  <Eye size={11} /> {viewCount}
                </div>
              )}
            </div>
          </div>

          {/* ════════════════════════════════════════════ */}
          {/* RIGHT: Product Info + Actions                 */}
          {/* ════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* ── Price Section ── */}
            <div>
              {/* Price row with "全新" badge */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-baseline">
                  <span className="text-xl font-extrabold" style={{ color: '#ff5000' }}>¥</span>
                  <span className="text-[2.75rem] font-extrabold leading-none tracking-tighter" style={{ color: '#ff5000' }}>{priceInt}</span>
                  <span className="text-xl font-extrabold" style={{ color: '#ff5000' }}>{priceDec}</span>
                  {/* Inline tags */}
                  <div className="flex items-center gap-1.5 ml-3 self-end mb-1.5">
                    {product.delivery_type === 'auto' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400">闪发</span>
                    )}
                    {rawPrice > 0 && (
                      <span className="text-xs text-slate-500 line-through">¥{(rawPrice * 1.5).toFixed(0)}</span>
                    )}
                  </div>
                </div>

                {/* Condition badge */}
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-1">
                  全新
                </span>
              </div>

              {product.sales > 0 && (
                <p className="text-xs text-slate-500 mb-1">已售 {product.sales} 件</p>
              )}
            </div>

            {/* ── Title ── */}
            <h1 className="text-lg font-bold text-white leading-snug">{product.title}</h1>

            {/* ── Info Rows (like Xianyu: location, brand, category) ── */}
            <div className="space-y-2.5 py-3 border-t border-b border-white/[0.05]">
              {product.category_name && (
                <div className="flex items-center text-sm">
                  <span className="text-slate-500 w-16 flex-shrink-0">分类</span>
                  <span className="text-slate-300">{product.category_name}</span>
                </div>
              )}
              <div className="flex items-center text-sm">
                <span className="text-slate-500 w-16 flex-shrink-0">类型</span>
                <span className="text-slate-300 flex items-center gap-1.5">
                  {product.type === 'PHYSICAL' ? (
                    <><Package size={13} className="text-purple-400" /> 实物商品</>
                  ) : (
                    <><Layers size={13} className="text-blue-400" /> 虚拟商品</>
                  )}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-slate-500 w-16 flex-shrink-0">发货</span>
                <span className="text-slate-300 flex items-center gap-1.5">
                  {product.delivery_type === 'auto' ? (
                    <><Zap size={13} className="text-amber-400" /> 自动发货</>
                  ) : (
                    <><Package size={13} className="text-slate-400" /> 手动发货</>
                  )}
                </span>
              </div>
              {stock > 0 && stock <= 10 && (
                <div className="flex items-center text-sm">
                  <span className="text-slate-500 w-16 flex-shrink-0">库存</span>
                  <span className="text-rose-400 flex items-center gap-1">
                    <Clock size={13} /> 仅剩 {stock} 件
                  </span>
                </div>
              )}
            </div>

            {/* ── Action Buttons (Xianyu: 聊一聊 + 立即购买 + 收藏) ── */}
            <div className="space-y-3 pt-1">
              {/* Main buttons row — pill shaped */}
              <div className="flex rounded-full overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(255, 80, 0, 0.12)' }}>
                {/* Chat — Yellow */}
                <Link
                  to={hasSeller ? `/user/messages?to=${product.seller_id}` : '#'}
                  className="flex-1 py-3.5 flex items-center justify-center gap-2 font-bold text-sm active:opacity-80 transition-opacity"
                  style={{ backgroundColor: '#ffda44', color: '#1a1a1a' }}
                >
                  <MessageCircle size={17} />
                  聊一聊
                </Link>
                {/* Buy — Red */}
                <button
                  onClick={handleBuy}
                  disabled={isOutOfStock}
                  className={`flex-1 py-3.5 flex items-center justify-center gap-2 font-bold text-sm active:opacity-80 transition-opacity ${
                    isOutOfStock ? 'cursor-not-allowed' : ''
                  }`}
                  style={{
                    backgroundColor: isOutOfStock ? '#374151' : '#ff5000',
                    color: isOutOfStock ? '#6b7280' : '#ffffff'
                  }}
                >
                  <CreditCard size={17} />
                  {isOutOfStock ? '已售罄' : '立即购买'}
                </button>
              </div>

              {/* Want / Collect button */}
              <button
                onClick={handleToggleWant}
                className={`w-full py-2.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all border ${
                  wanted
                    ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                    : 'bg-transparent border-white/[0.1] text-slate-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <Bookmark size={15} className={wanted ? 'fill-rose-400' : ''} />
                {wanted ? '已收藏' : '收藏'}
                {wantCount > 0 && <span className="text-slate-500 text-xs">({wantCount})</span>}
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* BELOW: Description + Seller Card (full width)       */}
        {/* ═══════════════════════════════════════════════════ */}
        <div className="mt-6 space-y-4">
          {/* Description & Detail */}
          {(product.description || product.detail) && (
            <div className="bg-[#111d2e] rounded-2xl p-5 border border-white/[0.06]">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">商品详情</h3>
              {product.description && (
                <p className="text-sm text-slate-300 leading-relaxed">{product.description}</p>
              )}
              {product.detail && (
                <div
                  className={`text-sm text-slate-400 leading-relaxed ${product.description ? 'mt-3 pt-3 border-t border-white/[0.05]' : ''}`}
                  dangerouslySetInnerHTML={{ __html: product.detail.replace(/\n/g, '<br/>') }}
                />
              )}
            </div>
          )}

          {/* Seller Trust Card */}
          {hasSeller && (
            <div className="bg-[#111d2e] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <Link to={`/u/${product.seller_id}`} className="flex-shrink-0 group/av">
                  <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-white/[0.08] group-hover/av:ring-orange-500/40 transition-all shadow-xl shadow-black/30">
                    {sellerAvatar ? (
                      <img src={sellerAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">{sellerName.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/u/${product.seller_id}`} className="block font-bold text-[15px] text-white hover:text-orange-300 transition-colors truncate mb-1.5">
                    {sellerName}
                  </Link>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                        <ShieldCheck size={10} /> 学生认证
                      </span>
                    )}
                    {isExcellentSeller && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                        <Trophy size={10} /> 优秀卖家
                      </span>
                    )}
                    {sellerRating >= 4.5 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Star size={10} className="fill-emerald-400" /> 信用极好
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span>售出 <span className="text-slate-300 font-medium">{sellerSoldCount}</span> 件</span>
                    <span className="text-slate-700">|</span>
                    <span><span className="text-slate-300 font-medium">{sellerReviewCount}</span> 评价</span>
                    <span className="text-slate-700">|</span>
                    <span className="flex items-center gap-0.5">
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                      <span className="text-amber-400 font-medium">{sellerRating.toFixed(1)}</span>
                    </span>
                  </div>
                </div>
                <Link
                  to={`/u/${product.seller_id}`}
                  className="flex-shrink-0 px-4 py-2 rounded-full border border-white/[0.1] hover:border-orange-500/30 text-xs font-semibold text-slate-300 hover:text-orange-400 hover:bg-orange-500/[0.06] transition-all"
                >
                  去主页
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* MOBILE BOTTOM BAR (hidden on desktop)               */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0b1120]/95 backdrop-blur-2xl border-t border-white/[0.06] shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
        <div className="max-w-2xl mx-auto px-3 py-2 flex items-center gap-1">
          <div className="flex items-center gap-0.5">
            <button onClick={handleToggleWant} className="flex flex-col items-center justify-center w-12 py-1 rounded-lg hover:bg-white/[0.04] transition-colors">
              <Heart size={19} className={`transition-colors ${wanted ? 'text-rose-500 fill-rose-500' : 'text-slate-500'}`} />
              <span className={`text-[10px] mt-0.5 ${wanted ? 'text-rose-400' : 'text-slate-500'}`}>{wanted ? '已想要' : '想要'}</span>
            </button>
            <Link to={hasSeller ? `/user/messages?to=${product.seller_id}` : '#'} className="flex flex-col items-center justify-center w-12 py-1 rounded-lg hover:bg-white/[0.04] transition-colors">
              <MessageSquare size={19} className="text-slate-500" />
              <span className="text-[10px] mt-0.5 text-slate-500">留言</span>
            </Link>
          </div>
          <div className="flex-1 flex ml-2">
            <div className="flex w-full rounded-full overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(255, 80, 0, 0.15)' }}>
              <Link
                to={hasSeller ? `/user/messages?to=${product.seller_id}` : '#'}
                className="flex-1 py-3 flex items-center justify-center gap-1.5 font-bold text-sm active:opacity-80"
                style={{ backgroundColor: '#ffda44', color: '#1a1a1a' }}
              >
                <MessageCircle size={16} />
                聊一聊
              </Link>
              <button
                onClick={handleBuy}
                disabled={isOutOfStock}
                className={`flex-1 py-3 flex items-center justify-center gap-1.5 font-bold text-sm active:opacity-80 ${isOutOfStock ? 'cursor-not-allowed' : ''}`}
                style={{ backgroundColor: isOutOfStock ? '#374151' : '#ff5000', color: isOutOfStock ? '#6b7280' : '#ffffff' }}
              >
                <CreditCard size={16} />
                {isOutOfStock ? '售罄' : '购买'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for mobile bottom bar */}
      <div className="lg:hidden h-16" />

      {/* ── Modals ── */}
      <PurchaseModal
        isOpen={showPurchase}
        product={product}
        onClose={() => setShowPurchase(false)}
        showToast={showToast}
        onPaymentSuccess={() => {}}
      />
      <ShareOptionsModal
        isOpen={showShareOptions}
        onClose={() => setShowShareOptions(false)}
        onCopyLink={handleCopyLink}
        onGeneratePoster={() => setShowPoster(true)}
      />
      <PosterModal
        isOpen={showPoster}
        onClose={() => setShowPoster(false)}
        product={product}
        url={shareUrl}
        onToast={showToast}
      />
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}

export default ProductDetail
