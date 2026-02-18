import React, { useEffect } from 'react'
import { CheckCircle, XCircle, Info } from 'lucide-react'

const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const styles = {
    success: 'bg-green-500/20 border-green-500 text-green-400',
    error: 'bg-red-500/20 border-red-500 text-red-400',
    info: 'bg-blue-500/20 border-blue-500 text-blue-400'
  }

  const icons = {
    success: <CheckCircle size={18} />,
    error: <XCircle size={18} />,
    info: <Info size={18} />
  }

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl border ${styles[type]} z-[9999] animate-slide-up shadow-lg backdrop-blur-sm`}>
      <div className="flex items-center gap-2">
        {icons[type]}
        <span className="font-medium">{message}</span>
      </div>
    </div>
  )
}

export default Toast
