import React, { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Star, ShieldCheck, Trophy, Award, Package, ShoppingBag, ThumbsUp,
  ArrowLeft, Calendar, Loader2, AlertCircle, MessageCircle, User,
  Clock, ChevronRight, Sparkles
} from 'lucide-react'
import { profileApi, reviewApi } from '../utils/api'
import { STOCK_LIMIT } from '../utils/storage'
import ProductCard from '../components/ProductCard'
import productDefault from '../assets/product-default.png'

// ─── Trust level helper ─────────────────────────────────
const getTrustLevel = (rating, reviewCount, soldCount, disputeCount) => {
  if (reviewCount === 0) return { label: '新用户', color: 'text-slate-400', bg: 'bg-slate-500/10' }
  if (rating >= 4.8 && disputeCount === 0 && soldCount >= 10)
    return { label: '极高', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
  if (rating >= 4.5 && disputeCount === 0)
    return { label: '很高', color: 'text-green-400', bg: 'bg-green-500/10' }
  if (rating >= 4.0)
    return { label: '良好', color: 'text-blue-400', bg: 'bg-blue-500/10' }
  return { label: '一般', color: 'text-amber-400', bg: 'bg-amber-500/10' }
}

// ─── Star renderer ──────────────────────────────────────
const StarRating = ({ rating, size = 16 }) => {
  const fullStars = Math.floor(rating)
  const partial = rating - fullStars
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={size}
          className={
            i < fullStars
              ? 'text-amber-400 fill-amber-400'
              : i === fullStars && partial >= 0.5
                ? 'text-amber-400 fill-amber-400/50'
                : 'text-slate-600'
          }
        />
      ))}
    </div>
  )
}

