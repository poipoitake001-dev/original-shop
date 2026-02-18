import React, { useState, useEffect } from 'react'
import { Zap, Shield, Award } from 'lucide-react'
import { API_BASE } from '../utils/api'

// 默认图标（当徽章没有自定义图标时使用）
const defaultIcons = [
  <Zap size={28} />,
  <Shield size={28} />,
  <Award size={28} />,
]

const CoreFeatures = () => {
  const [features, setFeatures] = useState([])

  useEffect(() => {
    // 从 site_settings 读取核心优势徽章配置
    fetch(`${API_BASE}/settings/public`)
      .then(r => r.json())
      .then(res => {
        if (res.code === 200 && res.data) {
          const data = res.data
          const featuresList = []
          
          // 读取三个核心优势配置
          for (let i = 1; i <= 3; i++) {
            const title = data[`feature_${i}_title`]
            const desc = data[`feature_${i}_desc`]
            const icon = data[`feature_${i}_icon`]
            
            // 只有标题存在才添加
            if (title) {
              featuresList.push({
                id: i,
                title: title,
                description: desc || '',
                icon_url: icon || null
              })
            }
          }
          
          // 如果没有配置，使用默认值
          if (featuresList.length === 0) {
            featuresList.push(
              { id: 1, title: '本平台仅在线支付', description: '仅通过二手品或虚拟卡，不支持任何线下转账交易', icon_url: null },
              { id: 2, title: '诚信交易，真假自辨', description: '中途达成交易，提供完整的聊天记录，不干涉个人交易自由', icon_url: null },
              { id: 3, title: '触达校园与新专台', description: '不干涉校园生活与学习，非营业性质的校园广告平台', icon_url: null }
            )
          }
          
          setFeatures(featuresList)
        }
      })
      .catch(() => {
        // 出错时使用默认值
        setFeatures([
          { id: 1, title: '本平台仅在线支付', description: '仅通过二手品或虚拟卡，不支持任何线下转账交易', icon_url: null },
          { id: 2, title: '诚信交易，真假自辨', description: '中途达成交易，提供完整的聊天记录，不干涉个人交易自由', icon_url: null },
          { id: 3, title: '触达校园与新专台', description: '不干涉校园生活与学习，非营业性质的校园广告平台', icon_url: null }
        ])
      })
  }, [])

  if (features.length === 0) return null

  return (
    <section className="w-full max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((feature, index) => (
          <div
            key={feature.id}
            className="group relative bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-500/30"
          >
            {/* 背景光晕 */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* 图标 */}
            <div className="relative flex justify-center mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shadow-lg shadow-purple-500/10 group-hover:shadow-purple-500/30 transition-shadow duration-300">
                {feature.icon_url ? (
                  <img
                    src={feature.icon_url}
                    alt={feature.title}
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
              <h3 className="text-white font-bold text-sm mb-1">{feature.title}</h3>
              {feature.description && (
                <p className="text-gray-400 text-xs leading-relaxed">{feature.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default CoreFeatures
