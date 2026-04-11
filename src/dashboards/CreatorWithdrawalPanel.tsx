import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  Smartphone,
  Building,
} from 'lucide-react';

interface CreatorWithdrawalPanelProps {
  userId: string;
}

type PaymentMethod = 'PayPal' | 'Bank Transfer' | 'Mobile Money';

interface Withdrawal {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: string;
  created_at: string;
}

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  PayPal: <CreditCard className="w-4 h-4" />,
  'Bank Transfer': <Building className="w-4 h-4" />,
  'Mobile Money': <Smartphone className="w-4 h-4" />,
};

const STATUS_STYLES: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending: {
    color: '#FFB800',
    icon: <Clock className="w-3.5 h-3.5" />,
    label: 'Pending',
  },
  approved: {
    color: '#00F5A0',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    label: 'Approved',
  },
  rejected: {
    color: '#ef4444',
    icon: <XCircle className="w-3.5 h-3.5" />,
    label: 'Rejected',
  },
  paid: {
    color: '#00D9FF',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    label: 'Paid',
  },
};

const MIN_WITHDRAWAL = 10;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const CreatorWithdrawalPanel: React.FC<CreatorWithdrawalPanelProps> = ({ userId }) => {
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('PayPal');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const availableBalance = totalEarnings - totalWithdrawn;

  const fetchData = async () => {
    setLoadingBalance(true);

    const [earningsRes, withdrawnRes, historyRes] = await Promise.all([
      supabase
        .from('creator_earnings')
        .select('amount')
        .eq('user_id', userId),
      supabase
        .from('creator_withdrawals')
        .select('amount')
        .eq('user_id', userId)
        .in('status', ['pending', 'approved', 'paid']),
      supabase
        .from('creator_withdrawals')
        .select('id, amount, method, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const earned = (earningsRes.data ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
    const withdrawn = (withdrawnRes.data ?? []).reduce((sum, r) => sum + Number(r.amount), 0);

    setTotalEarnings(earned);
    setTotalWithdrawn(withdrawn);
    setWithdrawals((historyRes.data ?? []) as Withdrawal[]);
    setLoadingBalance(false);
  };

  useEffect(() => {
    if (!userId) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum < MIN_WITHDRAWAL) {
      return setError(`Minimum withdrawal amount is $${MIN_WITHDRAWAL}.`);
    }
    if (amountNum > availableBalance) {
      return setError('Insufficient balance.');
    }

    setSubmitting(true);

    const { error: insertErr } = await supabase.from('creator_withdrawals').insert({
      user_id: userId,
      amount: amountNum,
      method,
      status: 'pending',
    });

    if (insertErr) {
      setError(insertErr.message);
      setSubmitting(false);
      return;
    }

    setSuccessMsg(`Withdrawal request of $${amountNum.toFixed(2)} submitted!`);
    setAmount('');
    setSubmitting(false);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#0A1128] text-white p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFB800]/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-[#FFB800]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Withdrawal Panel</h1>
            <p className="text-gray-400 text-sm">Manage your earnings payout</p>
          </div>
        </div>

        {/* Balance card */}
        <div className="bg-[#1A2240] rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total Earned</p>
            {loadingBalance ? (
              <Loader2 className="w-5 h-5 text-[#00D9FF] animate-spin" />
            ) : (
              <p className="text-white text-xl font-bold">
                ${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Withdrawn</p>
            {loadingBalance ? (
              <Loader2 className="w-5 h-5 text-[#00D9FF] animate-spin" />
            ) : (
              <p className="text-red-400 text-xl font-bold">
                -${totalWithdrawn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Available</p>
            {loadingBalance ? (
              <Loader2 className="w-5 h-5 text-[#00D9FF] animate-spin" />
            ) : (
              <p className="text-[#FFB800] text-2xl font-bold">
                ${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </div>

        {/* Withdrawal form */}
        <div className="bg-[#1A2240] rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-white font-semibold text-base">Request Withdrawal</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 bg-[#00F5A0]/10 border border-[#00F5A0]/30 rounded-lg px-4 py-3 text-[#00F5A0] text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">
                Amount (USD) — min $10
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min={MIN_WITHDRAWAL}
                  max={availableBalance}
                  step={0.01}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="bg-[#0A1128] border border-[#2d3a5a] rounded-lg pl-7 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF] transition-colors text-sm w-full"
                />
              </div>
              <button
                type="button"
                onClick={() => setAmount(availableBalance.toFixed(2))}
                className="text-[#00D9FF] text-xs font-medium self-start hover:underline"
              >
                Use max (${availableBalance.toFixed(2)})
              </button>
            </div>

            {/* Payment method */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {(['PayPal', 'Bank Transfer', 'Mobile Money'] as PaymentMethod[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={[
                      'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all duration-150',
                      method === m
                        ? 'bg-[#00D9FF]/10 border-[#00D9FF] text-[#00D9FF]'
                        : 'bg-[#0A1128] border-[#2d3a5a] text-gray-400 hover:border-[#00D9FF]',
                    ].join(' ')}
                  >
                    {METHOD_ICONS[m]}
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || loadingBalance || availableBalance < MIN_WITHDRAWAL}
              className="w-full flex items-center justify-center gap-2 bg-[#FFB800] hover:bg-[#e6a600] disabled:opacity-50 disabled:cursor-not-allowed text-[#0A1128] font-bold py-3 rounded-xl transition-colors text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <DollarSign className="w-5 h-5" />
                  Request Withdrawal
                </>
              )}
            </button>
          </form>
        </div>

        {/* Withdrawal history */}
        <div className="bg-[#1A2240] rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-white font-semibold text-base">Withdrawal History</h2>

          {withdrawals.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No withdrawals yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {withdrawals.map(w => {
                const statusMeta = STATUS_STYLES[w.status] ?? STATUS_STYLES.pending;
                return (
                  <div
                    key={w.id}
                    className="flex items-center justify-between bg-[#0A1128] rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FFB800]/10 flex items-center justify-center text-[#FFB800]">
                        {METHOD_ICONS[w.method as PaymentMethod] ?? <CreditCard className="w-4 h-4" />}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white text-sm font-medium">{w.method}</span>
                        <span className="text-gray-500 text-xs">{formatDate(w.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[#FFB800] font-bold text-sm">
                        ${Number(w.amount).toFixed(2)}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: `${statusMeta.color}1a`,
                          color: statusMeta.color,
                        }}
                      >
                        {statusMeta.icon}
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorWithdrawalPanel;
