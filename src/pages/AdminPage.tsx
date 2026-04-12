import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminDistributionPanel from '@/components/distribution/AdminDistributionPanel';
import { Users, DollarSign, TrendingUp, Shield, CheckCircle, XCircle, AlertTriangle, BarChart2, FileText, Radio } from 'lucide-react';

type Tab = 'overview' | 'withdrawals' | 'creators' | 'moderation' | 'distribution' | 'analytics' | 'logs';

interface Withdrawal { id: string; creator: string; amount: number; method: string; status: string; date: string; country: string; }
interface Creator { id: string; name: string; email: string; type: string; status: string; joined: string; country: string; content: number; }
interface ContentItem { id: string; title: string; creator: string; type: string; status: string; flagged: string; date: string; }
interface AuditLog { id: string; admin: string; action: string; target: string; timestamp: string; }

const STATS = [
  { label: 'Total Users', value: '12,847', change: '+124 today', icon: Users, color: '#00D9FF' },
  { label: 'Active Creators', value: '3,291', change: '+18 today', icon: Shield, color: '#9D4EDD' },
  { label: 'Active Competitions', value: '6', change: '2 ending soon', icon: TrendingUp, color: '#FFB800' },
  { label: 'Pending Payouts', value: '$14,320', change: '23 requests', icon: DollarSign, color: '#00F5A0' },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadedTabs, setLoadedTabs] = useState<Set<Tab>>(new Set());

  useEffect(() => {
    if (loadedTabs.has(tab)) return;
    setLoadedTabs(prev => new Set([...prev, tab]));

    if (tab === 'withdrawals') {
      supabase.from('creator_earnings').select('id, user_id, amount, payout_method, status, created_at, profiles:user_id(display_name, country)')
        .eq('type', 'payout').order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => {
          setWithdrawals((data ?? []).map((r: any) => ({
            id: r.id,
            creator: r.profiles?.display_name ?? r.user_id,
            amount: r.amount ?? 0,
            method: r.payout_method ?? '—',
            status: r.status ?? 'pending',
            date: r.created_at?.slice(0, 10) ?? '',
            country: r.profiles?.country ?? '—',
          })));
        });
    }

    if (tab === 'creators') {
      supabase.from('profiles').select('id, display_name, email, role, status, created_at, country')
        .in('role', ['creator', 'singer_artist', 'author']).order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => {
          setCreators((data ?? []).map((r: any) => ({
            id: r.id,
            name: r.display_name ?? r.email ?? r.id,
            email: r.email ?? '',
            type: r.role ?? 'creator',
            status: r.status ?? 'pending',
            joined: r.created_at?.slice(0, 10) ?? '',
            country: r.country ?? '—',
            content: 0,
          })));
        });
    }

    if (tab === 'moderation') {
      supabase.from('ecom_products').select('id, title, vendor, product_type, status, created_at, flag_reason')
        .eq('status', 'pending').order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => {
          setContent((data ?? []).map((r: any) => ({
            id: r.id,
            title: r.title ?? 'Untitled',
            creator: r.vendor ?? '—',
            type: r.product_type ?? '—',
            status: r.status ?? 'pending',
            flagged: r.flag_reason ?? 'review',
            date: r.created_at?.slice(0, 10) ?? '',
          })));
        });
    }

    if (tab === 'logs') {
      supabase.from('admin_logs').select('id, admin_id, action, target_id, created_at')
        .order('created_at', { ascending: false }).limit(30)
        .then(({ data }) => {
          setLogs((data ?? []).map((r: any) => ({
            id: r.id,
            admin: r.admin_id ?? 'system',
            action: r.action ?? '',
            target: r.target_id ?? '',
            timestamp: r.created_at ?? '',
          })));
        });
    }
  }, [tab]);

  const handleWithdrawal = async (id: string, action: 'approved' | 'rejected') => {
    await supabase.from('creator_earnings').update({ status: action === 'approved' ? 'completed' : 'rejected' }).eq('id', id);
    setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: action } : w));
    await supabase.from('admin_logs').insert([{ action: `${action} withdrawal`, target_id: id, created_at: new Date().toISOString() }]).catch(() => {});
  };

  const handleCreator = async (id: string, action: 'approved' | 'rejected') => {
    await supabase.from('profiles').update({ status: action }).eq('id', id);
    setCreators(prev => prev.map(c => c.id === id ? { ...c, status: action } : c));
    await supabase.from('admin_logs').insert([{ action: `${action} creator`, target_id: id, created_at: new Date().toISOString() }]).catch(() => {});
  };

  const handleContent = async (id: string, action: 'approved' | 'removed') => {
    await supabase.from('ecom_products').update({ status: action === 'approved' ? 'active' : 'removed' }).eq('id', id);
    setContent(prev => prev.map(c => c.id === id ? { ...c, status: action } : c));
    await supabase.from('admin_logs').insert([{ action: `${action} content`, target_id: id, created_at: new Date().toISOString() }]).catch(() => {});
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview',      label: 'Overview',             icon: BarChart2     },
    { id: 'distribution',  label: 'Distribution Queue',   icon: Radio         },
    { id: 'withdrawals',   label: 'Withdrawals',          icon: DollarSign    },
    { id: 'creators',      label: 'Creator Applications', icon: Users         },
    { id: 'moderation',    label: 'Content Moderation',   icon: AlertTriangle },
    { id: 'analytics',     label: 'Analytics',            icon: TrendingUp    },
    { id: 'logs',          label: 'Audit Logs',           icon: FileText      },
  ];

  return (
    <div className="min-h-screen bg-[#0A1128]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Admin Dashboard</h1>
            <p className="text-white/40 text-sm">Platform management & moderation</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.id ? 'bg-[#00D9FF] text-[#0A1128]' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {STATS.map(s => (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <s.icon className="w-5 h-5 mb-3" style={{ color: s.color }} />
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-white/40 text-xs mt-0.5">{s.label}</p>
                  <p className="text-xs mt-1" style={{ color: s.color }}>{s.change}</p>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3">Revenue Overview</h3>
                <div className="space-y-2">
                  {[{label:'Total Revenue', val:'$284,320', color:'#00F5A0'},{label:'Platform Commission (30%)', val:'$85,296', color:'#FFB800'},{label:'Creator Payouts (70%)', val:'$199,024', color:'#00D9FF'},{label:'Pending Payouts', val:'$14,320', color:'#9D4EDD'}].map(r => (
                    <div key={r.label} className="flex justify-between text-sm">
                      <span className="text-white/50">{r.label}</span>
                      <span className="font-semibold" style={{ color: r.color }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3">Monthly Growth</h3>
                <div className="flex items-end gap-1 h-24">
                  {[40,55,45,70,60,80,75,90,85,95,88,100].map((h,i) => (
                    <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: `linear-gradient(to top, #00D9FF, #9D4EDD)`, opacity: 0.7 + i * 0.025 }} />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-white/30 mt-1">
                  <span>Apr</span><span>Jun</span><span>Aug</span><span>Oct</span><span>Dec</span><span>Mar</span>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  {[{label:'Pending Withdrawals',count:4,color:'#FFB800',tab:'withdrawals'},{label:'Creator Applications',count:3,color:'#00D9FF',tab:'creators'},{label:'Content in Review',count:3,color:'#FF006E',tab:'moderation'}].map(a => (
                    <button key={a.tab} onClick={() => setTab(a.tab as Tab)} className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
                      <span className="text-white/70 text-sm">{a.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: a.color + '20', color: a.color }}>{a.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Distribution Queue */}
        {tab === 'distribution' && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <AdminDistributionPanel />
          </div>
        )}

        {/* Withdrawals */}
        {tab === 'withdrawals' && (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-semibold">Pending Withdrawal Requests</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="text-xs text-white/40 border-b border-white/10">
                  <th className="p-4 text-left">Creator</th>
                  <th className="p-4 text-left">Amount</th>
                  <th className="p-4 text-left">Method</th>
                  <th className="p-4 text-left">Country</th>
                  <th className="p-4 text-left">Date</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-white/5">
                  {withdrawals.map(w => (
                    <tr key={w.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-sm text-white font-medium">{w.creator}</td>
                      <td className="p-4 text-sm text-[#00F5A0] font-bold">${w.amount.toFixed(2)}</td>
                      <td className="p-4 text-sm text-white/60">{w.method}</td>
                      <td className="p-4 text-sm text-white/60">{w.country}</td>
                      <td className="p-4 text-sm text-white/40">{w.date}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          w.status === 'pending' ? 'bg-[#FFB800]/20 text-[#FFB800]' :
                          w.status === 'approved' ? 'bg-[#00F5A0]/20 text-[#00F5A0]' : 'bg-red-500/20 text-red-400'
                        }`}>{w.status}</span>
                      </td>
                      <td className="p-4">
                        {w.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => handleWithdrawal(w.id, 'approved')} className="p-1.5 bg-[#00F5A0]/20 text-[#00F5A0] rounded-lg hover:bg-[#00F5A0]/30 transition-colors"><CheckCircle className="w-4 h-4" /></button>
                            <button onClick={() => handleWithdrawal(w.id, 'rejected')} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"><XCircle className="w-4 h-4" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Creator Applications */}
        {tab === 'creators' && (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-semibold">Creator Applications</h3>
            </div>
            <div className="divide-y divide-white/5">
              {creators.map(c => (
                <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{c.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{c.name}</p>
                    <p className="text-xs text-white/40">{c.email} · {c.country} · {c.content} pieces uploaded</p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs bg-[#9D4EDD]/20 text-[#9D4EDD]">{c.type}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    c.status === 'pending' ? 'bg-[#FFB800]/20 text-[#FFB800]' :
                    c.status === 'approved' ? 'bg-[#00F5A0]/20 text-[#00F5A0]' : 'bg-red-500/20 text-red-400'
                  }`}>{c.status}</span>
                  {c.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleCreator(c.id, 'approved')} className="p-1.5 bg-[#00F5A0]/20 text-[#00F5A0] rounded-lg hover:bg-[#00F5A0]/30 transition-colors"><CheckCircle className="w-4 h-4" /></button>
                      <button onClick={() => handleCreator(c.id, 'rejected')} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"><XCircle className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Moderation */}
        {tab === 'moderation' && (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-semibold">Content Moderation Queue</h3>
            </div>
            <div className="divide-y divide-white/5">
              {content.map(c => (
                <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-[#FFB800]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{c.title}</p>
                    <p className="text-xs text-white/40">{c.creator} · {c.type} · {c.date}</p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">⚑ {c.flagged}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    c.status === 'pending' ? 'bg-[#FFB800]/20 text-[#FFB800]' :
                    c.status === 'approved' ? 'bg-[#00F5A0]/20 text-[#00F5A0]' : 'bg-red-500/20 text-red-400'
                  }`}>{c.status}</span>
                  {c.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleContent(c.id, 'approved')} className="px-3 py-1.5 bg-[#00F5A0]/20 text-[#00F5A0] text-xs rounded-lg hover:bg-[#00F5A0]/30 transition-colors flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approve</button>
                      <button onClick={() => handleContent(c.id, 'removed')} className="px-3 py-1.5 bg-red-500/20 text-red-400 text-xs rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-1"><XCircle className="w-3 h-3" /> Remove</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics */}
        {tab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[{label:'Total Revenue',val:'$284,320',color:'#00F5A0'},{label:'Total Payouts',val:'$199,024',color:'#00D9FF'},{label:'Commission Earned',val:'$85,296',color:'#FFB800'},{label:'MoM Growth',val:'+18.4%',color:'#9D4EDD'}].map(s => (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <p className="text-xs text-white/40 mb-1">{s.label}</p>
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.val}</p>
                </div>
              ))}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Revenue by Content Type</h3>
              <div className="space-y-3">
                {[{label:'Music',pct:52,val:'$147,846',color:'#9D4EDD'},{label:'Videos',pct:24,val:'$68,237',color:'#00D9FF'},{label:'Books',pct:14,val:'$39,805',color:'#FFB800'},{label:'Podcasts',pct:10,val:'$28,432',color:'#00F5A0'}].map(r => (
                  <div key={r.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70">{r.label}</span>
                      <span className="font-semibold" style={{ color: r.color }}>{r.val}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Audit Logs */}
        {tab === 'logs' && (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-semibold">Audit Logs</h3>
            </div>
            <div className="divide-y divide-white/5">
              {logs.map(log => (
                <div key={log.id} className="flex items-center gap-4 p-4">
                  <div className="w-8 h-8 rounded-lg bg-[#00D9FF]/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#00D9FF]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white"><span className="text-[#00D9FF]">{log.admin}</span> · {log.action}</p>
                    <p className="text-xs text-white/40">{log.target}</p>
                  </div>
                  <p className="text-xs text-white/30">{new Date(log.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
