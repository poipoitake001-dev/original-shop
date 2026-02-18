import React, { useState, useEffect, useRef } from 'react'
import {
  User, Camera, Save, Loader2, Star, ShieldCheck, Award, Trophy,
  ShoppingBag, Package, ThumbsUp, AlertTriangle, CheckCircle, ImagePlus, X
} from 'lucide-react'
import { profileApi } from '../../utils/api'

const ProfileSettings = () => {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // Form state
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [campus, setCampus] = useState('')
  const [dormitory, setDormitory] = useState('')
  const [className, setClassName] = useState('')
  const [major, setMajor] = useState('')

  const fileInputRef = useRef(null)

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Load profile
  useEffect(() => {
    const load = async () => {
      const res = await profileApi.get()
      if (res.code === 200 && res.data) {
        const d = res.data
        setProfile(d)
        setNickname(d.nickname || d.username || '')
        setAvatarUrl(d.avatarUrl || d.avatar || '')
        setAvatarPreview(d.avatarUrl || d.avatar || '')
        setCampus(d.campus || '')
        setDormitory(d.dormitory || '')
        setClassName(d.className || '')
        setMajor(d.major || '')
      }
      setLoading(false)
    }
    load()
  }, [])

  // Handle avatar file upload (convert to base64)
  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('图片不能超过 2MB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target.result
      setAvatarUrl(base64)
      setAvatarPreview(base64)
    }
    reader.readAsDataURL(file)
    // Reset file input so re-selecting the same file triggers onChange
    e.target.value = ''
  }

  const removeAvatar = () => {
    setAvatarUrl('')
    setAvatarPreview('')
  }

  // Save profile
  const handleSave = async () => {
    if (!nickname.trim()) {
      showToast('昵称不能为空', 'error')
      return
    }
    if (nickname.length > 50) {
      showToast('昵称不能超过50个字符', 'error')
      return
    }
    if (!campus.trim()) {
      showToast('请填写校区（必填）', 'error')
      return
    }
    if (campus.length > 100) {
      showToast('校区不能超过100个字符', 'error')
      return
    }
    setSaving(true)
    const res = await profileApi.update({
      nickname: nickname.trim(),
      avatarUrl: avatarUrl || null,
      campus: campus.trim(),
      dormitory: dormitory.trim() || null,
      className: className.trim() || null,
      major: major.trim() || null,
    })
    setSaving(false)
    if (res.code === 200) {
      showToast('资料更新成功！', 'success')
      // Update localStorage so navbar reflects changes
      try {
        const saved = JSON.parse(localStorage.getItem('user_info') || '{}')
        saved.nickname = nickname.trim()
        saved.avatarUrl = avatarUrl || null
        localStorage.setItem('user_info', JSON.stringify(saved))
      } catch { /* ignore */ }
    } else {
      showToast(res.message || '更新失败', 'error')
    }
  }

  // Compute display values for the preview card
  const previewName = nickname.trim() || profile?.username || '用户'
  const previewAvatar = avatarPreview
  const rating = profile?.rating || 5.0
  const reviewCount = profile?.reviewCount || 0

  // Badge definitions
  const allBadges = [
    {
      key: 'studentVerified',
      label: '学生认证',
      icon: ShieldCheck,
      active: profile?.isStudentVerified,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      inactiveBg: 'bg-slate-800/50 border-slate-700/50',
      tooltip: '完成学生身份认证后解锁',
    },
    {
      key: 'excellentSeller',
      label: '优秀卖家',
      icon: Trophy,
      active: profile?.badgeExcellentSeller,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      inactiveBg: 'bg-slate-800/50 border-slate-700/50',
      tooltip: '销售 10 件商品 + 0 纠纷 + 评分 ≥ 4.8 后解锁',
    },
    {
      key: 'excellentBuyer',
      label: '优秀买家',
      icon: Award,
      active: profile?.badgeExcellentBuyer,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      inactiveBg: 'bg-slate-800/50 border-slate-700/50',
      tooltip: '购买 10 件商品 + 0 纠纷后解锁',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl border backdrop-blur-sm animate-slide-down ${
          toast.type === 'success' ? 'bg-emerald-600/90 border-emerald-500/30 text-white'
          : toast.type === 'error' ? 'bg-red-600/90 border-red-500/30 text-white'
          : 'bg-violet-600/90 border-violet-500/30 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">个人资料</h1>
        <p className="text-slate-400 text-sm mt-1">管理您的头像、昵称和公开展示信息</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: Form Section (3/5) */}
        <div className="lg:col-span-3 space-y-6">

          {/* Avatar Section */}
          <div className="bg-[#111827]/60 border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-5">头像</h2>
            <div className="flex items-center gap-6">
              {/* Avatar preview */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white/[0.08] shadow-xl shadow-black/20 flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="头像" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white/90">
                        {(nickname || profile?.username || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                {/* Hover overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  <Camera size={22} className="text-white" />
                </button>
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <ImagePlus size={16} />
                    上传图片
                  </button>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={removeAvatar}
                      className="px-4 py-2 bg-slate-700/50 hover:bg-red-600/20 hover:text-red-400 border border-white/[0.06] rounded-xl text-sm font-medium transition-all flex items-center gap-2 text-slate-400"
                    >
                      <X size={16} />
                      移除
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">支持 JPG、PNG 格式，最大 2MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Nickname Section */}
          <div className="bg-[#111827]/60 border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-5">基本信息</h2>
            <div className="space-y-4">
              {/* Nickname */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="设置一个昵称..."
                  maxLength={50}
                  className="w-full px-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 outline-none transition-all"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  {nickname.length}/50 · 昵称将展示在您的公开资料和商品页面上
                </p>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">邮箱</label>
                <input
                  type="text"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-slate-800/30 border border-white/[0.04] rounded-xl text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1.5">邮箱地址无法修改</p>
              </div>

              {/* 校区（必填） */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">校区 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  placeholder="请填写所在校区"
                  maxLength={100}
                  className="w-full px-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 outline-none transition-all"
                />
                <p className="text-xs text-slate-500 mt-1.5">校区为必填项</p>
              </div>

              {/* 宿舍楼 */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">宿舍楼</label>
                <input
                  type="text"
                  value={dormitory}
                  onChange={(e) => setDormitory(e.target.value)}
                  placeholder="选填，如：1号楼"
                  maxLength={100}
                  className="w-full px-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 outline-none transition-all"
                />
              </div>

              {/* 班级 */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">班级</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="选填，如：计算机2021-1班"
                  maxLength={100}
                  className="w-full px-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 outline-none transition-all"
                />
              </div>

              {/* 专业 */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">专业</label>
                <input
                  type="text"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  placeholder="选填，如：计算机科学与技术"
                  maxLength={100}
                  className="w-full px-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
          >
            {saving ? (
              <><Loader2 size={18} className="animate-spin" /> 保存中...</>
            ) : (
              <><Save size={18} /> 保存更改</>
            )}
          </button>
        </div>

        {/* RIGHT: Preview + Badges (2/5) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Live Preview Card */}
          <div className="bg-[#111827]/60 border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2">
              <User size={14} /> 公开预览
            </h2>
            <div className="flex flex-col items-center text-center">
              {/* Preview avatar */}
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white/[0.08] shadow-xl shadow-black/20 mb-4">
                {previewAvatar ? (
                  <img src={previewAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white/90">
                      {previewName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Name */}
              <h3 className="text-lg font-bold text-white mb-1">{previewName}</h3>

              {/* Rating */}
              <div className="flex items-center gap-1.5 mb-3">
                <Star size={14} className="text-amber-400 fill-amber-400" />
                <span className="text-sm font-medium text-amber-400">{rating.toFixed(1)}</span>
                <span className="text-xs text-slate-500">({reviewCount} 评价)</span>
              </div>

              {/* Mini badges */}
              <div className="flex flex-wrap justify-center gap-1.5">
                {allBadges.filter(b => b.active).map(badge => (
                  <span
                    key={badge.key}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${badge.bg} ${badge.color}`}
                  >
                    <badge.icon size={12} />
                    {badge.label}
                  </span>
                ))}
                {allBadges.filter(b => b.active).length === 0 && (
                  <span className="text-xs text-slate-500">暂无徽章</span>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 w-full mt-5 pt-5 border-t border-white/[0.06]">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{profile?.soldCount || 0}</p>
                  <p className="text-[11px] text-slate-500">已售</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{profile?.boughtCount || 0}</p>
                  <p className="text-[11px] text-slate-500">已购</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{profile?.goodReviewCount || 0}</p>
                  <p className="text-[11px] text-slate-500">好评</p>
                </div>
              </div>
            </div>
          </div>

          {/* Badges Display */}
          <div className="bg-[#111827]/60 border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Award size={14} /> 我的徽章
            </h2>
            <div className="space-y-3">
              {allBadges.map(badge => (
                <div
                  key={badge.key}
                  className={`relative flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                    badge.active
                      ? `${badge.bg} ${badge.color}`
                      : `${badge.inactiveBg} text-slate-500`
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    badge.active
                      ? badge.bg
                      : 'bg-slate-700/50'
                  }`}>
                    <badge.icon size={20} className={badge.active ? badge.color : 'text-slate-600'} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${badge.active ? 'text-white' : 'text-slate-400'}`}>
                        {badge.label}
                      </span>
                      {badge.active && (
                        <CheckCircle size={14} className={badge.color} />
                      )}
                    </div>
                    {!badge.active && (
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {badge.tooltip}
                      </p>
                    )}
                    {badge.active && (
                      <p className="text-xs text-slate-400/80 mt-0.5">已解锁</p>
                    )}
                  </div>

                  {/* Status indicator */}
                  {!badge.active && (
                    <div className="w-2 h-2 rounded-full bg-slate-600 flex-shrink-0" />
                  )}
                  {badge.active && (
                    <div className="w-2 h-2 rounded-full bg-current flex-shrink-0 animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileSettings
