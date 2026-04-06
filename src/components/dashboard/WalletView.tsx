import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { MOCK_TRANSACTIONS, formatCurrency } from '@/lib/constants';

export default function WalletView() {
  const { wallet } = useApp();
  const [withdrawMethod, setWithdrawMethod] = useState<'stripe' | 'mpesa' | 'mtn' | 'paystack'>('stripe');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [txFilter, setTxFilter] = useState('all');

  const totalBalance = wallet.available + wallet.pending + wallet.subscriptions + wallet.distributions + wallet.tips + wallet.competitions;

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawSuccess(true);
    setTimeout(() => { setWithdrawSuccess(false); setShowWithdrawForm(false); setWithdrawAmount(''); }, 2000);
  };

  const filteredTx = txFilter === 'all' ? MOCK_TRANSACTIONS : MOCK_TRANSACTIONS.filter(t => t.type === txFilter);

  const balanceCards = [
    { label: 'Available Balance', value: wallet.available, color: 'emerald' },
    { label: 'Pending', value: wallet.pending, color: 'amber' },
    { label: 'Subscriptions', value: wallet.subscriptions, color: 'indigo' },
    { label: 'Distributions', value: wallet.distributions, color: 'blue' },
    { label: 'Tips', value: wallet.tips, color: 'pink' },
    { label: 'Competition Rewards', value: wallet.competitions, color: 'purple' },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallet</h1>
          <p className="text-gray-400 mt-1">Manage your earnings and payouts</p>
        </div>
        <button onClick={() => setShowWithdrawForm(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Withdraw
        </button>
      </div>

      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white">
        <p className="text-sm opacity-80 mb-1">Total Balance</p>
        <p className="text-4xl font-bold">{formatCurrency(totalBalance)}</p>
        <p className="text-sm opacity-60 mt-2">Across all income streams</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {balanceCards.map(card => {
          const colors = colorMap[card.color];
          return (
            <div key={card.label} className={`${colors.bg} border ${colors.border} rounded-xl p-4`}>
              <p className="text-xs text-gray-400 mb-1">{card.label}</p>
              <p className={`text-lg font-bold ${colors.text}`}>{formatCurrency(card.value)}</p>
            </div>
          );
        })}
      </div>

      {showWithdrawForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowWithdrawForm(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Withdraw Funds</h3>
            {withdrawSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-white font-medium">Withdrawal Requested!</p>
                <p className="text-sm text-gray-400 mt-1">Processing in 1-3 business days</p>
              </div>
            ) : (
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'stripe' as const, label: 'Stripe', desc: 'Bank Transfer' },
                      { id: 'mpesa' as const, label: 'M-Pesa', desc: 'Kenya' },
                      { id: 'mtn' as const, label: 'MTN MoMo', desc: 'West Africa' },
                      { id: 'paystack' as const, label: 'Paystack', desc: 'Nigeria' },
                    ].map(method => (
                      <button key={method.id} type="button" onClick={() => setWithdrawMethod(method.id)} className={`p-3 rounded-xl text-left transition-all ${withdrawMethod === method.id ? 'bg-indigo-600/20 border-indigo-500 border' : 'bg-gray-800 border border-gray-700 hover:border-gray-600'}`}>
                        <p className="text-sm font-medium text-white">{method.label}</p>
                        <p className="text-xs text-gray-400">{method.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Amount (USD)</label>
                  <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="0.00" className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <p className="text-xs text-gray-500 mt-1">Available: {formatCurrency(wallet.available)}</p>
                </div>
                {(withdrawMethod === 'mpesa' || withdrawMethod === 'mtn') && (
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Phone Number</label>
                    <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+254 7XX XXX XXX" className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowWithdrawForm(false)} className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-xl hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl transition-colors">Withdraw</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-white">Transaction History</h3>
          <div className="flex items-center gap-2 overflow-x-auto">
            {['all', 'subscription', 'tip', 'royalty', 'payout', 'competition_reward'].map(f => (
              <button key={f} onClick={() => setTxFilter(f)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${txFilter === f ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {f === 'all' ? 'All' : f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-800">
          {filteredTx.map(tx => (
            <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.amount > 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  <svg className={`w-5 h-5 ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tx.amount > 0 ? 'M7 11l5-5m0 0l5 5m-5-5v12' : 'M17 13l-5 5m0 0l-5-5m5 5V6'} />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{tx.description}</p>
                  <p className="text-xs text-gray-500 capitalize">{tx.type.replace('_', ' ')} · {tx.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
