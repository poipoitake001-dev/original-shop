import React, { useState } from 'react'
import { X, User, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ArrowLeft, HelpCircle, KeyRound, CheckCircle } from 'lucide-react'
import { API_BASE } from '../utils/api'

const AuthModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  // 忘记密码流程状态
  const [forgotStep, setForgotStep] = useState(1) // 1=输入账号 2=回答密保 3=设置新密码 4=完成
  const [forgotAccount, setForgotAccount] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          setError('两次输入的密码不一致')
          setLoading(false)
          return
        }
        
        const res = await fetch(`${API_BASE}/customer/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password
          })
        })
        const data = await res.json()
        
        if (data.code === 200) {
          localStorage.setItem('user_token', data.data.token)
          localStorage.setItem('user_info', JSON.stringify(data.data.user))
          onLoginSuccess(data.data.user)
          onClose()
          resetForm()
        } else {
          setError(data.message || '注册失败')
        }
      } else {
        const res = await fetch(`${API_BASE}/customer/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account: formData.email || formData.username,
            password: formData.password
          })
        })
        const data = await res.json()
        
        if (data.code === 200) {
          localStorage.setItem('user_token', data.data.token)
          localStorage.setItem('user_info', JSON.stringify(data.data.user))
          onLoginSuccess(data.data.user)
          onClose()
          resetForm()
        } else {
          setError(data.message || '登录失败')
        }
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ username: '', email: '', password: '', confirmPassword: '' })
    setError('')
    setShowPassword(false)
    setForgotStep(1)
    setForgotAccount('')
    setSecurityQuestion('')
    setSecurityAnswer('')
    setResetToken('')
    setNewPassword('')
    setConfirmNewPassword('')
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    resetForm()
  }

  // ========== 忘记密码流程 ==========
  const handleForgotStep1 = async (e) => {
    e.preventDefault()
    if (!forgotAccount.trim()) { setError('请输入用户名或邮箱'); return }
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/user/security/security-question?account=${encodeURIComponent(forgotAccount)}`)
      const data = await res.json()
      setLoading(false)

      if (data.code === 200 && data.data?.securityQuestion) {
        setSecurityQuestion(data.data.securityQuestion)
        setForgotStep(2)
      } else {
        setError('该账号未设置密保问题，请联系客服重置密码')
      }
    } catch {
      setLoading(false)
      setError('网络错误')
    }
  }

  const handleForgotStep2 = async (e) => {
    e.preventDefault()
    if (!securityAnswer.trim()) { setError('请输入密保答案'); return }
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/user/security/verify-security-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: forgotAccount, securityAnswer: securityAnswer })
      })
      const data = await res.json()
      setLoading(false)

      if (data.code === 200 && data.data?.resetToken) {
        setResetToken(data.data.resetToken)
        setForgotStep(3)
      } else {
        setError(data.message || '密保答案错误')
      }
    } catch {
      setLoading(false)
      setError('网络错误')
    }
  }

  const handleForgotStep3 = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) { setError('密码不能少于6位'); return }
    if (newPassword !== confirmNewPassword) { setError('两次密码不一致'); return }
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/user/security/reset-password-via-security`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword })
      })
      const data = await res.json()
      setLoading(false)

      if (data.code === 200) {
        setForgotStep(4)
      } else {
        setError(data.message || '重置失败')
      }
    } catch {
      setLoading(false)
      setError('网络错误')
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in relative">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-700 rounded-lg transition-colors z-10"
        >
          <X size={20} className="text-slate-400" />
        </button>

        {/* 忘记密码模式 */}
        {mode === 'forgot' ? (
          <div className="p-6">
            <button onClick={() => switchMode('login')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-4">
              <ArrowLeft size={16} /> 返回登录
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <KeyRound size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-bold">找回密码</h2>
            </div>

            {/* Step 1: 输入账号 */}
            {forgotStep === 1 && (
              <form onSubmit={handleForgotStep1} className="space-y-4">
                <p className="text-sm text-slate-400 text-center">请输入您的用户名或邮箱</p>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={forgotAccount}
                    onChange={e => { setForgotAccount(e.target.value); setError('') }}
                    placeholder="用户名或邮箱"
                    className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl focus:border-primary outline-none"
                    required
                  />
                </div>
                {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>}
                <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-primary to-purple-500 rounded-xl font-medium disabled:opacity-50">
                  {loading ? '查询中...' : '下一步'}
                </button>
              </form>
            )}

            {/* Step 2: 回答密保 */}
            {forgotStep === 2 && (
              <form onSubmit={handleForgotStep2} className="space-y-4">
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 text-center">
                  <HelpCircle size={20} className="text-indigo-400 mx-auto mb-2" />
                  <p className="text-sm text-indigo-300">{securityQuestion}</p>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={securityAnswer}
                    onChange={e => { setSecurityAnswer(e.target.value); setError('') }}
                    placeholder="请输入您的密保答案"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl focus:border-primary outline-none"
                    required
                  />
                </div>
                {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>}
                <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-primary to-purple-500 rounded-xl font-medium disabled:opacity-50">
                  {loading ? '验证中...' : '验证答案'}
                </button>
              </form>
            )}

            {/* Step 3: 设置新密码 */}
            {forgotStep === 3 && (
              <form onSubmit={handleForgotStep3} className="space-y-4">
                <p className="text-sm text-emerald-400 text-center">密保验证通过，请设置新密码</p>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setError('') }}
                    placeholder="新密码（至少6位）"
                    className="w-full pl-10 pr-12 py-3 bg-slate-700/50 border border-slate-600 rounded-xl focus:border-primary outline-none"
                    required minLength={6}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={e => { setConfirmNewPassword(e.target.value); setError('') }}
                    placeholder="确认新密码"
                    className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl focus:border-primary outline-none"
                    required
                  />
                </div>
                {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>}
                <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-primary to-purple-500 rounded-xl font-medium disabled:opacity-50">
                  {loading ? '重置中...' : '确认重置'}
                </button>
              </form>
            )}

            {/* Step 4: 完成 */}
            {forgotStep === 4 && (
              <div className="text-center py-4">
                <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">密码重置成功</h3>
                <p className="text-sm text-slate-400 mb-6">请使用新密码登录</p>
                <button onClick={() => switchMode('login')} className="w-full py-3 bg-gradient-to-r from-primary to-purple-500 rounded-xl font-medium">
                  返回登录
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 登录/注册 Tab */}
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => switchMode('login')}
                className={`flex-1 py-4 text-center font-medium transition-colors ${
                  mode === 'login' ? 'text-white bg-slate-700/50 border-b-2 border-primary' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn size={18} className="inline mr-2" />
                登录
              </button>
              <button
                onClick={() => switchMode('register')}
                className={`flex-1 py-4 text-center font-medium transition-colors ${
                  mode === 'register' ? 'text-white bg-slate-700/50 border-b-2 border-primary' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus size={18} className="inline mr-2" />
                注册
              </button>
            </div>

            {/* 表单内容 */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User size={32} className="text-white" />
                </div>
                <h2 className="text-xl font-bold">
                  {mode === 'login' ? '欢迎回来' : '创建账户'}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {mode === 'login' ? '登录后可查看订单记录' : '注册后享受更多服务'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text" name="username" value={formData.username} onChange={handleInputChange}
                      placeholder="用户名（2-20个字符）"
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      required minLength={2} maxLength={20}
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={mode === 'register' ? 'email' : 'text'} name="email" value={formData.email} onChange={handleInputChange}
                    placeholder={mode === 'register' ? '邮箱地址' : '用户名或邮箱'}
                    className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange}
                    placeholder={mode === 'register' ? '密码（至少6位）' : '密码'}
                    className="w-full pl-10 pr-12 py-3 bg-slate-700/50 border border-slate-600 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    required minLength={mode === 'register' ? 6 : 1}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {mode === 'register' && (
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange}
                      placeholder="确认密码"
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      required
                    />
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>
                )}

                <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                      {mode === 'login' ? '登录' : '注册'}
                    </>
                  )}
                </button>

                {/* 忘记密码链接 */}
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="w-full text-center text-sm text-slate-400 hover:text-indigo-400 transition-colors py-1"
                  >
                    忘记密码？
                  </button>
                )}
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AuthModal
