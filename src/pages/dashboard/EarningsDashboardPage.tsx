import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CreatorLevelBadge from '@/components/CreatorLevelBadge';
import { EarningCategory } from '@/pipelines/earnings/EarningsWorker';

// ── Types ────────────────────────────────────────────────────────────────────

interface Earning {
  id: string;
  category: EarningCategory;
  amount: number;
  period: string;
  paid: boolean;
  created_at: string;
}

interface CreatorLevel {
  level: string;
  xp: number;
  xp_to_next: number;
}

type Period = 'month' | '3months' | 'all';

const CATEGORY_LABELS: Record<string, string> = {
  music_stream: 'Music Streams',
  book_sale: 'Book Sales',
  audiobook_play: 'Audiobook Plays',
  competition_win: 'Competition Wins',
  fan_vote_reward: 'Fan Vote Rewards',
  distribution_royalty: 'Distribution Royalties',
  translation_sale: 'Translation Sales',
};

const CATEGORY_COLORS: Record<string, string> = {
  music_stream: 'from-[#00D9FF] to-[#9D4EDD]',
  book_sale: 'from-[#9D4EDD] to-[#FF6B00]',
  audiobook_play: 'from-[#FFB800] to-[#FF6B00]',
  competition_win: 'from-[#FFB800] to-[#9D4EDD]',
  fan_vote_reward: 'from-[#00F5A0] to-[#00D9FF]',
  distribution_royalty: 'from-[#00D9FF] to-[#00F5A0]',
  translation_sale: 'from-[#9D4EDD] to-[#00F5A0]',
};

const WITHDRAWAL_METHODS = ['PayPal', 'Bank Transfer', 'Mobile Money'];

// ── Withdrawal Modal ──────────────────────────────────────────────────────────

interface WithdrawalModalProps {
  userId: string;
  maxAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

function WithdrawalModal({ userId, maxAmount, onClose, onSuccess }: WithdrawalModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(WITHDRAWAL_METHODS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) { setError('Enter a valid amount.'); return; }
    if (numAmount > maxAmount) { setError(`Maximum withdrawal is $${maxAmount.toFixed(2)}.`); return; }
    if (!details.trim()) { setError('Please enter your payout details.'); return; }

    setSubmitting(true);
    setError('');

    const { error: insertErr } = await supabase.from('creator_withdrawals').insert({
      user_id: userId,
      amount: numAmount,
      method,
      payout_details: details.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    setSubmitting(false);
    if (insertErr) { setError(insertErr.message); return; }
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0D1733] border border-white/10 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Request Withdrawal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="1"
                step="0.01"
                max={maxAmount}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FFB800]/50"
                placeholder="0.00"
              />
            </div>
            <p className="text-gray-500 text-xs mt-1">Available: <span className="text-[#FFB800]">${maxAmount.toFixed(2)}</span></p>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Payout Method</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full bg-[#0A1128] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#FFB800]/50"
            >
              {WITHDRAWAL_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">
              {method === 'PayPal' ? 'PayPal Email' : method === 'Bank Transfer' ? 'Bank Account Details' : 'Mobile Money Number'}
            </label>
            <input
              value={details}
              onChange={e => setDetails(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FFB800]/50"
              placeholder={method === 'PayPal' ? 'you@example.com' : method === 'Bank Transfer' ? 'Bank name, account number...' : '+1 234 567 8900'}
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-white rounded-xl font-semibold disabled:opacity-40 transition-opacity"
          >
            {submitting ? 'Submitting…' : 'Submit Withdrawal Request'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function EarningsDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [creatorLevel, setCreatorLevel] = useState<CreatorLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    Promise.all([
      supabase
        .from('creator_earnings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('creator_levels')
        .select('level, xp, xp_to_next')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]).then(([earningsRes, levelRes]) => {
      setEarnings((earningsRes.data ?? []) as Earning[]);
      setCreatorLevel(levelRes.data as CreatorLevel | null);
      setLoading(false);
    });
  }, [user]);

  // Filter by period
  const filteredEarnings = earnings.filter(e => {
    if (period === 'all') return true;
    const eDate = new Date(e.created_at);
    const now = new Date();
    if (period === 'month') {
      return eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear();
    }
    if (period === '3months') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return eDate >= threeMonthsAgo;
    }
    return true;
  });

  const totalEarnings = filteredEarnings.reduce((s, e) => s + e.amount, 0);
  const allTimeTotal = earnings.reduce((s, e) => s + e.amount, 0);

  const earningsByCategory = filteredEarnings.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  const maxBarValue = Math.max(...Object.values(earningsByCategory), 1);

  const xpPct = creatorLevel ? Math.min((creatorLevel.xp / (creatorLevel.xp + creatorLevel.xp_to_next)) * 100, 100) : 0;

  const PERIOD_OPTIONS: { id: Period; label: string }[] = [
    { id: 'month', label: 'This Month' },
    { id: '3months', label: 'Last 3 Months' },
    { id: 'all', label: 'All Time' },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0A1128] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FFB800] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0A1128] text-white">
      <Header />

      {showWithdrawal && (
        <WithdrawalModal
          userId={user.id}
          maxAmount={allTimeTotal}
          onClose={() => setShowWithdrawal(false)}
          onSuccess={() => { setShowWithdrawal(false); setWithdrawalSuccess(true); }}
        />
      )}

      {withdrawalSuccess && (
        <div className="fixed bottom-6 right-6 z-40 bg-[#00F5A0]/10 border border-[#00F5A0]/30 rounded-2xl px-5 py-4 flex items-center gap-3">
          <span className="text-[#00F5A0] text-xl">✓</span>
          <div>
            <p className="text-white font-medium text-sm">Withdrawal submitted!</p>
            <p className="text-gray-400 text-xs">We'll process it within 2–5 business days.</p>
          </div>
          <button onClick={() => setWithdrawalSuccess(false)} className="text-gray-500 hover:text-white ml-2">&times;</button>
        </div>
      )}

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0A1128] via-[#100D2E] to-[#0A1128] border-b border-white/5 py-12">
        <div className="max-w-5xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFB800] to-[#FF6B00] flex items-center justify-center text-xl">💰</div>
            <span className="text-[#FFB800] text-sm font-medium uppercase tracking-widest">Earnings Dashboard</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-6 justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Earnings</p>
              <p className="text-5xl font-black text-[#FFB800]">${allTimeTotal.toFixed(2)}</p>
              <p className="text-gray-500 text-sm mt-1">All time · USD</p>
            </div>
            <button
              onClick={() => setShowWithdrawal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-white rounded-xl font-semibold shadow-lg shadow-orange-500/20 hover:opacity-90 transition-opacity"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Withdraw Funds
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-10 space-y-10">

        {/* Creator Level */}
        {creatorLevel && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Creator Level</p>
                <CreatorLevelBadge level={creatorLevel.level} xp={creatorLevel.xp} showXP />
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">XP to next level</p>
                <p className="text-white font-bold">{creatorLevel.xp_to_next.toLocaleString()}</p>
              </div>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] rounded-full transition-all duration-700"
                style={{ width: `${xpPct}%` }}
              />
            </div>
            <p className="text-gray-500 text-xs mt-1.5">{creatorLevel.xp.toLocaleString()} / {(creatorLevel.xp + creatorLevel.xp_to_next).toLocaleString()} XP</p>
          </div>
        )}