const PublicProfile = () => {
  const { userId } = useParams()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [reviewTotal, setReviewTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('selling')
  const [reviewPage, setReviewPage] = useState(1)

  // Load public profile
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      const res = await profileApi.getPublic(userId)
      if (res.code === 200 && res.data) {
        setProfile(res.data)
      } else {
        setError(res.message || '用户不存在')
      }
      setLoading(false)
    }
    load()
  }, [userId])

  // Load reviews when tab switches
  useEffect(() => {
    if (activeTab !== 'reviews') return
    const loadReviews = async () => {
      setReviewLoading(true)
      const res = await reviewApi.getByUser(userId, reviewPage)
      if (res.code === 200 && res.data) {
        setReviews(res.data.list || [])
        setReviewTotal(res.data.total || 0)
      }
      setReviewLoading(false)
    }
    loadReviews()
  }, [activeTab, userId, reviewPage])

  // Derived
  const trust = useMemo(() => {
    if (!profile) return null
    return getTrustLevel(profile.rating, profile.reviewCount, profile.soldCount, 0)
  }, [profile])

  const joinedDate = useMemo(() => {
    if (!profile?.joinedAt) return ''
    const d = new Date(profile.joinedAt)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [profile])

  // Products enriched for ProductCard
  const sellingProducts = useMemo(() => {
    if (!profile?.products) return []
    return profile.products.map(p => ({
      ...p,
      stock: p.stock ?? STOCK_LIMIT,
    }))
  }, [profile])

  // ─── Loading state ────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 size={32} className="text-violet-500 animate-spin" />
      </div>
    )
  }

  // ─── Error state ──────────────────────────────────────
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white px-4">
        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-8 text-center max-w-sm">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2">用户不存在</h2>
          <p className="text-sm text-slate-400 mb-6">{error || '该用户可能已注销或不存在'}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} /> 返回首页
          </Link>
        </div>
      </div>
    )
  }

  // ─── Badge config ─────────────────────────────────────
  const badges = [
    {
      key: 'student',
      active: profile.isStudentVerified,
      icon: ShieldCheck,
      label: '学生认证',
      colors: 'from-blue-500 to-cyan-400',
      bg: 'bg-blue-500/10 border-blue-500/25',
      text: 'text-blue-400',
    },
    {
      key: 'seller',
      active: profile.badgeExcellentSeller,
      icon: Trophy,
      label: '优秀卖家',
      colors: 'from-amber-400 to-yellow-300',
      bg: 'bg-amber-500/10 border-amber-500/25',
      text: 'text-amber-400',
    },
    {
      key: 'buyer',
      active: profile.badgeExcellentBuyer,
      icon: Award,
      label: '优秀买家',
      colors: 'from-slate-300 to-slate-100',
      bg: 'bg-slate-400/10 border-slate-400/25',
      text: 'text-slate-300',
    },
  ]

  const activeBadges = badges.filter(b => b.active)

  const tabs = [
    { key: 'selling', label: '在售商品', icon: ShoppingBag, count: sellingProducts.length },
    { key: 'reviews', label: '收到评价', icon: MessageCircle, count: profile.reviewCount },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ──── Ambient Background ──── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/3 w-[500px] h-[500px] bg-violet-600/[0.06] rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-blue-600/[0.04] rounded-full blur-[100px]" />
        <div className="absolute -bottom-20 left-0 w-[300px] h-[300px] bg-amber-500/[0.03] rounded-full blur-[80px]" />
      </div>

      {/* ──── Top Navigation Bar ──── */}
      <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-2xl border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">返回</span>
          </button>
          <span className="text-sm font-medium text-slate-300">用户主页</span>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-4 pb-16">

        {/* ════════════════════════════════════════════════ */}
        {/* ──── HERO / USER HEADER ──── */}
        {/* ════════════════════════════════════════════════ */}
        <section className="pt-8 pb-6">
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative mb-5">
              <div className="w-28 h-28 rounded-3xl overflow-hidden border-[3px] border-white/10 shadow-2xl shadow-black/40 bg-slate-800">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white/80">
                      {profile.displayName?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gray-950 rounded-xl flex items-center justify-center">
                <div className="w-4 h-4 bg-emerald-500 rounded-lg animate-pulse" />
              </div>
            </div>

            {/* Name */}
            <h1 className="text-2xl font-bold text-white mb-1.5">{profile.displayName}</h1>

            {/* Join date */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-5">
              <Calendar size={12} />
              <span>加入于 {joinedDate}</span>
            </div>

            {/* ──── Trust Badges Row ──── */}
            {activeBadges.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {activeBadges.map(badge => (
                  <div
                    key={badge.key}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border backdrop-blur-sm ${badge.bg}`}
                  >
                    <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${badge.colors} flex items-center justify-center`}>
                      <badge.icon size={14} className="text-white" />
                    </div>
                    <span className={`text-sm font-semibold ${badge.text}`}>{badge.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ──── Rating display ──── */}
            <div className="flex items-center gap-3 mb-6">
              <StarRating rating={profile.rating} size={18} />
              <span className="text-lg font-bold text-amber-400">{profile.rating.toFixed(1)}</span>
              <span className="text-sm text-slate-500">({profile.reviewCount} 评价)</span>
            </div>
          </div>

          {/* ──── Stats Grid ──── */}
          <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto">
            <StatsCard
              icon={Package}
              label="已售"
              value={profile.soldCount}
              color="text-violet-400"
              bg="bg-violet-500/10"
            />
            <StatsCard
              icon={ShoppingBag}
              label="已购"
              value={profile.boughtCount}
              color="text-blue-400"
              bg="bg-blue-500/10"
            />
            <StatsCard
              icon={ThumbsUp}
              label="好评"
              value={profile.goodReviewCount}
              color="text-emerald-400"
              bg="bg-emerald-500/10"
            />
            <StatsCard
              icon={Sparkles}
              label="信誉"
              value={trust.label}
              isText
              color={trust.color}
              bg={trust.bg}
            />
          </div>
        </section>

        {/* ════════════════════════════════════════════════ */}
        {/* ──── TABS ──── */}
        {/* ════════════════════════════════════════════════ */}
        <div className="border-b border-white/[0.06] mb-6">
          <div className="flex gap-0">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                    activeTab === tab.key
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'bg-slate-700/50 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {/* Active indicator */}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════ */}
        {/* ──── TAB CONTENT ──── */}
        {/* ════════════════════════════════════════════════ */}

        {/* ── Selling Tab ── */}
        {activeTab === 'selling' && (
          <div>
            {sellingProducts.length === 0 ? (
              <EmptyBlock icon={ShoppingBag} text="暂无在售商品" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sellingProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <ProductCard
                      product={product}
                      isLoggedIn={!!localStorage.getItem('user_token')}
                      onClick={(p) => {
                        navigate(`/p/${p.id}`)
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Reviews Tab ── */}
        {activeTab === 'reviews' && (
          <div>
            {reviewLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 size={24} className="text-violet-500 animate-spin" />
              </div>
            ) : reviews.length === 0 ? (
              <EmptyBlock icon={MessageCircle} text="暂无评价" />
            ) : (
              <div className="space-y-3">
                {reviews.map(review => (
                  <ReviewCard key={review.id} review={review} />
                ))}

                {/* Load more */}
                {reviews.length < reviewTotal && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => setReviewPage(p => p + 1)}
                      className="px-5 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 border border-white/[0.06] rounded-xl text-sm text-slate-400 hover:text-white transition-all"
                    >
                      加载更多评价
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────

const StatsCard = ({ icon: Icon, label, value, isText, color, bg }) => (
  <div className="flex flex-col items-center p-3.5 bg-[#111827]/60 border border-white/[0.06] rounded-2xl backdrop-blur-sm">
    <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-2`}>
      <Icon size={16} className={color} />
    </div>
    <span className={`text-lg font-bold ${isText ? color : 'text-white'}`}>
      {isText ? value : (value ?? 0)}
    </span>
    <span className="text-[11px] text-slate-500 mt-0.5">{label}</span>
  </div>
)

const EmptyBlock = ({ icon: Icon, text }) => (
  <div className="flex flex-col items-center justify-center h-48 text-slate-500">
    <Icon size={36} className="mb-3 opacity-30" />
    <span className="text-sm">{text}</span>
  </div>
)

const ReviewCard = ({ review }) => {
  const date = new Date(review.created_at)
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  return (
    <div className="bg-[#111827]/60 border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Reviewer avatar placeholder */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-sm font-semibold text-white/70">
            {(review.reviewer_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{review.reviewer_name || '匿名用户'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRating rating={review.score} size={12} />
              <span className="text-xs text-slate-500">{dateStr}</span>
            </div>
          </div>
        </div>
        {/* Score badge */}
        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
          review.score >= 4 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : review.score >= 3 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {review.score}.0
        </span>
      </div>
      {review.comment && (
        <p className="text-sm text-slate-300 leading-relaxed pl-12">{review.comment}</p>
      )}
    </div>
  )
}

export default PublicProfile
