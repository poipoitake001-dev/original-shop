import React from 'react'
import { Satellite, Search, Package, RefreshCw, Sparkles } from 'lucide-react'

const EmptyState = ({ 
  type = 'no-results', // 'no-results' | 'no-products' | 'loading' | 'error'
  searchQuery = '',
  onClear,
  onRetry
}) => {
  const renderContent = () => {
    switch (type) {
      case 'no-results':
        return (
          <>
            {/* 动画卫星 */}
            <div className="relative mb-6">
              <div className="w-24 h-24 mx-auto relative">
                {/* 轨道 */}
                <div className="absolute inset-0 border-2 border-dashed border-slate-700 rounded-full animate-spin-slow"></div>
                {/* 卫星 */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <Satellite size={48} className="text-slate-500" />
                </div>
                {/* 信号波 */}
                <div className="absolute -right-2 top-0">
                  <div className="w-3 h-3 bg-primary/50 rounded-full animate-ping"></div>
                </div>
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">
              该扇区无信号
            </h3>
            <p className="text-slate-400 mb-2">
              未在星际数据库中找到匹配
              {searchQuery && <span className="text-primary"> "{searchQuery}" </span>}
              的商品
            </p>
            <p className="text-slate-500 text-sm mb-6">
              尝试使用其他关键词或浏览全部商品
            </p>
            
            {onClear && (
              <button
                onClick={onClear}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/80 rounded-xl font-medium transition-all"
              >
                <RefreshCw size={18} />
                清除筛选
              </button>
            )}
          </>
        )

      case 'no-products':
        return (
          <>
            <div className="relative mb-6">
              <div className="w-24 h-24 mx-auto bg-slate-800/50 rounded-2xl flex items-center justify-center">
                <Package size={48} className="text-slate-600" />
              </div>
              {/* 星星装饰 */}
              <Sparkles size={16} className="absolute top-0 right-1/3 text-primary/50 animate-pulse" />
              <Sparkles size={12} className="absolute bottom-2 left-1/3 text-purple-500/50 animate-pulse delay-300" />
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">
              空间站补给中
            </h3>
            <p className="text-slate-400 mb-2">
              暂无商品在售
            </p>
            <p className="text-slate-500 text-sm">
              敬请期待更多星际商品上架
            </p>
          </>
        )

      case 'loading':
        return (
          <>
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto relative">
                {/* 加载环 */}
                <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
                {/* 中心图标 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Search size={24} className="text-slate-500" />
                </div>
              </div>
            </div>
            
            <h3 className="text-lg font-medium text-white mb-2">
              扫描星际信号中...
            </h3>
            <p className="text-slate-500 text-sm">
              正在搜索商品数据
            </p>
          </>
        )

      case 'error':
        return (
          <>
            <div className="relative mb-6">
              <div className="w-24 h-24 mx-auto bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                <Satellite size={48} className="text-red-400" />
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">
              信号中断
            </h3>
            <p className="text-slate-400 mb-2">
              无法连接到星际数据库
            </p>
            <p className="text-slate-500 text-sm mb-6">
              请检查网络连接后重试
            </p>
            
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-all"
              >
                <RefreshCw size={18} />
                重新连接
              </button>
            )}
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className="empty-state py-16 px-4 text-center">
      <div className="max-w-md mx-auto">
        {renderContent()}
      </div>
    </div>
  )
}

export default EmptyState
