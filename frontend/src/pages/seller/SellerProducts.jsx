import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Key, ChevronDown, ChevronUp, Upload, X, AlertCircle, Package, ImagePlus, ShieldCheck, Clock, Zap } from 'lucide-react'
import { authFetch, API_BASE } from '../../utils/api'

const auditBadge = {
  pending: { text: '待审核', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  approved: { text: '已上架', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  rejected: { text: '被拒绝', cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
}

const SellerProducts = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [expandedKeys, setExpandedKeys] = useState(null) // product id for expanded card keys
  const [categories, setCategories] = useState([])
  const [toast, setToast] = useState(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    const res = await authFetch('/seller/products')
    if (res.code === 200) setProducts(res.data.list || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadProducts()
    // Load categories
    fetch(`${API_BASE}/categories`).then(r => r.json()).then(res => {
      if (res.code === 200) setCategories(res.data?.list || res.data || [])
    })
  }, [loadProducts])

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除该商品？')) return
    const res = await authFetch(`/seller/products/${id}`, { method: 'DELETE' })
    if (res.code === 200) {
      showToast('商品已删除', 'success')
      loadProducts()
    } else {
      showToast(res.message || '删除失败', 'error')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-indigo-600'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">我的商品</h1>
        <button
          onClick={() => { setEditingProduct(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          发布商品
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Package size={48} className="mx-auto mb-4 opacity-30" />
          <p>还没有商品，点击上方"发布商品"开始</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(product => {
            const badge = auditBadge[product.audit_status] || auditBadge.pending
            return (
              <div key={product.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  {/* Icon / Image */}
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-2xl shrink-0">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      product.icon || '📦'
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-medium truncate">{product.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.text}</span>
                      {product.type === 'PHYSICAL' ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">📦 实物</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">🔑 虚拟</span>
                      )}
                      {(product.delivery_type || 'auto') === 'auto' ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">自动发卡</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-600/30 text-gray-300 border border-gray-600/30">手动发货</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>¥{parseFloat(product.price).toFixed(2)}</span>
                      <span>库存: {product.stock}</span>
                      <span>销量: {product.sales}</span>
                      {product.category_name && <span>{product.category_name}</span>}
                    </div>
                    {product.audit_status === 'rejected' && product.audit_feedback && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-red-400">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>拒绝原因: {product.audit_feedback}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {(product.delivery_type || 'auto') === 'auto' && (
                      <button
                        onClick={() => setExpandedKeys(expandedKeys === product.id ? null : product.id)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        title="管理卡密"
                      >
                        <Key size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => { setEditingProduct(product); setShowForm(true) }}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Card Keys Panel - 仅自动发卡类型显示 */}
                {expandedKeys === product.id && (product.delivery_type || 'auto') === 'auto' && (
                  <CardKeysPanel productId={product.id} onStockChange={loadProducts} showToast={showToast} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadProducts(); showToast(editingProduct ? '商品已更新' : '商品已创建', 'success') }}
          showToast={showToast}
        />
      )}
    </div>
  )
}

// ========== Card Keys Panel ==========
const CardKeysPanel = ({ productId, onStockChange, showToast }) => {
  const [keys, setKeys] = useState([])
  const [stats, setStats] = useState({ total: 0, available: 0, sold: 0 })
  const [loading, setLoading] = useState(true)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState([])

  const handleBatchDelete = async () => {
    if (selectedKeys.length === 0) return
    if (!confirm('确定删除选中的 ' + selectedKeys.length + ' 个卡密？')) return
    for (const id of selectedKeys) {
      await authFetch(`/seller/cardkeys/${id}`, { method: 'DELETE' })
    }
    setSelectedKeys([])
    loadKeys()
    onStockChange()
    showToast('批量删除完成', 'success')
  }

  const loadKeys = useCallback(async () => {
    const res = await authFetch(`/seller/cardkeys/${productId}`)
    if (res.code === 200) {
      setKeys(res.data.list || [])
      setStats(res.data.stats || { total: 0, available: 0, sold: 0 })
    }
    setLoading(false)
  }, [productId])

  useEffect(() => { loadKeys() }, [loadKeys])

  const handleImport = async () => {
    if (!importText.trim()) return
    setImporting(true)
    const res = await authFetch(`/seller/cardkeys/${productId}/import`, {
      method: 'POST',
      body: { card_keys: importText },
    })
    setImporting(false)
    if (res.code === 200) {
      showToast(`导入成功: ${res.data.imported} 个`, 'success')
      setImportText('')
      loadKeys()
      onStockChange()
    } else {
      showToast(res.message || '导入失败', 'error')
    }
  }

  const handleDeleteKey = async (id) => {
    const res = await authFetch(`/seller/cardkeys/${id}`, { method: 'DELETE' })
    if (res.code === 200) {
      loadKeys()
      onStockChange()
    } else {
      showToast(res.message || '删除失败', 'error')
    }
  }

  return (
    <div className="border-t border-gray-800 p-4 bg-gray-900/50">
      {/* Stats */}
      <div className="flex gap-4 mb-4 text-sm">
        <span className="text-gray-400">总计: <span className="text-white">{stats.total}</span></span>
        <span className="text-gray-400">可用: <span className="text-emerald-400">{stats.available}</span></span>
        <span className="text-gray-400">已售: <span className="text-blue-400">{stats.sold}</span></span>
      </div>

      {/* Import */}
      <div className="mb-4">
        <textarea
          value={importText}
          onChange={e => setImportText(e.target.value)}
          placeholder="输入卡密，每行一个，或用分号分隔"
          rows={3}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none resize-none"
        />
        <button
          onClick={handleImport}
          disabled={importing || !importText.trim()}
          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-xs font-medium transition-colors"
        >
          <Upload size={14} />
          {importing ? '导入中...' : '导入卡密'}
        </button>
      </div>

      {/* Keys List */}
      {loading ? (
        <div className="text-sm text-gray-500">加载中...</div>
      ) : keys.length === 0 ? (
        <div className="text-sm text-gray-500">暂无卡密</div>
      ) : (
        <div>
          {/* 全选 + 批量操作 */}
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedKeys.length === keys.length && keys.length > 0}
                onChange={e => setSelectedKeys(e.target.checked ? keys.map(k => k.id) : [])}
                className="rounded"
              />
              全选
            </label>
            {selectedKeys.length > 0 && (
              <button onClick={handleBatchDelete} className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white">
                批量删除({selectedKeys.length})
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
          {keys.map(k => (
            <div key={k.id} className="flex items-center justify-between px-3 py-2 bg-gray-800 rounded-lg text-sm">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={selectedKeys.includes(k.id)}
                  onChange={e => {
                    setSelectedKeys(prev => e.target.checked ? [...prev, k.id] : prev.filter(id => id !== k.id))
                  }}
                  className="rounded shrink-0"
                />
                <span className={`font-mono text-xs truncate ${k.status === 1 ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                  {k.card_key}
                </span>
              </div>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                <span className={`text-xs ${k.status === 1 ? 'text-blue-400' : 'text-emerald-400'}`}>
                  {k.status === 1 ? '已售' : '可用'}
                </span>
                <button onClick={() => handleDeleteKey(k.id)} className="text-gray-500 hover:text-red-400">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ========== Product Form Modal ==========
const ProductFormModal = ({ product, categories, onClose, onSaved, showToast }) => {
  const [form, setForm] = useState({
    title: product?.title || '',
    category_id: product?.category_id || (categories[0]?.id || 1),
    type: product?.type || 'VIRTUAL',
    delivery_type: product?.delivery_type || 'auto',
    description: product?.description || '',
    detail: product?.detail || '',
    price: product?.price || '',
    stock: product?.stock || '',
    icon: product?.icon || '📦',
    image_url: product?.image_url || '',
  })
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState(product?.image_url || '')
  const [canSkipAudit, setCanSkipAudit] = useState(false)

  // 检查用户是否有免审核权限
  useEffect(() => {
    authFetch('/customer/profile').then(res => {
      if (res.code === 200) {
        setCanSkipAudit(res.data?.can_skip_audit === 1 || res.data?.can_skip_audit === true)
      }
    })
  }, [])

  // 当商品类型变更时联动发货方式
  const handleTypeChange = (newType) => {
    setForm(f => ({
      ...f,
      type: newType,
      delivery_type: newType === 'PHYSICAL' ? 'manual' : f.delivery_type,
    }))
  }

  // 处理图片上传（Base64）
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('图片大小不能超过 2MB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target.result
      setForm(f => ({ ...f, image_url: base64 }))
      setImagePreview(base64)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setForm(f => ({ ...f, image_url: '' }))
    setImagePreview('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.price) {
      showToast('标题和价格不能为空', 'error')
      return
    }

    setSaving(true)
    const url = product ? `/seller/products/${product.id}` : '/seller/products'
    const method = product ? 'PUT' : 'POST'

    const body = { ...form, price: Number(form.price), type: form.type }
    if (form.delivery_type === 'manual' || form.type === 'PHYSICAL') body.stock = Number(form.stock) || 0
    const res = await authFetch(url, { method, body })
    setSaving(false)

    if (res.code === 200) {
      onSaved()
    } else {
      showToast(res.message || '保存失败', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-bold text-lg">{product ? '编辑商品' : '发布新商品'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {product && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-300">
              编辑后商品将重新进入审核状态
            </div>
          )}

          {/* 审核状态提示 */}
          {canSkipAudit ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <Zap size={16} className="text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs text-emerald-300 font-medium">信任卖家：即时上架</p>
                <p className="text-[10px] text-emerald-400/70 mt-0.5">您的商品无需审核，发布后立即上架</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <Clock size={16} className="text-amber-400 shrink-0" />
              <div>
                <p className="text-xs text-amber-300 font-medium">商品需要人工审核</p>
                <p className="text-[10px] text-amber-400/70 mt-0.5">发布后需等待管理员审核通过才能上架</p>
              </div>
            </div>
          )}

          {/* 商品类型选择器 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">商品类型</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTypeChange('VIRTUAL')}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  form.type === 'VIRTUAL'
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <span className="text-xl">🔑</span>
                <div className="text-left">
                  <p className={`text-sm font-medium ${form.type === 'VIRTUAL' ? 'text-indigo-300' : 'text-gray-300'}`}>虚拟卡密</p>
                  <p className="text-[10px] text-gray-500">自动发卡，库存由卡密决定</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('PHYSICAL')}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  form.type === 'PHYSICAL'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <span className="text-xl">📦</span>
                <div className="text-left">
                  <p className={`text-sm font-medium ${form.type === 'PHYSICAL' ? 'text-purple-300' : 'text-gray-300'}`}>实物商品</p>
                  <p className="text-[10px] text-gray-500">手动发货，需设置库存</p>
                </div>
              </button>
            </div>
          </div>

          {/* 商品图片上传 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">商品图片</label>
            {imagePreview ? (
              <div className="relative w-full rounded-xl overflow-hidden border border-gray-700 bg-gray-800">
                <img
                  src={imagePreview}
                  alt="商品图片"
                  className="w-full h-48 object-contain bg-gray-800"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <label className="w-8 h-8 bg-gray-900/80 hover:bg-indigo-600 rounded-lg flex items-center justify-center cursor-pointer transition-colors">
                    <ImagePlus size={16} />
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="w-8 h-8 bg-gray-900/80 hover:bg-red-600 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-xl cursor-pointer transition-colors bg-gray-800/50 hover:bg-gray-800">
                <ImagePlus size={32} className="text-gray-500 mb-2" />
                <span className="text-sm text-gray-400">点击上传商品图片</span>
                <span className="text-xs text-gray-500 mt-1">支持 JPG、PNG，最大 2MB</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">分类</label>
              <select
                value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none"
              >
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">发货方式</label>
              <select
                value={form.type === 'PHYSICAL' ? 'manual' : form.delivery_type}
                onChange={e => setForm(f => ({ ...f, delivery_type: e.target.value }))}
                disabled={form.type === 'PHYSICAL'}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none disabled:opacity-50"
              >
                {form.type !== 'PHYSICAL' && <option value="auto">🔑 自动发卡</option>}
                <option value="manual">📦 手动发货</option>
              </select>
              {form.type === 'PHYSICAL' && (
                <p className="text-[10px] text-gray-500 mt-1">实物商品固定为手动发货</p>
              )}
            </div>
          </div>

          {(form.delivery_type === 'manual' || form.type === 'PHYSICAL') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">库存数量</label>
              <input
                type="number" min="0"
                value={form.stock}
                onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none"
                placeholder="手动设置库存"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">标题 <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">价格 <span className="text-red-400">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">图标</label>
              <input
                type="text"
                value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none"
                placeholder="📦"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">简介</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">详情</label>
            <textarea
              value={form.detail}
              onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            {saving ? '保存中...' : product ? '更新商品' : '发布商品'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default SellerProducts
