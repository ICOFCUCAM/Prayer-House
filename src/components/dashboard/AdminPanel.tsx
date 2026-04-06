import React, { useState } from 'react';
import { MOCK_CREATORS, MOCK_CONTENT, PLATFORM_STATS, formatNumber, formatCurrency } from '@/lib/constants';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content' | 'withdrawals' | 'competitions'>('overview');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [contentStatus, setContentStatus] = useState<Record<string, string>>({});

  const toggleUser = (id: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const approveContent = (id: string) => setContentStatus(prev => ({ ...prev, [id]: 'approved' }));
  const rejectContent = (id: string) => setContentStatus(prev => ({ ...prev, [id]: 'rejected' }));

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'users' as const, label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'content' as const, label: 'Content', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { id: 'withdrawals' as const, label: 'Withdrawals', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'competitions' as const, label: 'Competitions', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  ];

  const mockWithdrawals = [
    { id: 'w1', user: 'Amara Okafor', amount: 500, method: 'M-Pesa', status: 'pending', date: '2026-03-20' },
    { id: 'w2', user: 'Zuri Mwangi', amount: 1200, method: 'Stripe', status: 'pending', date: '2026-03-19' },
    { id: 'w3', user: 'Marcus Johnson', amount: 350, method: 'Paystack', status: 'approved', date: '2026-03-18' },
    { id: 'w4', user: 'David Chen', amount: 890, method: 'Stripe', status: 'completed', date: '2026-03-17' },
    { id: 'w5', user: 'Kwame Asante', amount: 200, method: 'MTN MoMo', status: 'pending', date: '2026-03-16' },
  ];

  const [withdrawalStatus, setWithdrawalStatus] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <p className="text-gray-400 mt-1">Platform management and oversight</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Creators', value: formatNumber(PLATFORM_STATS.totalCreators), change: '+234', color: 'indigo' },
              { label: 'Total Revenue', value: formatCurrency(PLATFORM_STATS.totalRevenue), change: '+12.5%', color: 'emerald' },
              { label: 'Active Competitions', value: PLATFORM_STATS.activeCompetitions.toString(), change: '+2', color: 'purple' },
              { label: 'Monthly Users', value: formatNumber(PLATFORM_STATS.monthlyActiveUsers), change: '+8.3%', color: 'blue' },
              { label: 'Total Content', value: formatNumber(PLATFORM_STATS.totalContent), change: '+1.2K', color: 'pink' },
              { label: 'Total Payouts', value: formatCurrency(PLATFORM_STATS.totalPayouts), change: '+$45K', color: 'amber' },
              { label: 'Subscriptions', value: formatNumber(PLATFORM_STATS.activeSubscriptions), change: '+890', color: 'cyan' },
              { label: 'Countries', value: PLATFORM_STATS.countriesServed.toString(), change: '+3', color: 'rose' },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-emerald-400 mt-1">{stat.change} this month</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-white">User Management</h3>
            {selectedUsers.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{selectedUsers.size} selected</span>
                <button className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg">Verify</button>
                <button className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg">Suspend</button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="p-4 text-left"><input type="checkbox" className="rounded" /></th>
                  <th className="p-4 text-left">User</th>
                  <th className="p-4 text-left">Role</th>
                  <th className="p-4 text-left">Country</th>
                  <th className="p-4 text-right">Followers</th>
                  <th className="p-4 text-right">Earnings</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {MOCK_CREATORS.map(c => (
                  <tr key={c.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="p-4"><input type="checkbox" checked={selectedUsers.has(c.id)} onChange={() => toggleUser(c.id)} className="rounded" /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={c.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <p className="text-sm font-medium text-white">{c.name}</p>
                          <p className="text-xs text-gray-500">@{c.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><span className="text-xs text-gray-300 capitalize">{c.category}</span></td>
                    <td className="p-4"><span className="text-xs text-gray-300">{c.country}</span></td>
                    <td className="p-4 text-right text-sm text-gray-300">{formatNumber(c.followers)}</td>
                    <td className="p-4 text-right text-sm text-emerald-400">{formatCurrency(c.earnings)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${c.verified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {c.verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 text-right"><button className="text-xs text-indigo-400 hover:text-indigo-300">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Content Moderation Queue</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {MOCK_CONTENT.slice(0, 6).map(item => (
              <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-gray-800/30 transition-colors">
                <img src={item.thumbnail} alt="" className="w-16 h-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.creator} · {item.type} · {item.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  {contentStatus[item.id] ? (
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${contentStatus[item.id] === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {contentStatus[item.id]}
                    </span>
                  ) : (
                    <>
                      <button onClick={() => approveContent(item.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors">Approve</button>
                      <button onClick={() => rejectContent(item.id)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors">Reject</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Withdrawal Requests</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {mockWithdrawals.map(w => (
              <div key={w.id} className="flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-white">{w.user}</p>
                  <p className="text-xs text-gray-400">{w.method} · {w.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-semibold text-white">{formatCurrency(w.amount)}</p>
                  {withdrawalStatus[w.id] ? (
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${withdrawalStatus[w.id] === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {withdrawalStatus[w.id]}
                    </span>
                  ) : w.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button onClick={() => setWithdrawalStatus(prev => ({ ...prev, [w.id]: 'approved' }))} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors">Approve</button>
                      <button onClick={() => setWithdrawalStatus(prev => ({ ...prev, [w.id]: 'rejected' }))} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors">Reject</button>
                    </div>
                  ) : (
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${w.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {w.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'competitions' && (
        <div className="space-y-4">
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Create Competition
          </button>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Competition management tools - create, edit, and manage competitions from here.</p>
          </div>
        </div>
      )}
    </div>
  );
}
