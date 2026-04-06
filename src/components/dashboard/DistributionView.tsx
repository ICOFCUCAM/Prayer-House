import React, { useState } from 'react';
import { IMAGES, formatCurrency } from '@/lib/constants';

const mockReleases = [
  { id: 'r1', title: 'Midnight Vibes EP', upc: 'US-2026-001234', cover: IMAGES.albums[0], status: 'distributed', tracks: 5, platforms: 32, revenue: 2340, date: '2026-02-15' },
  { id: 'r2', title: 'Nairobi Nights Album', upc: 'US-2026-001235', cover: IMAGES.albums[1], status: 'distributed', tracks: 12, platforms: 32, revenue: 4560, date: '2026-01-20' },
  { id: 'r3', title: 'Golden Hour Sessions', upc: 'US-2026-001236', cover: IMAGES.albums[3], status: 'submitted', tracks: 3, platforms: 0, revenue: 0, date: '2026-03-18' },
  { id: 'r4', title: 'Rhythm & Soul Collection', upc: '', cover: IMAGES.albums[4], status: 'draft', tracks: 8, platforms: 0, revenue: 0, date: '2026-03-20' },
];

const platforms = [
  { name: 'Spotify', status: 'live', streams: 234000, revenue: 1023.45 },
  { name: 'Apple Music', status: 'live', streams: 189000, revenue: 945.67 },
  { name: 'YouTube Music', status: 'live', streams: 156000, revenue: 456.78 },
  { name: 'TikTok', status: 'live', streams: 567000, revenue: 234.56 },
  { name: 'Amazon Music', status: 'live', streams: 89000, revenue: 345.67 },
  { name: 'Deezer', status: 'live', streams: 67000, revenue: 189.23 },
  { name: 'Tidal', status: 'processing', streams: 0, revenue: 0 },
  { name: 'Audiomack', status: 'live', streams: 123000, revenue: 123.45 },
];

export default function DistributionView() {
  const [showNewRelease, setShowNewRelease] = useState(false);

  const statusColors: Record<string, string> = {
    distributed: 'bg-emerald-500/20 text-emerald-400',
    submitted: 'bg-amber-500/20 text-amber-400',
    draft: 'bg-gray-500/20 text-gray-400',
    live: 'bg-emerald-500/20 text-emerald-400',
    processing: 'bg-amber-500/20 text-amber-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Distribution</h1>
          <p className="text-gray-400 mt-1">Manage your music releases across 30+ platforms</p>
        </div>
        <button onClick={() => setShowNewRelease(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Release
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Releases', value: '4', color: 'text-indigo-400' },
          { label: 'Platforms', value: '32', color: 'text-blue-400' },
          { label: 'Total Streams', value: '1.4M', color: 'text-purple-400' },
          { label: 'Distribution Revenue', value: '$3,318', color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">Your Releases</h3>
        </div>
        <div className="divide-y divide-gray-800">
          {mockReleases.map(release => (
            <div key={release.id} className="flex items-center gap-4 p-4 hover:bg-gray-800/30 transition-colors">
              <img src={release.cover} alt="" className="w-14 h-14 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{release.title}</p>
                <p className="text-xs text-gray-400">{release.tracks} tracks · {release.upc || 'No UPC'}</p>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm text-gray-300">{release.platforms > 0 ? `${release.platforms} platforms` : '-'}</p>
                <p className="text-xs text-gray-500">{release.date}</p>
              </div>
              {release.revenue > 0 && (
                <p className="text-sm font-medium text-emerald-400">{formatCurrency(release.revenue)}</p>
              )}
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[release.status]}`}>
                {release.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">Platform Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="p-4 text-left">Platform</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-right">Streams</th>
                <th className="p-4 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {platforms.map(p => (
                <tr key={p.name} className="hover:bg-gray-800/30 transition-colors">
                  <td className="p-4 text-sm font-medium text-white">{p.name}</td>
                  <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[p.status]}`}>{p.status}</span></td>
                  <td className="p-4 text-right text-sm text-gray-300">{p.streams > 0 ? p.streams.toLocaleString() : '-'}</td>
                  <td className="p-4 text-right text-sm text-emerald-400">{p.revenue > 0 ? formatCurrency(p.revenue) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNewRelease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowNewRelease(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Create New Release</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Release Title</label>
                <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Album or EP title" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Artist Name</label>
                <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Your artist name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Genre</label>
                  <select className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option>Afrobeats</option><option>Hip-Hop</option><option>Electronic</option><option>Soul</option><option>Jazz</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Release Date</label>
                  <input type="date" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowNewRelease(false)} className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-xl hover:bg-gray-700 transition-colors">Cancel</button>
                <button onClick={() => setShowNewRelease(false)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl transition-colors">Create Release</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
