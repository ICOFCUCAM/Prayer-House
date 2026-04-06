import React, { useState } from 'react';
import { MOCK_COMPETITIONS, MOCK_CREATORS, formatCurrency, Competition } from '@/lib/constants';
import { useApp } from '@/store/AppContext';

export default function CompetitionsView() {
  const { isAuthenticated, setShowAuthModal, setAuthMode } = useApp();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'upcoming' | 'completed'>('all');
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [joinedComps, setJoinedComps] = useState<Set<string>>(new Set());
  const [voteState, setVoteState] = useState<Record<string, boolean>>({});

  const filtered = activeTab === 'all' ? MOCK_COMPETITIONS : MOCK_COMPETITIONS.filter(c => c.status === activeTab);

  const handleJoin = (compId: string) => {
    if (!isAuthenticated) { setAuthMode('register'); setShowAuthModal(true); return; }
    setJoinedComps(prev => { const next = new Set(prev); next.add(compId); return next; });
  };

  const handleVote = (entryId: string) => {
    if (!isAuthenticated) { setAuthMode('login'); setShowAuthModal(true); return; }
    setVoteState(prev => ({ ...prev, [entryId]: !prev[entryId] }));
  };

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    voting: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    completed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const leaderboard = MOCK_CREATORS.slice(0, 5).map((c, i) => ({
    rank: i + 1,
    creator: c,
    aiScore: (85 + Math.random() * 15).toFixed(1),
    publicVotes: Math.floor(1000 + Math.random() * 5000),
    totalScore: (80 + Math.random() * 20).toFixed(1),
  })).sort((a, b) => parseFloat(b.totalScore) - parseFloat(a.totalScore));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Competitions</h1>
        <p className="text-gray-400 mt-1">Compete, get scored by AI, and win prizes</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {(['all', 'active', 'upcoming', 'completed'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map(comp => (
          <div key={comp.id} className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden hover:border-indigo-500/20 transition-all group">
            <div className="relative h-40 overflow-hidden">
              <img src={comp.banner} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
              <div className="absolute top-3 right-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[comp.status]} capitalize`}>{comp.status}</span>
              </div>
              <div className="absolute bottom-3 left-3">
                <span className="text-xs text-gray-300 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">{comp.type}</span>
              </div>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-white mb-1">{comp.name}</h3>
              <p className="text-sm text-gray-400 mb-3">Sponsored by {comp.sponsor}</p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                  <p className="text-lg font-bold text-emerald-400">{formatCurrency(comp.prizePool)}</p>
                  <p className="text-[10px] text-gray-500">Prize Pool</p>
                </div>
                <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                  <p className="text-lg font-bold text-indigo-400">{comp.entries}</p>
                  <p className="text-[10px] text-gray-500">Entries</p>
                </div>
                <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                  <p className="text-lg font-bold text-white">{comp.category}</p>
                  <p className="text-[10px] text-gray-500">Category</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span>{comp.startDate} — {comp.endDate}</span>
              </div>
              <div className="flex gap-3">
                {comp.status === 'active' && !joinedComps.has(comp.id) ? (
                  <button onClick={() => handleJoin(comp.id)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition-colors">Join Competition</button>
                ) : comp.status === 'active' && joinedComps.has(comp.id) ? (
                  <button className="flex-1 bg-emerald-600/20 text-emerald-400 font-medium py-2.5 rounded-xl border border-emerald-500/30 cursor-default">Joined</button>
                ) : comp.status === 'upcoming' ? (
                  <button className="flex-1 bg-blue-600/20 text-blue-400 font-medium py-2.5 rounded-xl border border-blue-500/30 cursor-default">Coming Soon</button>
                ) : null}
                <button onClick={() => setSelectedComp(comp)} className="px-4 py-2.5 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-colors">Details</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-800">
          <h3 className="text-lg font-bold text-white">Live Leaderboard — Afrobeats Rising Stars</h3>
          <p className="text-sm text-gray-400 mt-1">AI Score (40%) + Public Votes (20%) + Engagement (20%) + Judge Score (20%)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="text-left p-4">Rank</th>
                <th className="text-left p-4">Creator</th>
                <th className="text-right p-4">AI Score</th>
                <th className="text-right p-4">Public Votes</th>
                <th className="text-right p-4">Total</th>
                <th className="text-right p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {leaderboard.map((entry, i) => (
                <tr key={entry.creator.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="p-4">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-400'}`}>
                      {entry.rank}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={entry.creator.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <p className="text-sm font-medium text-white">{entry.creator.name}</p>
                        <p className="text-xs text-gray-500">@{entry.creator.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right"><span className="text-sm font-medium text-indigo-400">{entry.aiScore}</span></td>
                  <td className="p-4 text-right"><span className="text-sm text-gray-300">{entry.publicVotes.toLocaleString()}</span></td>
                  <td className="p-4 text-right"><span className="text-sm font-bold text-white">{entry.totalScore}</span></td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleVote(entry.creator.id)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${voteState[entry.creator.id] ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                      {voteState[entry.creator.id] ? 'Voted' : 'Vote'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSelectedComp(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <img src={selectedComp.banner} alt="" className="w-full h-48 object-cover" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-white">{selectedComp.name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[selectedComp.status]} capitalize`}>{selectedComp.status}</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">Sponsored by {selectedComp.sponsor}</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Prize Pool</p>
                  <p className="text-lg font-bold text-emerald-400">{formatCurrency(selectedComp.prizePool)}</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Entries</p>
                  <p className="text-lg font-bold text-indigo-400">{selectedComp.entries}</p>
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                <h4 className="text-sm font-medium text-white mb-2">Scoring Formula</h4>
                <div className="space-y-1 text-xs text-gray-400">
                  <div className="flex justify-between"><span>AI Performance Score</span><span className="text-indigo-400">40%</span></div>
                  <div className="flex justify-between"><span>Public Votes</span><span className="text-indigo-400">20%</span></div>
                  <div className="flex justify-between"><span>Engagement Score</span><span className="text-indigo-400">20%</span></div>
                  <div className="flex justify-between"><span>Judge Score</span><span className="text-indigo-400">20%</span></div>
                </div>
              </div>
              <button onClick={() => setSelectedComp(null)} className="w-full bg-gray-800 text-gray-300 py-3 rounded-xl hover:bg-gray-700 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
