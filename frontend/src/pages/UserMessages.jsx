import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, MessageCircle, Headphones, Loader2 } from 'lucide-react'
import { authFetch } from '../utils/api'

// 骨架加载器
const MessageSkeleton = () => (
  <div className="space-y-4 p-4 animate-pulse">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
        <div className={`${i % 2 === 0 ? 'w-48' : 'w-56'} h-12 rounded-2xl ${i % 2 === 0 ? 'bg-indigo-900/30' : 'bg-gray-800/50'}`} />
      </div>
    ))}
  </div>
)

const UserMessages = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [adminUser, setAdminUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const bodyRef = useRef(null)
  const bottomRef = useRef(null)
  const pollRef = useRef(null)
  const prevCountRef = useRef(0)

  const scrollToBottom = useCallback((smooth) => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
    }, 30)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('user_info')
    if (!saved) { navigate('/'); return }
    const u = JSON.parse(saved)
    setUser(u)

    authFetch('/messages/conversations').then(res => {
      if (res.code === 200 && res.data?.length > 0) {
        setAdminUser(res.data[0])
        loadHistory(res.data[0].id)
      }
      setLoading(false)
    })

    pollRef.current = setInterval(() => {
      authFetch('/messages/conversations').then(res => {
        if (res.code === 200 && res.data?.length > 0) {
          setAdminUser(res.data[0])
          loadHistory(res.data[0].id, true)
        }
      })
    }, 4000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [navigate])

  const loadHistory = useCallback((targetId, silent) => {
    authFetch(`/messages/history?targetId=${targetId}&limit=100`).then(res => {
      if (res.code === 200) {
        const list = res.data.list || []
        setMessages(list)
        if (!silent || list.length !== prevCountRef.current) {
          prevCountRef.current = list.length
          scrollToBottom(!silent)
        }
      }
    })
    if (!silent) authFetch('/messages/read', { method: 'PUT', body: { targetId } })
  }, [scrollToBottom])

  // 乐观 UI 发送
  const handleSend = async () => {
    if (!input.trim() || !adminUser) return
    const text = input.trim()
    setInput('')

    // 立即在本地显示消息（乐观更新）
    const optimisticMsg = {
      id: 'temp-' + Date.now(),
      sender_id: user.id,
      receiver_id: adminUser.id,
      content: text,
      is_read: 0,
      created_at: new Date().toISOString(),
      _sending: true
    }
    setMessages(prev => [...prev, optimisticMsg])
    scrollToBottom(true)

    const res = await authFetch('/messages/send', {
      method: 'POST',
      body: { receiverId: adminUser.id, content: text }
    })

    if (res.code === 200) {
      // 替换乐观消息为真实消息
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? { ...res.data, _sending: false } : m))
    } else {
      // 发送失败，标记错误
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? { ...m, _sending: false, _failed: true } : m))
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="bg-gray-900/80 border-b border-gray-800 px-4 py-3 flex items-center gap-3 shrink-0 backdrop-blur-sm">
        <Link to="/" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center">
            <Headphones size={18} />
          </div>
          <div>
            <h1 className="text-sm font-semibold">联系客服</h1>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              在线
            </p>
          </div>
        </div>
      </div>

      {/* Chat body */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <MessageSkeleton />
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500 text-sm">发送消息开始对话</p>
            <p className="text-gray-600 text-xs mt-1">客服会尽快回复您</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender_id === user?.id
            const time = new Date(msg.created_at).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${msg._sending ? 'opacity-60' : ''}`}>
                <div
                  className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    isMine
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl rounded-br-sm'
                      : 'bg-white/[0.08] text-gray-200 rounded-2xl rounded-bl-sm'
                  } ${msg._failed ? 'border border-red-500/50' : ''}`}
                  title={new Date(msg.created_at).toLocaleString('zh-CN')}
                >
                  {msg.content}
                  <div className={`text-[10px] mt-1 flex items-center gap-1 ${isMine ? 'text-white/50 justify-end' : 'text-gray-500'}`}>
                    {msg._sending && <Loader2 size={10} className="animate-spin" />}
                    {msg._failed && <span className="text-red-400">发送失败</span>}
                    {!msg._sending && !msg._failed && time}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-gray-900/80 border-t border-gray-800 p-3 shrink-0">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="输入消息... (Enter 发送)"
            className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:border-indigo-500 outline-none resize-none max-h-24"
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 rounded-xl transition-colors flex-shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserMessages
