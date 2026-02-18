import React, { useState, useEffect } from 'react'
import { Shield, Lock, Key, HelpCircle, CheckCircle, XCircle, Eye, EyeOff, ChevronRight } from 'lucide-react'
import { authFetch, API_BASE } from '../../utils/api'

const SECURITY_QUESTIONS = [
  '你的宠物叫什么名字？',
  '你的小学叫什么？',
  '你最喜欢的电影是什么？',
  '你母亲的姓氏是什么？',
  '你在哪个城市出生？',
  '你最好朋友的名字是什么？',
]

const SecurityCenter = () => {
  const [status, setStatus] = useState({ hasPaymentPassword: false, hasSecurityQuestion: false, securityQuestion: null })
  const [loading, setLoading] = useState(true)
  const [activeModal, setActiveModal] = useState(null) // 'changePassword' | 'setPaymentPwd' | 'setSecurityQ'
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
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-indigo-600'
        }`}>{toast.msg}</div>
      )}

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
          <Shield size={22} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">安全中心</h1>
          <p className="text-sm text-gray-400">管理您的密码和安全设置</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Card 1: 登录密码 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Lock size={22} className="text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold">登录密码</h3>
              <p className="text-sm text-gray-400">用于登录账户的密码</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('changePassword')}
            className="flex items-center gap-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            修改 <ChevronRight size={16} />
          </button>
        </div>

        {/* Card 2: 支付密码 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${status.hasPaymentPassword ? 'bg-emerald-500/10' : 'bg-red-500/10'} rounded-xl flex items-center justify-center`}>
              <Key size={22} className={status.hasPaymentPassword ? 'text-emerald-400' : 'text-red-400'} />
            </div>
            <div>
              <h3 className="font-semibold">支付密码</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {status.hasPaymentPassword ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle size={12} /> 已设置</span>
                ) : (
                  <span className="text-xs text-red-400 flex items-center gap-1"><XCircle size={12} /> 未设置</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('setPaymentPwd')}
            className="flex items-center gap-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            {status.hasPaymentPassword ? '重置' : '设置'} <ChevronRight size={16} />
          </button>
        </div>

        {/* Card 3: 密保问题 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${status.hasSecurityQuestion ? 'bg-emerald-500/10' : 'bg-yellow-500/10'} rounded-xl flex items-center justify-center`}>
              <HelpCircle size={22} className={status.hasSecurityQuestion ? 'text-emerald-400' : 'text-yellow-400'} />
            </div>
            <div>
              <h3 className="font-semibold">密保问题</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {status.hasSecurityQuestion ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle size={12} /> 已设置</span>
                ) : (
                  <span className="text-xs text-yellow-400 flex items-center gap-1"><XCircle size={12} /> 未设置（建议设置，用于找回密码）</span>
                )}
              </div>
              {status.hasSecurityQuestion && status.securityQuestion && (
                <p className="text-xs text-gray-500 mt-1">当前问题：{status.securityQuestion}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setActiveModal('setSecurityQ')}
            className="flex items-center gap-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            {status.hasSecurityQuestion ? '修改' : '设置'} <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 提示 */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 text-sm text-indigo-300">
        <p className="font-medium mb-1">安全建议</p>
        <ul className="text-xs text-indigo-300/70 space-y-1 list-disc list-inside">
          <li>请设置与登录密码不同的支付密码</li>
          <li>设置密保问题后，可通过密保找回登录密码</li>
          <li>请勿将密码告知他人</li>
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

// ========== 修改登录密码 ==========
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
      body: { current_password: form.oldPassword, new_password: form.newPassword }
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
        <PasswordInput label="当前密码" value={form.oldPassword} onChange={v => setForm(f => ({...f, oldPassword: v}))} show={show} toggle={() => setShow(!show)} />
        <PasswordInput label="新密码" value={form.newPassword} onChange={v => setForm(f => ({...f, newPassword: v}))} show={show} placeholder="至少6位" />
        <PasswordInput label="确认新密码" value={form.confirmPassword} onChange={v => setForm(f => ({...f, confirmPassword: v}))} show={show} />
        <SubmitButton saving={saving} text="确认修改" />
      </form>
    </ModalWrapper>
  )
}

// ========== 6位 PIN 码输入组件 ==========
const PinInput = ({ value, onChange, label }) => {
  const refs = Array.from({ length: 6 }, () => React.createRef())

  const handleChange = (index, char) => {
    if (char && !/^\d$/.test(char)) return // 只接受数字
    const arr = (value || '').split('')
    arr[index] = char
    const newVal = arr.join('').slice(0, 6)
    onChange(newVal)
    // 自动跳到下一格
    if (char && index < 5) {
      refs[index + 1].current?.focus()
    }
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
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
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
            className="w-11 h-13 text-center text-xl font-bold bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
            autoComplete="off"
          />
        ))}
      </div>
    </div>
  )
}