        {/* Period Selector */}
        <div>
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            {PERIOD_OPTIONS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  period === p.id
                    ? 'bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-white shadow-lg'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Total for period */}
          <div className="text-center mb-8 py-5 bg-white/3 border border-white/5 rounded-2xl">
            <p className="text-gray-400 text-sm mb-1">{PERIOD_OPTIONS.find(p2 => p2.id === period)?.label} Earnings</p>
            <p className="text-3xl font-black text-[#FFB800]">${totalEarnings.toFixed(2)}</p>
          </div>

          {/* Category Breakdown */}
          <h2 className="text-lg font-bold text-white mb-5">Breakdown by Category</h2>
          {Object.keys(earningsByCategory).length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white/3 border border-white/5 rounded-2xl">
              No earnings for this period.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(earningsByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amount]) => {
                  const pct = (amount / maxBarValue) * 100;
                  return (
                    <div key={cat} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white font-medium">{CATEGORY_LABELS[cat] ?? cat}</span>
                        <span className="text-[#FFB800] font-bold text-sm">${amount.toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${CATEGORY_COLORS[cat] ?? 'from-[#9D4EDD] to-[#00D9FF]'} rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        {filteredEarnings.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-5">Recent Transactions</h2>
            <div className="overflow-x-auto bg-white/3 border border-white/5 rounded-2xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-gray-400 font-medium py-4 px-5">Date</th>
                    <th className="text-left text-gray-400 font-medium py-4 px-5">Category</th>
                    <th className="text-left text-gray-400 font-medium py-4 px-5">Status</th>
                    <th className="text-right text-gray-400 font-medium py-4 px-5">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEarnings.slice(0, 20).map(e => (
                    <tr key={e.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                      <td className="py-3.5 px-5 text-gray-300">
                        {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-5 text-gray-300">{CATEGORY_LABELS[e.category] ?? e.category}</td>
                      <td className="py-3.5 px-5">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${e.paid ? 'text-[#00F5A0] border-[#00F5A0]/30 bg-[#00F5A0]/10' : 'text-[#FFB800] border-[#FFB800]/30 bg-[#FFB800]/10'}`}>
                          {e.paid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-[#FFB800]">${e.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
