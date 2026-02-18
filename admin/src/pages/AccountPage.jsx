import React, { useState, useEffect } from 'react'
import { User, Lock, Save, Eye, EyeOff, Shield } from 'lucide-react'
import { adminRequest } from '../utils/api'

const AccountPage = () => {
  const [account, setAccount] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  
  // 账号信息表单
  const [profileForm, setProfileForm] = useState({ username: '', email: '', current_password: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  
  // 密码修改表单
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [savingPassword, setSavingPassword] = useState(false)
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })

  useEffect(() => { loadAccount() }, [])

  const loadAccount = async () => {
    setLoading(true)
    const res = await adminRequest('/admin/account')
    if (res.code === 200) {
      setAccount(res.data || {})
      setProfileForm({ username: res.data?.username || '', email: res.data?.email || '', current_password: '' })
    }
    setLoading(false)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!profileForm.current_password) { alert('请输入当前密码以确认修改'); return }
    
    setSavingProfile(true)
    const res = await adminRequest('/admin/account', { method: 'PUT', body: JSON.stringify(profileForm) })
    setSavingProfile(false)
    
    if (res.code === 200) {
      alert('账号信息更新成功')
      setProfileForm({ ...profileForm, current_password: '' })
      loadAccount()
    } else {
      alert(res.message || '更新失败')
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      alert('请填写所有密码字段'); return
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      alert('两次输入的新密码不一致'); return
    }
    if (passwordForm.new_password.length < 6) {
      alert('新密码长度不能少于6位'); return
    }
    
    setSavingPassword(true)
    const res = await adminRequest('/admin/password', { method: 'PUT', body: JSON.stringify(passwordForm) })
    setSavingPassword(false)
    
    if (res.code === 200) {
      alert('密码修改成功')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
    } else {
      alert(res.message || '修改失败')
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-400">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">账号管理</h1>

      {/* 标签页 */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        <button onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
          <User size={16} /> 账号信息
        </button>
        <button onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeTab === 'password' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
          <Lock size={16} /> 修改密码
        </button>
      </div>

      {/* 账号信息 */}
      {activeTab === 'profile' && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 max-w-md">
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-700">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
              <Shield size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{account.username}</h2>
              <p className="text-sm text-slate-400">管理员账号</p>
            </div>
          </div>
          
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">用户名</label>
              <input type="text" value={profileForm.username} onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">邮箱</label>
              <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">当前密码 <span className="text-red-400">*</span></label>
              <input type="password" value={profileForm.current_password} onChange={(e) => setProfileForm({ ...profileForm, current_password: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg" placeholder="输入当前密码以确认修改" />
            </div>
            <button type="submit" disabled={savingProfile} className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              <Save size={16} /> {savingProfile ? '保存中...' : '保存修改'}
            </button>
          </form>
        </div>
      )}

      {/* 修改密码 */}
      {activeTab === 'password' && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 max-w-md">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">当前密码</label>
              <div className="relative">
                <input type={showPasswords.current ? 'text' : 'password'} value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg pr-10" />
                <button type="button" onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">新密码</label>
              <div className="relative">
                <input type={showPasswords.new ? 'text' : 'password'} value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg pr-10" placeholder="至少6位" />
                <button type="button" onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">确认新密码</label>
              <div className="relative">
                <input type={showPasswords.confirm ? 'text' : 'password'} value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg pr-10" />
                <button type="button" onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={savingPassword} className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              <Lock size={16} /> {savingPassword ? '修改中...' : '修改密码'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default AccountPage
