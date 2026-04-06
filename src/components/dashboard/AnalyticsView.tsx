import React, { useState } from 'react';
import { formatNumber, formatCurrency } from '@/lib/constants';

export default function AnalyticsView() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const metrics = [
    { label: 'Total Views', value: '1.24M', change: '+12.5%', up: true, icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'Watch Time', value: '45.2K hrs', change: '+8.3%', up: true, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'New Subscribers', value: '2,456', change: '+15.7%', up: true, icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
    { label: 'Revenue', value: '$8,923', change: '+22.1%', up: true, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Engagement Rate', value: '6.8%', change: '+1.2%', up: true, icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
    { label: 'Avg. Session', value: '4m 32s', change: '-0.5%', up: false, icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  ];

  const topContent = [
    { title: 'Midnight Vibes EP', views: 45200, revenue: 2340, growth: '+18%' },
    { title: 'Nairobi Nights Album', views: 89300, revenue: 4560, growth: '+25%' },
    { title: 'Beat Making Masterclass', views: 67800, revenue: 8900, growth: '+32%' },
    { title: 'Golden Hour Sessions', views: 34500, revenue: 1230, growth: '+12%' },
    { title: 'Afro House Mix Vol. 2', views: 78900, revenue: 3450, growth: '+20%' },
  ];

  const geoData = [
    { country: 'Nigeria', users: 234000, revenue: 45600, flag: 'NG' },
    { country: 'Kenya', users: 189000, revenue: 34200, flag: 'KE' },
    { country: 'United States', users: 156000, revenue: 89000, flag: 'US' },
    { country: 'Ghana', users: 98000, revenue: 18900, flag: 'GH' },
    { country: 'South Africa', users: 87000, revenue: 23400, flag: 'ZA' },
    { country: 'United Kingdom', users: 67000, revenue: 34500, flag: 'UK' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 mt-1">Track your performance and growth</p>
        </div>
        <div className="flex bg-gray-800 rounded-lg p-1">
          {(['7d', '30d', '90d', '1y'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${period === p ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={m.icon} /></svg>
              <span className="text-xs text-gray-400">{m.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{m.value}</p>
            <p className={`text-xs mt-1 ${m.up ? 'text-emerald-400' : 'text-red-400'}`}>{m.change} vs last period</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Views Over Time</h3>
          <div className="flex items-end gap-1 h-40">
            {[30, 45, 35, 60, 50, 70, 65, 80, 75, 90, 85, 95, 88, 92, 78, 85, 90, 95, 88, 82, 90, 95, 92, 88, 95, 90, 85, 92, 95, 98].map((h, i) => (
              <div key={i} className="flex-1 bg-indigo-600/30 hover:bg-indigo-600/50 rounded-t-sm transition-colors cursor-pointer" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-500">
            <span>Mar 1</span><span>Mar 10</span><span>Mar 20</span><span>Mar 30</span>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Revenue Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: 'Subscriptions', value: 4523, pct: 45, color: 'bg-indigo-500' },
              { label: 'Content Sales', value: 2340, pct: 23, color: 'bg-emerald-500' },
              { label: 'Royalties', value: 1890, pct: 19, color: 'bg-purple-500' },
              { label: 'Tips', value: 890, pct: 9, color: 'bg-pink-500' },
              { label: 'Competition Prizes', value: 400, pct: 4, color: 'bg-amber-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{item.label}</span>
                  <span className="text-sm font-medium text-white">{formatCurrency(item.value)}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className={`${item.color} h-2 rounded-full transition-all`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Top Performing Content</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {topContent.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-400 font-medium">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-gray-500">{formatNumber(item.views)} views</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-emerald-400">{formatCurrency(item.revenue)}</p>
                  <p className="text-xs text-emerald-400">{item.growth}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Audience by Country</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {geoData.map(geo => (
              <div key={geo.country} className="flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{geo.flag}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{geo.country}</p>
                    <p className="text-xs text-gray-500">{formatNumber(geo.users)} users</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-emerald-400">{formatCurrency(geo.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
