import React, { useState, useEffect } from 'react'
import { Megaphone, Plus, Edit, Trash2, RefreshCw, X, Eye, EyeOff } from 'lucide-react'
import { adminRequest } from '../utils/api'

const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState({ content: '', link: '', bg_color: '#6366f1', status: 1, sort_order: 0 })

  useEffect(() => { loadAnnouncements() }, [])

  const loadAnnouncements = async () => {
    setLoading(true)
    const res = await adminRequest('/admin/announcements')
    if (res.code === 200) setAnnouncements(res.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.content) { alert('请填写公告内容'); return }
    
    const url = editingItem ? `/admin/announcements/${editingItem.id}` : '/admin/announcements'
    const method = editingItem ? 'PUT' : 'POST'
    const res = await adminRequest(url, { method, body: JSON.stringify(form) })
    
    if (res.code === 200) {
      setShowForm(false)
      setEditingItem(null)
      setForm({ content: '', link: '', bg_color: '#6366f1', status: 1, sort_order: 0 })
      loadAnnouncements()
    } else {
      alert(res.message || '操作失败')
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setForm({
      content: item.content || '',
      link: item.link || '',
      bg_color: item.bg_color || '#6366f1',
      status: item.status ?? 1,
      sort_order: item.sort_order || 0
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除该公告？')) return
    const res = await adminRequest(`/admin/announcements/${id}`, { method: 'DELETE' })
    if (res.code === 200) loadAnnouncements()
  }

  const handleToggleStatus = async (item) => {
    const res = await adminRequest(`/admin/announcements/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: item.status === 1 ? 0 : 1 })
    })
    if (res.code === 200) loadAnnouncements()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">公告管理</h1>
        <div className="flex gap-2">
          <button onClick={loadAnnouncements} className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">
            <RefreshCw size={16} /> 刷新
          </button>
          <button onClick={() => { setShowForm(true); setEditingItem(null); setForm({ content: '', link: '', bg_color: '#6366f1', status: 1, sort_order: 0 }) }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700">
            <Plus size={16} /> 添加公告
          </button>
        </div>
      </div>

      {/* 公告表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingItem ? '编辑公告' : '添加公告'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">公告内容 *</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg h-24" placeholder="输入公告内容" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">跳转链接</label>
                <input type="text" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg" placeholder="https://..." />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-slate-400 mb-1">背景颜色</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer" />
                    <input type="text" value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg" />
                  </div>
                </div>
                <div className="w-24">
                  <label className="block text-sm text-slate-400 mb-1">排序</label>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="status" checked={form.status === 1} onChange={(e) => setForm({ ...form, status: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 rounded" />
                <label htmlFor="status" className="text-sm text-slate-400">启用公告</label>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">取消</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 公告列表 */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-slate-400">加载中...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-8 text-slate-400">暂无公告</div>
        ) : announcements.map(item => (
          <div key={item.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center gap-4">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: item.bg_color || '#6366f1' }} />
            <div className="flex-1">
              <p className="text-sm">{item.content}</p>
              {item.link && <p className="text-xs text-slate-500 mt-1">{item.link}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleToggleStatus(item)} className={`p-2 rounded ${item.status === 1 ? 'text-green-400' : 'text-slate-500'}`}>
                {item.status === 1 ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-white"><Edit size={16} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AnnouncementsPage
