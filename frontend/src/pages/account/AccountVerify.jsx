import React, { useState, useEffect, useRef } from 'react'
import {
  ShieldCheck, Clock, XCircle, CheckCircle, Upload, AlertTriangle,
  Loader2, ImagePlus, X, GraduationCap, User, CreditCard, Camera
} from 'lucide-react'
import { authFetch } from '../../utils/api'

const AccountVerify = () => {
  const [status, setStatus] = useState(null) // { isStudentVerified, application }
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  // Form state
  const [realName, setRealName] = useState('')
  const [studentIdNumber, setStudentIdNumber] = useState('')
  const [idPhoto, setIdPhoto] = useState('')
  const [idPhotoPreview, setIdPhotoPreview] = useState('')
  const fileInputRef = useRef(null)

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Load status
  const loadStatus = async () => {
    const res = await authFetch('/users/verify-student/status')
    if (res.code === 200 && res.data) {
      setStatus(res.data)
    }
    setLoading(false)
  }

  useEffect(() => { loadStatus() }, [])

  // Upload handler
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('图片不能超过 5MB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setIdPhoto(ev.target.result)
      setIdPhotoPreview(ev.target.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removePhoto = () => {
    setIdPhoto('')
    setIdPhotoPreview('')
  }

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!realName.trim()) { showToast('请输入真实姓名', 'error'); return }
    if (!studentIdNumber.trim()) { showToast('请输入学号或证件号', 'error'); return }
    if (!idPhoto) { showToast('请上传证件照片', 'error'); return }

    setSubmitting(true)
    const res = await authFetch('/users/verify-student', {
      method: 'POST',
      body: {
        real_name: realName.trim(),
        student_id_number: studentIdNumber.trim(),
        id_photo_url: idPhoto,
      },
    })
    setSubmitting(false)

    if (res.code === 200) {
      showToast('认证申请已提交，请等待审核', 'success')
      loadStatus()
    } else {
      showToast(res.message || '提交失败', 'error')
    }
  }

  // Derive current state
  const isVerified = status?.isStudentVerified
  const app = status?.application
  const appStatus = app?.status // 'pending' | 'approved' | 'rejected' | null
  const rejectReason = app?.admin_note

  // Determine which UI to show
  let viewState = 'form' // 'form' | 'pending' | 'verified' | 'rejected'
  if (isVerified) viewState = 'verified'
  else if (appStatus === 'pending') viewState = 'pending'
  else if (appStatus === 'rejected') viewState = 'rejected'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="text-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[70] px-4 py-3 rounded-xl text-sm font-medium shadow-2xl border backdrop-blur-sm text-white ${
          toast.type === 'success' ? 'bg-emerald-600/90 border-emerald-500/30'
          : toast.type === 'error' ? 'bg-red-600/90 border-red-500/30'
          : 'bg-violet-600/90 border-violet-500/30'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">身份认证</h1>
        <p className="text-slate-400 text-sm mt-1">完成学生/实名认证，获取信任徽章</p>
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* STATE: VERIFIED */}
      {/* ════════════════════════════════════════════ */}
      {viewState === 'verified' && (
        <div className="bg-emerald-500/[0.06] border border-emerald-500/20 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-5 bg-emerald-500/10 rounded-3xl flex items-center justify-center">
            <ShieldCheck size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">认证通过</h2>
          <p className="text-sm text-emerald-300/70 mb-4">您已完成学生身份认证，信任徽章已激活</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
            <GraduationCap size={16} className="text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">学生认证</span>
            <CheckCircle size={14} className="text-emerald-400" />
          </div>
          {app && (
            <p className="text-xs text-slate-500 mt-4">
              认证时间：{new Date(app.reviewed_at || app.created_at).toLocaleDateString('zh-CN')}
            </p>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* STATE: PENDING */}
      {/* ════════════════════════════════════════════ */}
      {viewState === 'pending' && (
        <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-5 bg-amber-500/10 rounded-3xl flex items-center justify-center">
            <Clock size={40} className="text-amber-400 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">审核中</h2>
          <p className="text-sm text-amber-300/70 mb-4">您的认证申请正在审核中，请耐心等待</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/25 rounded-xl">
            <Loader2 size={14} className="text-amber-400 animate-spin" />
            <span className="text-sm font-medium text-amber-400">等待管理员审核</span>
          </div>
          {app && (
            <p className="text-xs text-slate-500 mt-4">
              提交时间：{new Date(app.created_at).toLocaleDateString('zh-CN')}
            </p>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* STATE: REJECTED (show alert + form) */}
      {/* ════════════════════════════════════════════ */}
      {viewState === 'rejected' && (
        <div className="bg-red-500/[0.06] border border-red-500/20 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <XCircle size={22} className="text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-red-300 text-sm">认证未通过</h3>
              <p className="text-xs text-red-300/70 mt-1">
                {rejectReason || '您的认证申请被拒绝，请修改信息后重新提交'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* FORM (shown for UNVERIFIED and REJECTED) */}
      {/* ════════════════════════════════════════════ */}
      {(viewState === 'form' || viewState === 'rejected') && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Real Name */}
          <div className="bg-[#111827]/60 border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2">
              <User size={14} /> 个人信息
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">真实姓名</label>
                <input
                  type="text"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  placeholder="请输入您的真实姓名"
                  maxLength={50}
                  className="w-full px-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">学号 / 证件号码</label>
                <input
                  type="text"
                  value={studentIdNumber}
                  onChange={(e) => setStudentIdNumber(e.target.value)}
                  placeholder="请输入学号或身份证号码"
                  maxLength={50}
                  className="w-full px-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 outline-none transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="bg-[#111827]/60 border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2">
              <CreditCard size={14} /> 证件照片
            </h2>

            {idPhotoPreview ? (
              <div className="relative group">
                <img
                  src={idPhotoPreview}
                  alt="证件照"
                  className="w-full max-h-64 object-contain rounded-xl border border-white/[0.06] bg-slate-800/50"
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-8 h-8 bg-slate-900/80 hover:bg-violet-600 rounded-lg flex items-center justify-center text-white transition-colors"
                  >
                    <Camera size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="w-8 h-8 bg-slate-900/80 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center h-44 border-2 border-dashed border-white/[0.08] hover:border-violet-500/30 rounded-xl cursor-pointer transition-all bg-slate-800/30 hover:bg-slate-800/50 group"
              >
                <div className="w-14 h-14 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-violet-500/20 transition-colors">
                  <ImagePlus size={24} className="text-violet-400" />
                </div>
                <span className="text-sm text-slate-400 group-hover:text-white transition-colors">点击上传证件照片</span>
                <span className="text-xs text-slate-500 mt-1">学生证、身份证均可 · 支持 JPG/PNG · 最大 5MB</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            <div className="mt-4 bg-blue-500/[0.04] border border-blue-500/10 rounded-xl p-3">
              <p className="text-xs text-blue-300/70 flex items-start gap-2">
                <AlertTriangle size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <span>请确保证件信息清晰可读。照片仅用于身份核验，我们将严格保护您的隐私。</span>
              </p>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !realName.trim() || !studentIdNumber.trim() || !idPhoto}
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-sm text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
          >
            {submitting ? (
              <><Loader2 size={18} className="animate-spin" /> 提交中...</>
            ) : (
              <><Upload size={18} /> 提交认证申请</>
            )}
          </button>
        </form>
      )}
    </div>
  )
}

export default AccountVerify