// ========== 设置支付密码 ==========
const SetPaymentPasswordModal = ({ onClose, showToast, onSuccess }) => {
  const [step, setStep] = useState(1) // 1=验证登录密码 2=输入PIN 3=确认PIN
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
    // 简单验证：尝试用当前密码登录
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
    const res = await fetch(`${API_BASE}/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: userInfo.username || userInfo.email, password: loginPassword })
    }).then(r => r.json()).catch(() => ({ code: 500 }))
    setSaving(false)

    if (res.code === 200) {
      setStep(2)
      setError('')
    } else {
      setError('登录密码错误')
    }
  }

  const handleSetPin = async () => {
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
      body: { loginPassword, paymentPassword: pin }
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

  return (
    <ModalWrapper title="设置支付密码" onClose={onClose}>
      <div className="space-y-4">
        {/* 步骤指示 */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'
              }`}>{s}</div>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-indigo-600' : 'bg-gray-700'}`} />}
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-400">
          {step === 1 ? '验证身份' : step === 2 ? '设置支付密码' : '确认支付密码'}
        </p>

        {/* Step 1: 验证登录密码 */}
        {step === 1 && (
          <form onSubmit={handleVerifyLogin} className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-300">
              请输入登录密码以验证身份
            </div>
            <PasswordInput label="登录密码" value={loginPassword} onChange={setLoginPassword} show={show} toggle={() => setShow(!show)} />
            {error && <div className="text-red-400 text-sm text-center">{error}</div>}
            <SubmitButton saving={saving} text="验证身份" />
          </form>
        )}

        {/* Step 2: 输入6位PIN */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 text-xs text-indigo-300 text-center">
              请设置 6 位数字支付密码
            </div>
            <PinInput value={pin} onChange={setPin} label="支付密码" />
            {error && <div className="text-red-400 text-sm text-center">{error}</div>}
            <button
              onClick={handleSetPin}
              disabled={pin.length !== 6}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 rounded-lg font-medium transition-colors"
            >
              下一步
            </button>
          </div>
        )}

        {/* Step 3: 确认PIN */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-300 text-center">
              请再次输入支付密码以确认
            </div>
            <PinInput value={confirmPin} onChange={setConfirmPin} label="确认支付密码" />
            {error && <div className="text-red-400 text-sm text-center">{error}</div>}
            <button
              onClick={handleConfirmPin}
              disabled={saving || confirmPin.length !== 6}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 rounded-lg font-medium transition-colors"
            >
              {saving ? '设置中...' : '确认设置'}
            </button>
          </div>
        )}
      </div>
    </ModalWrapper>
  )
}

// ========== 设置密保问题 ==========
const SetSecurityQuestionModal = ({ onClose, showToast, onSuccess }) => {
  const [form, setForm] = useState({ loginPassword: '', question: SECURITY_QUESTIONS[0], customQuestion: '', answer: '' })
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
      body: { loginPassword: form.loginPassword, securityQuestion: question, securityAnswer: form.answer.trim() }
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
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-300">
          设置密保问题后，可以通过回答密保来找回登录密码
        </div>
        <PasswordInput label="登录密码（验证身份）" value={form.loginPassword} onChange={v => setForm(f => ({...f, loginPassword: v}))} show={show} toggle={() => setShow(!show)} />
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">密保问题</label>
          {!useCustom ? (
            <div className="space-y-2">
              <select
                value={form.question}
                onChange={e => setForm(f => ({...f, question: e.target.value}))}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none"
              >
                {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              <button type="button" onClick={() => setUseCustom(true)} className="text-xs text-indigo-400 hover:text-indigo-300">
                自定义问题
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={form.customQuestion}
                onChange={e => setForm(f => ({...f, customQuestion: e.target.value}))}
                placeholder="输入自定义问题"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none"
                required
              />
              <button type="button" onClick={() => setUseCustom(false)} className="text-xs text-indigo-400 hover:text-indigo-300">
                选择预设问题
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">密保答案</label>
          <input
            type="text"
            value={form.answer}
            onChange={e => setForm(f => ({...f, answer: e.target.value}))}
            placeholder="请输入答案"
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none"
            required
          />
          <p className="text-xs text-gray-500 mt-1">答案不区分大小写</p>
        </div>

        <SubmitButton saving={saving} text="确认设置" />
      </form>
    </ModalWrapper>
  )
}

// ========== 共享组件 ==========
const ModalWrapper = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/70" onClick={onClose} />
    <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
      <div className="p-5 border-b border-gray-800 flex items-center justify-between">
        <h2 className="font-bold text-lg">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircle size={20} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
)

const PasswordInput = ({ label, value, onChange, show, toggle, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none pr-10"
        required
      />
      {toggle && (
        <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  </div>
)

const SubmitButton = ({ saving, text }) => (
  <button type="submit" disabled={saving} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg font-medium transition-colors">
    {saving ? '处理中...' : text}
  </button>
)

export default SecurityCenter
