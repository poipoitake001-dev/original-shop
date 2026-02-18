import React from 'react'
import { X, Link2, Image, Share2 } from 'lucide-react'

/**
 * ShareOptionsModal — Two-choice share dialog
 *
 * Props:
 *  - isOpen          {boolean}
 *  - onClose         {fn}
 *  - onCopyLink      {fn}  Triggered when user picks "Copy Link"
 *  - onGeneratePoster {fn} Triggered when user picks "Generate Poster"
 */
const ShareOptionsModal = ({ isOpen, onClose, onCopyLink, onGeneratePoster }) => {
  if (!isOpen) return null

  const handleCopy = () => {
    onCopyLink?.()
    onClose()
  }

  const handlePoster = () => {
    onGeneratePoster?.()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[55] p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0f1629] border border-white/[0.08] rounded-2xl w-full max-w-xs shadow-2xl shadow-black/40 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Share2 size={15} className="text-violet-400" />
            分享商品
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Options grid */}
        <div className="px-4 pb-5 grid grid-cols-2 gap-3">
          {/* Card 1: Copy Link */}
          <button
            onClick={handleCopy}
            className="group flex flex-col items-center gap-3 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 active:scale-[0.97]"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-700/50 group-hover:bg-slate-600/50 flex items-center justify-center transition-colors">
              <Link2 size={22} className="text-slate-300 group-hover:text-white transition-colors" />
            </div>
            <span className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">
              复制链接
            </span>
          </button>

          {/* Card 2: Generate Poster */}
          <button
            onClick={handlePoster}
            className="group flex flex-col items-center gap-3 p-5 rounded-xl border border-violet-500/10 bg-violet-500/[0.03] hover:bg-violet-500/[0.08] hover:border-violet-500/20 transition-all duration-200 active:scale-[0.97]"
          >
            <div className="w-12 h-12 rounded-2xl bg-violet-600/20 group-hover:bg-violet-600/30 flex items-center justify-center transition-colors">
              <Image size={22} className="text-violet-400 group-hover:text-violet-300 transition-colors" />
            </div>
            <span className="text-xs font-medium text-slate-400 group-hover:text-violet-300 transition-colors">
              生成海报
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ShareOptionsModal
