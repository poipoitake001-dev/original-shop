import React from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShieldCheck, Eye } from 'lucide-react'
import productDefault from '../assets/product-default.png'

const ProductCard = ({ product, onClick, isLoggedIn = true, defaultImage }) => {
  const fallbackImg = defaultImage || productDefault
  const price = parseFloat(product.price || 0)
  const priceInt = Math.floor(price)
  const priceDec = (price % 1).toFixed(2).slice(1) // ".00"
  const stock = product.stock ?? 999
  const isOutOfStock = stock <= 0

  // 解析商品图片（支持 JSON 数组和单个 URL）
  let productImages = []
  if (product.image_url) {
    try { productImages = JSON.parse(product.image_url) } catch { productImages = [product.image_url] }
  }
  const mainImage = productImages[0] || fallbackImg

  const sellerName = product.seller_nickname || product.seller_name || ''
  const sellerAvatar = product.seller_avatar_url || product.seller_avatar || ''
  const sellerVerified = product.seller_verified === 1 || product.seller_verified === true
  const hasSeller = product.seller_id && sellerName
  const wantCount = product.want_count || 0
  const viewCount = product.view_count || 0

  // Generate contextual tags
  const tags = []
  if (product.type === 'PHYSICAL') tags.push({ label: '实物', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' })
  if (product.type === 'VIRTUAL' || !product.type) tags.push({ label: '自动发货', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' })
  if (product.delivery_type === 'auto') tags.push({ label: '闪电发货', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' })

  return (
    <div
      onClick={() => !isOutOfStock && onClick?.(product)}
      className={`group bg-[#111827]/70 rounded-2xl overflow-hidden transition-all duration-300 border border-white/[0.04] ${
        isOutOfStock
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:border-white/[0.1] hover:shadow-lg hover:shadow-black/20 hover:-translate-y-1'
      }`}
    >
      {/* ──── Image ──── */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-800/50">
        <img
          src={mainImage}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => { e.target.src = fallbackImg }}
          loading="lazy"
        />
        {/* 多图标记 */}
        {productImages.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded-full">
            {productImages.length}张图
          </div>
        )}

        {/* Sold out overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-sm font-bold text-white/80 bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-sm">已售罄</span>
          </div>
        )}

        {/* Want count floating badge */}
        {wantCount > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg text-[10px] text-white/80 font-medium">
            <Heart size={10} className="text-rose-400 fill-rose-400" />
            {wantCount}
          </div>
        )}
      </div>

      {/* ──── Content ──── */}
      <div className="p-3.5">
        {/* Title - 2 lines max */}
        <h3 className="text-[13px] font-medium text-slate-200 leading-snug line-clamp-2 mb-2 min-h-[36px]">
          {product.title}
        </h3>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {tags.slice(0, 2).map(tag => (
              <span
                key={tag.label}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${tag.color}`}
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-0.5 mb-3">
          <span className="text-[11px] font-bold text-orange-400">¥</span>
          <span className="text-xl font-extrabold text-orange-400 leading-none">{priceInt}</span>
          <span className="text-[11px] font-bold text-orange-400">{priceDec}</span>
        </div>

        {/* ──── Footer: Seller + Social ──── */}
        <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.04]">
          {/* Seller info */}
          {hasSeller ? (
            <Link
              to={`/u/${product.seller_id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 min-w-0 group/seller"
            >
              {/* Avatar */}
              <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-slate-700">
                {sellerAvatar ? (
                  <img src={sellerAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">{sellerName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
              <span className="text-[11px] text-slate-500 truncate max-w-[80px] group-hover/seller:text-slate-300 transition-colors">
                {sellerName}
              </span>
              {sellerVerified && (
                <ShieldCheck size={10} className="text-blue-400 flex-shrink-0" />
              )}
            </Link>
          ) : (
            <span className="text-[11px] text-slate-600">官方</span>
          )}

          {/* Want/View count */}
          <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-shrink-0">
            {wantCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Heart size={10} />
                {wantCount}人想要
              </span>
            )}
            {wantCount === 0 && viewCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Eye size={10} />
                {viewCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductCard
