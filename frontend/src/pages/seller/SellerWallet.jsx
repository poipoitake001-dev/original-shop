import React, { useState, useEffect, useCallback } from 'react'
import { Wallet, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle, Send, DollarSign, TrendingUp, Eye, EyeOff, AlertTriangle, Shield } from 'lucide-react'
import { authFetch } from '../../utils/api'

const txTypeMap = {
  sale: { text: '销售收入', icon: TrendingUp, cls: 'text-emerald-400' },
  commission: { text: '平台佣金', icon: DollarSign, cls: 'text-yellow-400' },
  withdrawal: { text: '提现', icon: ArrowUpCircle, cls: 'text-blue-400' },
  refund: { text: '退款', icon: ArrowDownCircle, cls: 'text-red-400' },
  adjustment: { text: '调整', icon: DollarSign, cls: 'text-purple-400' },
}

const wrStatusMap = {
  pending: { text: '待处理', cls: 'bg-yellow-500/10 text-yellow-400' },
  processing: { text: '处理中', cls: 'bg-blue-500/10 text-blue-400' },
  completed: { text: '已完成', cls: 'bg-emerald-500/10 text-emerald-400' },
  rejected: { text: '已拒绝', cls: 'bg-red-500/10 text-red-400' },
}

const SellerWallet = () => {
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWithdrawForm, setShowWithdrawForm] = useState(false)
  const [activeTab, setActiveTab] = useState('transactions') // transactions | withdrawals
  const [toast, setToast] = useState(null)

  const loadData = useCallback(async () => {
    const [walletRes, txRes, wrRes] = await Promise.all([
      authFetch('/seller/wallet'),
      authFetch('/seller/wallet/transactions?limit=30'),
      authFetch('/seller/wallet/withdrawals'),
    ])
    if (walletRes.code === 200) setWallet(walletRes.data)
    if (txRes.code === 200) setTransactions(txRes.data.list || [])
    if (wrRes.code === 200) setWithdrawals(wrRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-indigo-600'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">钱包</h1>
        <button
          onClick={() => setShowWithdrawForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Send size={16} />
          申请提现
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-xl p-5">
          <p className="text-xs text-indigo-300 mb-1">可用余额</p>
          <p className="text-2xl font-bold">¥{parseFloat(wallet?.balance || 0).toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 mb-1">冻结金额</p>
          <p className="text-2xl font-bold text-yellow-400">¥{parseFloat(wallet?.frozen_balance || 0).toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 mb-1">累计收入</p>
          <p className="text-2xl font-bold text-emerald-400">¥{parseFloat(wallet?.total_earned || 0).toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 mb-1">累计提现</p>
          <p className="text-2xl font-bold text-blue-400">¥{parseFloat(wallet?.total_withdrawn || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'transactions' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          交易流水
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'withdrawals' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          提现记录
        </button>
      </div>

      {/* Transactions */}
      {activeTab === 'transactions' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">暂无交易记录</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {transactions.map(tx => {
                const info = txTypeMap[tx.type] || txTypeMap.adjustment
                const isPositive = parseFloat(tx.amount) > 0
                return (
                  <div key={tx.id} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gray-800 ${info.cls}`}>
                      <info.icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{info.text}</p>
                      <p className="text-xs text-gray-500 truncate">{tx.description || '-'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{parseFloat(tx.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Withdrawals */}
      {activeTab === 'withdrawals' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {withdrawals.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">暂无提现记录</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {withdrawals.map(wr => {
                const st = wrStatusMap[wr.status] || wrStatusMap.pending
                return (
                  <div key={wr.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">¥{parseFloat(wr.amount).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">
                        {wr.payment_method === 'alipay' ? '支付宝' : wr.payment_method === 'wechat' ? '微信' : '银行卡'} · {wr.account_name}
                      </p>
                      {wr.admin_note && wr.status === 'rejected' && (
                        <p className="text-xs text-red-400 mt-1">{wr.admin_note}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
                      <p className="text-xs text-gray-500 mt-1">{new Date(wr.created_at).toLocaleDateString('zh-CN')}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawForm && (
        <WithdrawModal
          maxAmount={parseFloat(wallet?.balance || 0)}
          onClose={() => setShowWithdrawForm(false)}
          onSuccess={() => { setShowWithdrawForm(false); loadData(); showToast('提现申请已提交', 'success') }}
          showToast={showToast}
        />
      )}
    </div>
  )
}

// ========== Withdraw Modal ==========
const WithdrawModal = ({ maxAmount, onClose, onSuccess, showToast }) => {
  const [form, setForm] = useState({
    amount: '',
    paymentMethod: 'alipay',
    accountName: '',
    accountNumber: '',
    paymentPassword: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [feeInfo, setFeeInfo] = useState(null) // { feeAmount, actualAmount, feePercent }
  const [feeLoading, setFeeLoading] = useState(false)

  // 动态计算手续费
  useEffect(() => {
    const amount = parseFloat(form.amount)
    if (!amount || amount < 1) {
      setFeeInfo(null)
      return
    }
    const timer = setTimeout(async () => {
      setFeeLoading(true)
      const res = await authFetch(`/seller/wallet/fee-preview?amount=${amount}`)
      if (res.code === 200) setFeeInfo(res.data)
      setFeeLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [form.amount])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || amount < 1) { showToast('提现金额最低 1 元', 'error'); return }
    if (amount > maxAmount) { showToast('余额不足', 'error'); return }
    if (!form.accountName.trim() || !form.accountNumber.trim()) { showToast('请填写完整的收款信息', 'error'); return }
    if (!form.paymentPassword) { showToast('请输入支付密码', 'error'); return }

    setSubmitting(true)
    const res = await authFetch('/seller/wallet/withdraw', { method: 'POST', body: form })
    setSubmitting(false)

    if (res.code === 200) {
      onSuccess()
    } else if (res.needSetup) {
      showToast('请先在安全中心设置支付密码', 'error')
    } else {
      showToast(res.message || '提交失败', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-bold">申请提现</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircle size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 text-sm text-indigo-300">
            可提现余额: <span className="font-bold">¥{maxAmount.toFixed(2)}</span>
          </div>

          {/* 提现金额 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">提现金额 <span className="text-red-400">*</span></label>
            <input
              type="number" step="0.01" min="1" max={maxAmount}
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none"
              placeholder="最低 1.00"
              required
            />
          </div>

          {/* 手续费实时预览 */}
          {feeInfo && parseFloat(form.amount) >= 1 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">提现金额</span>
                <span className="text-white">¥{parseFloat(form.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-yellow-400 flex items-center gap-1">
                  <AlertTriangle size={13} /> 手续费 ({feeInfo.feePercent}%)
                </span>
                <span className="text-yellow-400">- ¥{feeInfo.feeAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-yellow-500/20 pt-2 flex justify-between text-sm font-semibold">
                <span className="text-emerald-400">实际到账</span>
                <span className="text-emerald-400 text-lg">¥{feeInfo.actualAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
          {feeLoading && (
            <div className="text-xs text-gray-500 text-center">计算手续费中...</div>
          )}

          {/* 收款方式 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">收款方式</label>
            <select
              value={form.paymentMethod}
              onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none"
            >
              <option value="alipay">支付宝</option>
              <option value="wechat">微信</option>
              <option value="bank">银行卡</option>
            </select>
          </div>

          {/* 收款人 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">收款人 <span className="text-red-400">*</span></label>
              <input
                type="text" value={form.accountName}
                onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">收款账号 <span className="text-red-400">*</span></label>
              <input
                type="text" value={form.accountNumber}
                onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                placeholder="账号"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none"
                required
              />
            </div>
          </div>

          {/* 支付密码 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <Shield size={14} className="text-indigo-400" /> 支付密码 <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.paymentPassword}
                onChange={e => setForm(f => ({ ...f, paymentPassword: e.target.value }))}
                placeholder="请输入支付密码"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 outline-none pr-10"
                required
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">未设置？请前往安全中心设置支付密码</p>
          </div>

          <button
            type="submit"
            disabled={submitting || !feeInfo || feeInfo.actualAmount <= 0}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            {submitting ? '提交中...' : `确认提现 ¥${feeInfo ? feeInfo.actualAmount.toFixed(2) : '0.00'}`}
          </button>
        </form>
      </div>
    </div>
  )
}

export default SellerWallet
