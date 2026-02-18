import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate, Link } from 'react-router-dom'
import { User, Shield, GraduationCap, ArrowLeft, Menu, X, Settings, LogOut } from 'lucide-react'
import { authFetch } from '../../utils/api'

import ProfileSettings from './ProfileSettings'
import AccountSecurity from './AccountSecurity'
import AccountVerify from './AccountVerify'

const navItems = [
  { path: '/account/profile', label: '个人资料', icon: User, end: false },
  { path: '/account/security', label: '安全设置', icon: Shield },
  { path: '/account/verify', label: '身份认证', icon: GraduationCap },
]

const AccountLayout = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const savedUser = localStorage.getItem('user_info')
    if (!savedUser) {
      navigate('/')
      return
    }
    try {
      setUser(JSON.parse(savedUser))
    } catch {
      localStorage.removeItem('user_info')
      navigate('/')
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('user_info')
    localStorage.removeItem('user_token')
    navigate('/')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#0c0f1a] border-r border-white/[0.06] fixed inset-y-0 left-0 z-30">
        {/* Logo / Header */}
        <div className="p-5 border-b border-white/[0.06]">
          <Link to="/account/profile" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Settings size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white">账号设置</h1>
              <p className="text-xs text-slate-500">{user.username}</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-violet-600/15 text-violet-400 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-white/[0.06] space-y-0.5">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
          >
            <ArrowLeft size={18} />
            返回商城
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-400/80 hover:text-red-300 hover:bg-red-500/[0.06] transition-all"
          >
            <LogOut size={18} />
            退出登录
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-[#0c0f1a] border-r border-white/[0.06] flex flex-col">
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Settings size={18} />
                </div>
                <span className="font-bold text-sm">账号设置</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive ? 'bg-violet-600/15 text-violet-400' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="p-3 border-t border-white/[0.06]">
              <Link to="/" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.04]">
                <ArrowLeft size={18} />
                返回商城
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-60">
        {/* Top bar - Mobile */}
        <header className="lg:hidden bg-[#0c0f1a]/80 border-b border-white/[0.06] px-4 py-3 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white">
            <Menu size={22} />
          </button>
          <span className="font-semibold text-sm">账号设置</span>
          <Link to="/" className="text-slate-400 hover:text-white text-xs">商城</Link>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8 max-w-4xl">
          <Routes>
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="security" element={<AccountSecurity />} />
            <Route path="verify" element={<AccountVerify />} />
            <Route index element={<ProfileSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default AccountLayout
