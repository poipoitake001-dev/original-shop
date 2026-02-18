import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FileText, AlertCircle } from 'lucide-react'

const InfoPage = () => {
  const { slug } = useParams()
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    fetch(`/api/settings/pages/${slug}`)
      .then(r => r.json())
      .then(res => {
        if (res.code === 200 && res.data) {
          setPage(res.data)
        } else {
          setNotFound(true)
        }
        setLoading(false)
      })
      .catch(() => {
        setNotFound(true)
        setLoading(false)
      })
  }, [slug])

  // 简易 Markdown 渲染（加粗、换行）
  const renderContent = (text) => {
    if (!text) return null
    return text.split('\n').map((line, i) => {
      // 处理 **加粗**
      const parts = line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
        }
        return part
      })
      return (
        <React.Fragment key={i}>
          {line === '' ? <br /> : <p className="mb-1">{parts}</p>}
        </React.Fragment>
      )
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
        <AlertCircle size={56} className="text-gray-600 mb-4" />
        <h1 className="text-2xl font-bold mb-2">页面不存在</h1>
        <p className="text-gray-400 mb-6">您访问的页面不存在或已被移除</p>
        <Link to="/" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors">
          返回首页
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 顶部导航 */}
      <div className="bg-gray-900/80 border-b border-gray-800 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-indigo-400" />
            <span className="text-sm font-medium">{page.title}</span>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <article className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">{page.title}</h1>
        {page.updated_at && (
          <p className="text-sm text-gray-500 mb-8">
            最后更新：{new Date(page.updated_at).toLocaleDateString('zh-CN')}
          </p>
        )}

        <div className="text-gray-300 text-[15px] leading-relaxed space-y-1">
          {renderContent(page.content)}
        </div>
      </article>

      {/* 底部返回 */}
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="border-t border-gray-800 pt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-300 transition-colors"
          >
            <ArrowLeft size={16} />
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}

export default InfoPage
