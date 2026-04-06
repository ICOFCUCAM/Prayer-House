import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';

export default function SettingsView() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<'profile' | 'payments' | 'security' | 'notifications'>('profile');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState('Afrobeats artist from Lagos, creating music that moves the world.');
  const [country, setCountry] = useState(user?.country || 'NG');
  const [language, setLanguage] = useState('en');
  const [saved, setSaved] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ payments: true, subscriptions: true, competitions: true, content: true, marketing: false, system: true });

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const tabs = [
    { id: 'profile' as const, label: 'Profile' },
    { id: 'payments' as const, label: 'Payment Methods' },
    { id: 'security' as const, label: 'Security & KYC' },
    { id: 'notifications' as const, label: 'Notifications' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-4">
            <img src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.displayName}`} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500" />
            <div>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Change Avatar</button>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG. Max 5MB</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Display Name</label>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Username</label>
              <input type="text" value={user?.username} readOnly className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Country</label>
              <select value={country} onChange={e => setCountry(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {[{ code: 'NG', name: 'Nigeria' }, { code: 'KE', name: 'Kenya' }, { code: 'GH', name: 'Ghana' }, { code: 'ZA', name: 'South Africa' }, { code: 'US', name: 'United States' }, { code: 'UK', name: 'United Kingdom' }].map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="en">English</option><option value="fr">French</option><option value="sw">Swahili</option><option value="yo">Yoruba</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
          <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-xl transition-colors">
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Connected Payment Methods</h3>
          <div className="space-y-3">
            {[
              { method: 'Stripe Connect', status: 'Connected', detail: 'acct_1234...', color: 'emerald' },
              { method: 'M-Pesa', status: 'Connected', detail: '+254 7XX XXX XXX', color: 'emerald' },
              { method: 'MTN MoMo', status: 'Not Connected', detail: 'Click to connect', color: 'gray' },
              { method: 'Paystack', status: 'Not Connected', detail: 'Click to connect', color: 'gray' },
            ].map(pm => (
              <div key={pm.method} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-white">{pm.method}</p>
                  <p className="text-xs text-gray-400">{pm.detail}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${pm.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
                  {pm.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">KYC Verification</h3>
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/20">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Verified</p>
                  <p className="text-xs text-gray-400">Your identity has been verified via Stripe</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">Security</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors">
                <div><p className="text-sm font-medium text-white">Change Password</p><p className="text-xs text-gray-400">Last changed 30 days ago</p></div>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors">
                <div><p className="text-sm font-medium text-white">Two-Factor Authentication</p><p className="text-xs text-emerald-400">Enabled</p></div>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Notification Preferences</h3>
          <div className="space-y-4">
            {Object.entries(notifPrefs).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white capitalize">{key}</p>
                  <p className="text-xs text-gray-400">Receive {key} notifications</p>
                </div>
                <button onClick={() => setNotifPrefs(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))} className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
