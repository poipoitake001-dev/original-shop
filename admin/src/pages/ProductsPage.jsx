import React, { useState, useEffect, useRef } from 'react'
import { Package, Plus, Edit, Trash2, RefreshCw, Key, Upload, X, ChevronDown, ChevronUp, Eye, EyeOff, ImagePlus } from 'lucide-react'
import { adminRequest } from '../utils/api'

// ==================== 商品管理 ====================
const ProductsPage = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [expandedProduct, setExpandedProduct] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', price: '', category_id: '', icon: '📦', delivery_type: 'auto', images: [] })
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    const res = await adminRequest('/admin/products')
    if (res.code === 200) setProducts(res.data || [])
    setLoading(false)
  }

  const loadCategories = async () => {
    const res = await adminRequest('/admin/categories')
    if (res.code === 200) setCategories(res.data || [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.price) { alert('请填写商品名称和价格'); return }
    
    // 将 images 数组序列化为 JSON 存入 image_url
    const payload = { ...form, image_url: form.images.length > 0 ? JSON.stringify(form.images) : '' }
    delete payload.images

    const url = editingProduct ? `/admin/products/${editingProduct.id}` : '/admin/products'
    const method = editingProduct ? 'PUT' : 'POST'
    const res = await adminRequest(url, { method, body: JSON.stringify(payload) })
    
    if (res.code === 200) {
      setShowForm(false)
      setEditingProduct(null)
      setForm({ title: '', description: '', price: '', category_id: '', icon: '📦', delivery_type: 'auto', images: [] })
      loadProducts()
    } else {
      alert(res.message || '操作失败')
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    // 解析已有的图片
    let images = []
    if (product.image_url) {
      try { images = JSON.parse(product.image_url) } catch { images = product.image_url ? [product.image_url] : [] }
    }
    setForm({
      title: product.title || '',
      description: product.description || '',
      price: product.price || '',
      category_id: product.category_id || '',
      icon: product.icon || '📦',
      delivery_type: product.delivery_type || 'auto',
      images
    })
    setShowForm(true)
  }

  // 图片上传处理
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    files.forEach(file => {
      if (!file.type.startsWith('image/')) return
      if (file.size > 2 * 1024 * 1024) { alert(`${file.name} 超过 2MB 限制`); return }

      const reader = new FileReader()
      reader.onload = (ev) => {
        setForm(prev => ({ ...prev, images: [...prev.images, ev.target.result] }))
      }
      reader.readAsDataURL(file)
    })
    // 清空 input 以便重复选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (index) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除该商品？关联的卡密也会被删除！')) return
    const res = await adminRequest(`/admin/products/${id}`, { method: 'DELETE' })
    if (res.code === 200) loadProducts()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">商品管理</h1>
        <div className="flex gap-2">
          <button onClick={loadProducts} className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">
            <RefreshCw size={16} /> 刷新
          </button>
          <button onClick={() => { setShowForm(true); setEditingProduct(null); setForm({ title: '', description: '', price: '', category_id: '', icon: '📦', delivery_type: 'auto', images: [] }) }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700">
            <Plus size={16} /> 添加商品
          </button>
        </div>
      </div>

      {/* 商品表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingProduct ? '编辑商品' : '添加商品'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">商品名称 *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg" placeholder="输入商品名称" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">价格 *</label>
                <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">分类</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg">
                  <option value="">选择分类</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">发货方式</label>
                <select value={form.delivery_type} onChange={(e) => setForm({ ...form, delivery_type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg">
                  <option value="auto">自动发货（卡密）</option>
                  <option value="manual">手动发货</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">自动发货：支付成功后自动发送卡密</p>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">图标</label>
                <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg" placeholder="📦" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">描述</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg h-20" placeholder="商品描述" />
              </div>
              {/* 图片上传 */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">商品图片</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-600 group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(idx)}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-600 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors">
                    <ImagePlus size={20} />
                    <span className="text-xs mt-1">上传</span>
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                <p className="text-xs text-slate-500">支持多张图片，每张不超过 2MB</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">取消</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 商品列表 */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-slate-400">加载中...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-slate-400">暂无商品，点击上方按钮添加</div>
        ) : products.map(product => (
          <div key={product.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {(() => {
                  let imgs = []
                  try { imgs = JSON.parse(product.image_url) } catch {}
                  return imgs.length > 0
                    ? <img src={imgs[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    : <span className="text-2xl w-12 h-12 flex items-center justify-center">{product.icon || '📦'}</span>
                })()}
                <div>
                  <h3 className="font-medium">{product.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                    <span className="text-green-400 font-medium">¥{parseFloat(product.price || 0).toFixed(2)}</span>
                    <span>库存: {product.stock || 0}</span>
                    <span className="text-indigo-400">可用卡密: {product.available_keys || 0}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg hover:bg-indigo-600/30">
                  <Key size={14} /> 卡密管理
                  {expandedProduct === product.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button onClick={() => handleEdit(product)} className="p-2 text-slate-400 hover:text-white"><Edit size={16} /></button>
                <button onClick={() => handleDelete(product.id)} className="p-2 text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
              </div>
            </div>
            
            {/* 卡密管理面板 */}
            {expandedProduct === product.id && (
              <CardKeysPanel productId={product.id} onUpdate={loadProducts} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================== 卡密管理面板 ====================
const CardKeysPanel = ({ productId, onUpdate }) => {
  const [cardKeys, setCardKeys] = useState([])
  const [stats, setStats] = useState({ total: 0, available: 0, sold: 0 })
  const [loading, setLoading] = useState(true)
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showKeys, setShowKeys] = useState(false)

  useEffect(() => { loadCardKeys() }, [productId])

  const loadCardKeys = async () => {
    setLoading(true)
    const res = await adminRequest(`/admin/cardkeys/${productId}`)
    if (res.code === 200) {
      setCardKeys(res.data?.list || [])
      setStats(res.data?.stats || { total: 0, available: 0, sold: 0 })
    }
    setLoading(false)
  }

  const handleImport = async () => {
    if (!importText.trim()) { alert('请输入卡密'); return }
    const keys = importText.split('\n').map(k => k.trim()).filter(k => k)
    if (keys.length === 0) { alert('没有有效的卡密'); return }

    setImporting(true)
    const res = await adminRequest(`/admin/cardkeys/${productId}/import`, {
      method: 'POST',
      body: JSON.stringify({ cardKeys: keys })
    })
    setImporting(false)

    if (res.code === 200) {
      alert(`成功导入 ${res.data?.imported || 0} 个卡密${res.data?.duplicates ? `，${res.data.duplicates} 个重复` : ''}`)
      setImportText('')
      setShowImport(false)
      loadCardKeys()
      onUpdate?.()
    } else {
      alert(res.message || '导入失败')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除该卡密？')) return
    const res = await adminRequest(`/admin/cardkeys/${id}`, { method: 'DELETE' })
    if (res.code === 200) { loadCardKeys(); onUpdate?.() }
  }

  const handleClear = async () => {
    if (!confirm('确定清空所有未售出的卡密？此操作不可恢复！')) return
    const res = await adminRequest(`/admin/cardkeys/product/${productId}/clear`, { method: 'DELETE' })
    if (res.code === 200) { loadCardKeys(); onUpdate?.() }
  }

  return (
    <div className="border-t border-slate-700 p-4 bg-slate-800/50">
      {/* 统计信息 */}
      <div className="flex items-center gap-6 mb-4">
        <div className="text-sm">
          <span className="text-slate-400">总数:</span> <span className="font-medium">{stats.total}</span>
        </div>
        <div className="text-sm">
          <span className="text-slate-400">可用:</span> <span className="font-medium text-green-400">{stats.available}</span>
        </div>
        <div className="text-sm">
          <span className="text-slate-400">已售:</span> <span className="font-medium text-orange-400">{stats.sold}</span>
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowKeys(!showKeys)} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white">
          {showKeys ? <EyeOff size={14} /> : <Eye size={14} />}
          {showKeys ? '隐藏卡密' : '显示卡密'}
        </button>
        <button onClick={() => setShowImport(!showImport)}
          className="flex items-center gap-1 px-3 py-1.5 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30">
          <Upload size={14} /> 导入卡密
        </button>
        {stats.available > 0 && (
          <button onClick={handleClear} className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30">
            <Trash2 size={14} /> 清空未售
          </button>
        )}
      </div>

      {/* 导入面板 */}
      {showImport && (
        <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
          <p className="text-sm text-slate-400 mb-2">每行一个卡密，支持批量导入</p>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)}
            className="w-full h-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm font-mono"
            placeholder="XXXX-XXXX-XXXX&#10;YYYY-YYYY-YYYY&#10;ZZZZ-ZZZZ-ZZZZ" />
          <div className="flex gap-2 mt-2">
            <button onClick={() => setShowImport(false)} className="px-4 py-2 bg-slate-600 rounded-lg hover:bg-slate-500">取消</button>
            <button onClick={handleImport} disabled={importing} className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
              {importing ? '导入中...' : '确认导入'}
            </button>
          </div>
        </div>
      )}

      {/* 卡密列表 */}
      {showKeys && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4 text-slate-400">加载中...</div>
          ) : cardKeys.length === 0 ? (
            <div className="text-center py-4 text-slate-400">暂无卡密</div>
          ) : cardKeys.map(key => (
            <div key={key.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${key.status === 0 ? 'bg-slate-700/50' : 'bg-slate-700/30'}`}>
              <code className={`text-sm font-mono ${key.status === 0 ? 'text-green-400' : 'text-slate-500 line-through'}`}>
                {key.card_key}
              </code>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${key.status === 0 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                  {key.status === 0 ? '可用' : '已售'}
                </span>
                {key.status === 0 && (
                  <button onClick={() => handleDelete(key.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductsPage
