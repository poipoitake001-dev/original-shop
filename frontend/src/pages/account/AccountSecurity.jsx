import React, { useState, useEffect } from 'react'
import {
  Shield, Lock, Key, HelpCircle, CheckCircle, XCircle,
  Eye, EyeOff, ChevronRight, X, Loader2
} from 'lucide-react'
import { authFetch, API_BASE } from '../../utils/api'

const SECURITY_QUESTIONS = [
  '你的宠物叫什么名字？',
  '你的小学叫什么？',
  '你最喜欢的电影是什么？',
  '你母亲的姓氏是什么？',
  '你在哪个城市出生？',
  '你最好朋友的名字是什么？',
]

const AccountSecurity = () => {
  const [status, setStatus] = useState({
    hasPaymentPassword: false,
    hasSecurityQuestion: false,
    securityQuestion: null,
  })
  const [loading, setLoading] = useState(true)
  const [activeModal, setActiveModal] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadStatus = async () => {
    const res = await authFetch('/user/security/security-status')
    if (res.code === 200) setStatus(res.data)
    setLoading(false)
  }

  useEffect(() => { loadStatus() }, [])

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
        <div className={`fixed top-4 right-4 z-[70] px-4 py-3 rounded-xl text-sm font-medium shadow-2xl border backdrop-blur-sm ${
          toast.type === 'success' ? 'bg-emerald-600/90 border-emerald-500/30'
          : toast.type === 'error' ? 'bg-red-600/90 border-red-500/30'
          : 'bg-violet-600/90 border-violet-500/30'
        } text-white`}>
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">安全设置</h1>
        <p className="text-slate-400 text-sm mt-1">管理您的密码、支付密码和密保问题</p>
      </div>

      {/* Security Cards */}
      <div className="space-y-3">
        {/* Card 1: Login Password */}
        <SecurityCard
          icon={Lock}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-400"
          title="登录密码"
          description="用于登录账户的密码"
          statusOk={true}
          statusText="已设置"
          buttonText="修改"
          onClick={() => setActiveModal('changePassword')}
        />

        {/* Card 2: Payment Password */}
        <SecurityCard
          icon={Key}
          iconBg={status.hasPaymentPassword ? 'bg-emerald-500/10' : 'bg-red-500/10'}
          iconColor={status.hasPaymentPassword ? 'text-emerald-400' : 'text-red-400'}
          title="支付密码"
          description="6位数字支付密码，用于交易安全验证"
          statusOk={status.hasPaymentPassword}
          statusText={status.hasPaymentPassword ? '已设置' : '未设置'}
          buttonText={status.hasPaymentPassword ? '重置' : '设置'}
          onClick={() => setActiveModal('setPaymentPwd')}
        />

        {/* Card 3: Security Question */}
        <SecurityCard
          icon={HelpCircle}
          iconBg={status.hasSecurityQuestion ? 'bg-emerald-500/10' : 'bg-amber-500/10'}
          iconColor={status.hasSecurityQuestion ? 'text-emerald-400' : 'text-amber-400'}
          title="密保问题"
          description={
            status.hasSecurityQuestion && status.securityQuestion
              ? `当前问题：${status.securityQuestion}`
              : '未设置（建议设置，用于找回密码）'
          }
          statusOk={status.hasSecurityQuestion}
          statusText={status.hasSecurityQuestion ? '已设置' : '未设置'}
          buttonText={status.hasSecurityQuestion ? '修改' : '设置'}
          onClick={() => setActiveModal('setSecurityQ')}
        />
      </div>

      {/* Security Tips */}
      <div className="bg-violet-500/[0.04] border border-violet-500/10 rounded-2xl p-5">
        <p className="text-sm font-medium text-violet-300 mb-2">安全建议</p>
        <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
          <li>请设置与登录密码不同的支付密码</li>
          <li>设置密保问题后，可通过密保找回登录密码</li>
          <li>请勿将密码告知他人</li>
          <li>建议定期修改登录密码</li>
        </ul>
      </div>

      {/* Modals */}
      {activeModal === 'changePassword' && (
        <ChangePasswordModal onClose={() => setActiveModal(null)} showToast={showToast} />
      )}
      {activeModal === 'setPaymentPwd' && (
        <SetPaymentPasswordModal onClose={() => setActiveModal(null)} showToast={showToast} onSuccess={loadStatus} />
      )}
      {activeModal === 'setSecurityQ' && (
        <SetSecurityQuestionModal onClose={() => setActiveModal(null)} showToast={showToast} onSuccess={loadStatus} />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Security Card Component
// ══════════════════════════════════════════════════════════
const SecurityCard = ({ icon: Icon, iconBg, iconColor, title, description, statusOk, statusText, buttonText, onClick }) => (
  <div className="bg-[#111827]/60 border border-white/[0.06] rounded-2xl p-5 flex items-center justify-between gap-4 backdrop-blur-sm">
    <div className="flex items-center gap-4 min-w-0">
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon size={22} className={iconColor} />
      </div>
      <div className="min-w-0">
        <h3 className="font-semibold text-white text-sm">{title}</h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {statusOk ? (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle size={12} /> {statusText}
            </span>
          ) : (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <XCircle size={12} /> {statusText}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>
        )}
      </div>
    </div>
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-all flex-shrink-0"
    >
      {buttonText} <ChevronRight size={14} />
    </button>
  </div>
)

// ══════════════════════════════════════════════════════════
// Modal Wrapper (Account Center theme)
// ══════════════════════════════════════════════════════════
const ModalWrapper = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-[#0f1629] border border-white/[0.08] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
      <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
        <h2 className="font-bold text-base text-white">{title}</h2>
        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-400 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
)

// ══════════════════════════════════════════════════════════
// Shared Input Components
// ══════════════════════════════════════════════════════════
const PasswordInput = ({ label, value, onChange, show, toggle, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 outline-none transition-all pr-10"
        required
      />
      {toggle && (
        <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  </div>
)

const SubmitButton = ({ saving, text }) => (
  <button
    type="submit"
    disabled={saving}
    className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 rounded-xl font-semibold text-sm text-white transition-all shadow-lg shadow-violet-500/20"
  >
    {saving ? '处理中...' : text}
  </button>
)

// ══════════════════════════════════════════════════════════
// 6-digit PIN Input
// ══════════════════════════════════════════════════════════
const PinInput = ({ value, onChange, label }) => {
  const refs = Array.from({ length: 6 }, () => React.createRef())

  const handleChange = (index, char) => {
    if (char && !/^\d$/.test(char)) return
    const arr = (value || '').split('')
    arr[index] = char
    const newVal = arr.join('').slice(0, 6)
    onChange(newVal)
    if (char && index < 5) refs[index + 1].current?.focus()
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      refs[index - 1].current?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted)
    const focusIdx = Math.min(pasted.length, 5)
    refs[focusIdx].current?.focus()
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <div className="flex gap-2 justify-center">
        {Array.from({ length: 6 }).map((_, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            className="w-11 h-13 text-center text-xl font-bold bg-slate-800/60 border border-white/[0.08] rounded-xl text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 outline-none transition-all"
            autoComplete="off"
          />
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Modal 1: Change Login Password
// ══════════════════════════════════════════════════════════
const ChangePasswordModal = ({ onClose, showToast }) => {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.newPassword.length < 6) { showToast('新密码不能少于6位', 'error'); return }
    if (form.newPassword !== form.confirmPassword) { showToast('两次密码不一致', 'error'); return }

    setSaving(true)
    const res = await authFetch('/customer/password', {
      method: 'PUT',
      body: { current_password: form.oldPassword, new_password: form.newPassword },
    })
    setSaving(false)

    if (res.code === 200) {
      showToast('密码修改成功', 'success')
      onClose()
    } else {
      showToast(res.message || '修改失败', 'error')
    }
  }

  return (
    <ModalWrapper title="修改登录密码" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordInput label="当前密码" value={form.oldPassword} onChange={v => setForm(f => ({ ...f, oldPassword: v }))} show={show} toggle={() => setShow(!show)} />
        <PasswordInput label="新密码" value={form.newPassword} onChange={v => setForm(f => ({ ...f, newPassword: v }))} show={show} placeholder="至少6位" />
        <PasswordInput label="确认新密码" value={form.confirmPassword} onChange={v => setForm(f => ({ ...f, confirmPassword: v }))} show={show} />
        <SubmitButton saving={saving} text="确认修改" />
      </form>
    </ModalWrapper>
  )
}

// ══════════════════════════════════════════════════════════
// Modal 2: Set/Reset Payment Password (3-step flow)
// ══════════════════════════════════════════════════════════
const SetPaymentPasswordModal = ({ onClose, showToast, onSuccess }) => {
  const [step, setStep] = useState(1)
  const [loginPassword, setLoginPassword] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleVerifyLogin = async (e) => {
    e.preventDefault()
    if (!loginPassword) { setError('请输入登录密码'); return }
    setError('')
    setSaving(true)
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
    const res = await fetch(`${API_BASE}/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: userInfo.username || userInfo.email, password: loginPassword }),
    }).then(r => r.json()).catch(() => ({ code: 500 }))
    setSaving(false)

    if (res.code === 200) {
      setStep(2)
      setError('')
    } else {
      setError('登录密码错误')
    }
  }

  const handleSetPin = () => {
    if (pin.length !== 6) { setError('请输入完整的6位支付密码'); return }
    setError('')
    setStep(3)
    setConfirmPin('')
  }

  const handleConfirmPin = async () => {
    if (confirmPin !== pin) { setError('两次输入不一致，请重新输入'); setConfirmPin(''); return }
    setError('')
    setSaving(true)
    const res = await authFetch('/user/security/set-payment-password', {
      method: 'POST',
      body: { loginPassword, paymentPassword: pin },
    })
    setSaving(false)

    if (res.code === 200) {
      showToast('支付密码设置成功', 'success')
      onSuccess()
      onClose()
    } else {
      setError(res.message || '设置失败')
    }
  }

  const stepLabels = ['验证身份', '设置密码', '确认密码']

  return (
    <ModalWrapper title="设置支付密码" onClose={onClose}>
      <div className="space-y-5">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= s ? 'bg-violet-600 text-white' : 'bg-slate-700/50 text-slate-500'
              }`}>{s}</div>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-violet-600' : 'bg-slate-700/50'}`} />}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400">{stepLabels[step - 1]}</p>

        {/* Step 1: Verify identity */}
        {step === 1 && (
          <form onSubmit={handleVerifyLogin} className="space-y-4">
            <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300">
              请输入登录密码以验证身份
            </div>
            <PasswordInput label="登录密码" value={loginPassword} onChange={setLoginPassword} show={show} toggle={() => setShow(!show)} />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <SubmitButton saving={saving} text="验证身份" />
          </form>
        )}

        {/* Step 2: Enter 6-digit PIN */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="bg-violet-500/[0.06] border border-violet-500/20 rounded-xl p-3 text-xs text-violet-300 text-center">
              请设置 6 位数字支付密码
            </div>
            <PinInput value={pin} onChange={setPin} label="支付密码" />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              onClick={handleSetPin}
              disabled={pin.length !== 6}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-30 rounded-xl font-semibold text-sm text-white transition-all"
            >
              下一步
            </button>
          </div>
        )}

        {/* Step 3: Confirm PIN */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-300 text-center">
              请再次输入支付密码以确认
            </div>
            <PinInput value={confirmPin} onChange={setConfirmPin} label="确认支付密码" />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              onClick={handleConfirmPin}
              disabled={saving || confirmPin.length !== 6}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-30 rounded-xl font-semibold text-sm text-white transition-all"
            >
              {saving ? '设置中...' : '确认设置'}
            </button>
          </div>
        )}
      </div>
    </ModalWrapper>
  )
}

// ══════════════════════════════════════════════════════════
// Modal 3: Set/Change Security Question
// ══════════════════════════════════════════════════════════
const SetSecurityQuestionModal = ({ onClose, showToast, onSuccess }) => {
  const [form, setForm] = useState({
    loginPassword: '',
    question: SECURITY_QUESTIONS[0],
    customQuestion: '',
    answer: '',
  })
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [useCustom, setUseCustom] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const question = useCustom ? form.customQuestion.trim() : form.question
    if (!question) { showToast('请选择或输入密保问题', 'error'); return }
    if (!form.answer.trim()) { showToast('请输入密保答案', 'error'); return }

    setSaving(true)
    const res = await authFetch('/user/security/set-security-question', {
      method: 'POST',
      body: { loginPassword: form.loginPassword, securityQuestion: question, securityAnswer: form.answer.trim() },
    })
    setSaving(false)

    if (res.code === 200) {
      showToast('密保问题设置成功', 'success')
      onSuccess()
      onClose()
    } else {
      showToast(res.message || '设置失败', 'error')
    }
  }

  return (
    <ModalWrapper title="设置密保问题" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-500/[0.06] border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
          设置密保问题后，可以通过回答密保来找回登录密码
        </div>

        <PasswordInput
          label="登录密码（验证身份）"
          value={form.loginPassword}
          onChange={v => setForm(f => ({ ...f, loginPassword: v }))}
          show={show}
          toggle={() => setShow(!show)}
        />

        {/* Question selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">密保问题</label>
          {!useCustom ? (
            <div className="space-y-2">
              <select
                value={form.question}
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl text-white focus:border-violet-500/50 outline-none transition-all appearance-none"
              >
                {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              <button type="button" onClick={() => setUseCustom(true)} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                自定义问题
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={form.customQuestion}
                onChange={e => setForm(f => ({ ...f, customQuestion: e.target.value }))}
                placeholder="输入自定义问题"
                className="w-full px-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:border-violet-500/50 outline-none transition-all"
                required
              />
              <button type="button" onClick={() => setUseCustom(false)} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                选择预设问题
              </button>
            </div>
          )}
        </div>

        {/* Answer */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">密保答案</label>
          <input
            type="text"
            value={form.answer}
            onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
            placeholder="请输入答案"
            className="w-full px-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:border-violet-500/50 outline-none transition-all"
            required
          />
          <p className="text-xs text-slate-500 mt-1.5">答案不区分大小写</p>
        </div>

        <SubmitButton saving={saving} text="确认设置" />
      </form>
    </ModalWrapper>
  )
}

export default AccountSecurity
