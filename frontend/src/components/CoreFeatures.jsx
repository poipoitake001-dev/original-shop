import React, { useState, useEffect } from 'react'
import { Zap, Shield, Award } from 'lucide-react'

// 默认图标（当徽章没有自定义图标时使用）
const defaultIcons = [
  <Zap size={28} />,
  <Shield size={28} />,
  <Award size={28} />,
]

const CoreFeatures = () => {
  const [badges, setBadges] = useState([])

  useEffect(() => {
    fetch('/api/settings/trust-badges')
      .then(r => r.json())
      .then(res => {
        if (res.code === 200 && res.data?.length > 0) {
          setBadges(res.data)
        }
      })
      .catch(() => {})
  }, [])

  if (badges.length === 0) return null

  return (
    <section className="w-full max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {badges.map((badge, index) => (
          <div
            key={badge.id}
            className="group relative bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-500/30"
          >
            {/* 背景光晕 */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* 图标 */}
            <div className="relative flex justify-center mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shadow-lg shadow-purple-500/10 group-hover:shadow-purple-500/30 transition-shadow duration-300">
                {badge.icon_url ? (
                  <img
                    src={badge.icon_url}
                    alt={badge.title}
                    className="w-8 h-8 object-contain drop-shadow-lg"
                  />
                ) : (
                  <span className="text-indigo-400 drop-shadow-lg">
                    {defaultIcons[index % defaultIcons.length]}
                  </span>
                )}
              </div>
            </div>

            {/* 文字 */}
            <div className="relative">
              <h3 className="text-white font-bold text-sm mb-1">{badge.title}</h3>
              {badge.description && (
                <p className="text-gray-400 text-xs leading-relaxed">{badge.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default CoreFeatures
