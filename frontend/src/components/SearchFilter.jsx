import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Filter, Sparkles } from 'lucide-react'
import { API_BASE } from '../utils/api'

const SearchFilter = ({ onSearch, onCategoryChange, searchQuery, selectedCategory }) => {
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFocused, setIsFocused] = useState(false)
  const [localSearch, setLocalSearch] = useState(searchQuery || '')
  const inputRef = useRef(null)
  const scrollRef = useRef(null)

  // 获取分类列表
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/categories`)
        const data = await res.json()
        if (data.code === 200 && data.data?.list) {
          setCategories(data.data.list.filter(c => c.status === 1))
        }
      } catch (error) {
        console.error('获取分类失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCategories()
  }, [])

  // 同步外部搜索词
  useEffect(() => {
    setLocalSearch(searchQuery || '')
  }, [searchQuery])

  // 处理搜索
  const handleSearch = (e) => {
    const value = e.target.value
    setLocalSearch(value)
    // 防抖：延迟 300ms 触发搜索
    clearTimeout(window.searchTimeout)
    window.searchTimeout = setTimeout(() => {
      onSearch(value)
    }, 300)
  }

  // 清除搜索
  const handleClearSearch = () => {
    setLocalSearch('')
    onSearch('')
    inputRef.current?.focus()
  }

  // 处理分类切换
  const handleCategoryClick = (categoryId) => {
    onCategoryChange(categoryId === selectedCategory ? '' : categoryId)
  }

  // 处理键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K 聚焦搜索框
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      // Escape 清除搜索
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        handleClearSearch()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="search-filter-zone space-y-4">
      {/* 搜索栏 */}
      <div className="relative">
        <div 
          className={`
            relative flex items-center gap-3 px-5 py-4 
            bg-slate-800/50 backdrop-blur-sm rounded-2xl 
            border transition-all duration-300
            ${isFocused 
              ? 'border-primary shadow-glow-sm ring-2 ring-primary/20' 
              : 'border-slate-700/50 hover:border-slate-600'
            }
          `}
        >
          <Search 
            size={22} 
            className={`flex-shrink-0 transition-colors ${isFocused ? 'text-primary' : 'text-slate-400'}`} 
          />
          <input
            ref={inputRef}
            type="text"
            value={localSearch}
            onChange={handleSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="搜索商品名称、描述..."
            className="flex-1 bg-transparent text-white text-lg placeholder:text-slate-500 focus:outline-none"
          />
          {localSearch && (
            <button
              onClick={handleClearSearch}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
              title="清除搜索"
            >
              <X size={18} className="text-slate-400" />
            </button>
          )}
          {/* 快捷键提示 */}
          <div className="hidden md:flex items-center gap-1 text-slate-500 text-sm">
            <kbd className="px-2 py-1 bg-slate-700/50 rounded text-xs">⌘</kbd>
            <kbd className="px-2 py-1 bg-slate-700/50 rounded text-xs">K</kbd>
          </div>
        </div>
        
        {/* 搜索发光效果 */}
        {isFocused && (
          <div className="absolute inset-0 -z-10 rounded-2xl bg-primary/5 blur-xl animate-pulse"></div>
        )}
      </div>

      {/* 分类标签 */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <Filter size={16} className="text-slate-400" />
          <span className="text-slate-400 text-sm font-medium">分类筛选</span>
          {selectedCategory && (
            <button
              onClick={() => onCategoryChange('')}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              清除筛选
            </button>
          )}
        </div>
        
        {/* 分类滚动容器 */}
        <div 
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* 全部按钮 */}
          <button
            onClick={() => onCategoryChange('')}
            className={`
              category-pill flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 
              rounded-full text-sm font-medium whitespace-nowrap
              transition-all duration-300 
              ${!selectedCategory 
                ? 'bg-gradient-to-r from-primary to-purple-500 text-white shadow-glow-sm' 
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
              }
            `}
          >
            <Sparkles size={14} />
            全部商品
          </button>

          {/* 加载中 */}
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div 
                key={i}
                className="flex-shrink-0 w-24 h-10 bg-slate-800/50 rounded-full animate-pulse"
              />
            ))
          ) : (
            categories.map(category => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`
                  category-pill flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 
                  rounded-full text-sm font-medium whitespace-nowrap
                  transition-all duration-300
                  ${selectedCategory === category.id
                    ? 'bg-gradient-to-r from-primary to-purple-500 text-white shadow-glow-sm' 
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                  }
                `}
              >
                <span className="text-base">{category.icon || '📦'}</span>
                {category.name}
              </button>
            ))
          )}
        </div>

        {/* 滚动渐变指示器 */}
        <div className="absolute right-0 top-8 bottom-0 w-12 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none"></div>
      </div>

      {/* 搜索/筛选状态提示 */}
      {(localSearch || selectedCategory) && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>当前筛选：</span>
          {localSearch && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-lg">
              搜索 "{localSearch}"
              <button onClick={handleClearSearch} className="hover:text-white">
                <X size={14} />
              </button>
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-lg">
              {categories.find(c => c.id === selectedCategory)?.icon || '📦'}
              {categories.find(c => c.id === selectedCategory)?.name || '未知分类'}
              <button onClick={() => onCategoryChange('')} className="hover:text-white">
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchFilter
