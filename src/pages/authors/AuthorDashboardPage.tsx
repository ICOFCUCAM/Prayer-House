import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { EarningCategory } from '@/pipelines/earnings/EarningsWorker';

// ── Types ────────────────────────────────────────────────────────────────────

interface AuthorProfile {
  id: string;
  user_id: string;
  name: string;
  bio: string;
  photo_url: string;
  total_downloads: number;
  total_earnings: number;
  auto_translate: boolean;
}

interface Book {
  id: string;
  title: string;
  cover_url: string;
  price: number;
  product_type: string;
  status: string;
  created_at: string;
  downloads?: number;
}

interface Audiobook {
  id: string;
  title: string;
  cover_url: string;
  price: number;
  duration_minutes: number;
  status: string;
  created_at: string;
}

interface Earning {
  id: string;
  category: EarningCategory;
  amount: number;
  period: string;
  paid: boolean;
  created_at: string;
}

interface Translation {
  id: string;
  book_id: string;
  book_title: string;
  language: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  music_stream: 'Music Streams',
  book_sale: 'Book Sales',
  audiobook_play: 'Audiobook Plays',
  competition_win: 'Competition Wins',
  fan_vote_reward: 'Fan Vote Rewards',
  distribution_royalty: 'Distribution Royalties',
  translation_sale: 'Translation Sales',
};

const TRANSLATION_STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  processing: 'text-[#FFB800] bg-[#FFB800]/10 border-[#FFB800]/20',
  done: 'text-[#00F5A0] bg-[#00F5A0]/10 border-[#00F5A0]/20',
  failed: 'text-red-400 bg-red-400/10 border-red-400/20',
};

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// ── Create Profile Form ───────────────────────────────────────────────────────

function CreateProfileForm({ userId, onCreated }: { userId: string; onCreated: (p: AuthorProfile) => void }) {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    const { data, error: err } = await supabase
      .from('authors')
      .insert({ user_id: userId, name: name.trim(), bio: bio.trim(), total_downloads: 0, total_earnings: 0, auto_translate: false })
      .select()
      .single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    if (data) onCreated(data as AuthorProfile);
  };

  return (
    <div className="min-h-screen bg-[#0A1128]">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-20">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center text-2xl mb-6">📚</div>
          <h1 className="text-2xl font-black text-white mb-2">Create Author Profile</h1>
          <p className="text-gray-400 text-sm mb-8">Set up your profile to start publishing books and audiobooks.</p>
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Display Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#9D4EDD]/50"
                placeholder="Your author name"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#9D4EDD]/50 resize-none"
                placeholder="Tell readers about yourself..."
              />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="w-full py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white rounded-xl font-semibold disabled:opacity-40 transition-opacity"
            >
              {saving ? 'Creating…' : 'Create Profile'}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type Tab = 'books' | 'audiobooks' | 'earnings' | 'translations' | 'settings';

export default function AuthorDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('books');

  // Content state
  const [books, setBooks] = useState<Book[]>([]);
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [contentLoading, setContentLoading] = useState(false);

  // Settings
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [authLoading, user, navigate]);

  // Fetch author profile
  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    supabase
      .from('authors')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data as AuthorProfile | null);
        if (data) setAutoTranslate(data.auto_translate ?? false);
        setProfileLoading(false);
      });
  }, [user]);

  // Fetch tab-specific content
  useEffect(() => {
    if (!user || !profile) return;
    setContentLoading(true);

    if (tab === 'books') {
      supabase
        .from('ecom_products')
        .select('id, title, cover_url, price, product_type, status, created_at')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => { setBooks((data ?? []) as Book[]); setContentLoading(false); });

    } else if (tab === 'audiobooks') {
      supabase
        .from('ecom_products')
        .select('id, title, cover_url, price, product_type, status, created_at')
        .eq('author_id', user.id)
        .eq('product_type', 'Audiobook')
        .order('created_at', { ascending: false })
        .then(({ data }) => { setAudiobooks((data ?? []) as Audiobook[]); setContentLoading(false); });

    } else if (tab === 'earnings') {
      supabase
        .from('creator_earnings')
        .select('*')
        .eq('user_id', user.id)
        .order('period', { ascending: false })
        .then(({ data }) => { setEarnings((data ?? []) as Earning[]); setContentLoading(false); });

    } else if (tab === 'translations') {
      supabase
        .from('book_translations')
        .select('id, book_id, language, status, created_at, ecom_products(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          const mapped = (data ?? []).map((r: any) => ({
            id: r.id,
            book_id: r.book_id,
            book_title: r.ecom_products?.title ?? 'Unknown Book',
            language: r.language,
            status: r.status,
            created_at: r.created_at,
          }));
          setTranslations(mapped);
          setContentLoading(false);
        });

    } else {
      setContentLoading(false);
    }
  }, [tab, user, profile]);

  const handleSaveSettings = async () => {
    if (!user || !profile) return;
    setSavingSettings(true);
    await supabase
      .from('authors')
      .update({ auto_translate: autoTranslate })
      .eq('user_id', user.id);
    setSavingSettings(false);
  };

  // Earnings grouped by category
  const earningsByCategory = earnings.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});
  const totalEarnings = Object.values(earningsByCategory).reduce((s, v) => s + v, 0);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#0A1128] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (!profile) {
    return <CreateProfileForm userId={user.id} onCreated={setProfile} />;
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'books', label: 'My Books', icon: '📚' },
    { id: 'audiobooks', label: 'Audiobooks', icon: '🎧' },
    { id: 'earnings', label: 'Earnings', icon: '💰' },
    { id: 'translations', label: 'Translations', icon: '🌍' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-[#0A1128] text-white">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0A1128] via-[#100D2E] to-[#0A1128] border-b border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-5">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={profile.name} className="w-20 h-20 rounded-full object-cover border-2 border-[#9D4EDD]/40" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center text-3xl font-black text-white">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black text-white">{profile.name}</h1>
              <p className="text-gray-400 text-sm mt-0.5">Author Dashboard</p>
              <div className="flex items-center gap-5 mt-3">
                {[
                  { label: 'Downloads', value: fmt(profile.total_downloads ?? 0) },
                  { label: 'Total Earned', value: `$${(profile.total_earnings ?? 0).toFixed(2)}` },
                  { label: 'Books', value: String(books.length || '—') },
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-white font-bold text-lg">{s.value}</p>
                    <p className="text-gray-500 text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white shadow-lg shadow-purple-500/20'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {contentLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#9D4EDD] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* My Books Tab */}
            {tab === 'books' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">My Books ({books.length})</h2>
                  <button
                    onClick={() => navigate('/book-upload')}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white rounded-xl text-sm font-medium"
                  >
                    <span>+</span> Add New Book
                  </button>
                </div>
                {books.length === 0 ? (
                  <div className="text-center py-20 bg-white/3 border border-white/5 rounded-2xl">
                    <div className="text-5xl mb-4">📚</div>
                    <p className="text-gray-400 mb-4">No books published yet.</p>
                    <button
                      onClick={() => navigate('/book-upload')}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white rounded-xl text-sm font-medium"
                    >
                      Upload Your First Book
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {books.map(book => (
                      <div key={book.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group">
                        <div className="aspect-[3/4] overflow-hidden bg-white/5">
                          {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD]/30 to-[#00D9FF]/10 flex items-center justify-center text-4xl">📖</div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="font-semibold text-white text-sm truncate">{book.title}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-[#FFB800] font-bold">
                              {book.price > 0 ? `$${book.price.toFixed(2)}` : 'FREE'}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${book.status === 'active' ? 'text-[#00F5A0] border-[#00F5A0]/30 bg-[#00F5A0]/10' : 'text-gray-400 border-gray-400/20 bg-gray-400/5'}`}>
                              {book.status ?? 'draft'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Audiobooks Tab */}
            {tab === 'audiobooks' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Audiobooks ({audiobooks.length})</h2>
                  <button
                    onClick={() => navigate('/book-upload?type=audiobook')}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-white rounded-xl text-sm font-medium"
                  >
                    <span>+</span> Add Audiobook
                  </button>
                </div>
                {audiobooks.length === 0 ? (
                  <div className="text-center py-20 bg-white/3 border border-white/5 rounded-2xl">
                    <div className="text-5xl mb-4">🎧</div>
                    <p className="text-gray-400 mb-4">No audiobooks uploaded yet.</p>
                    <button
                      onClick={() => navigate('/book-upload?type=audiobook')}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-white rounded-xl text-sm font-medium"
                    >
                      Upload Audiobook
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {audiobooks.map(ab => (
                      <div key={ab.id} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all">
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                          {ab.cover_url ? (
                            <img src={ab.cover_url} alt={ab.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#FFB800]/30 to-[#FF6B00]/10 flex items-center justify-center text-2xl">🎧</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{ab.title}</p>
                          <p className="text-gray-400 text-xs mt-0.5">
                            {ab.duration_minutes ? `${ab.duration_minutes} min` : 'Duration N/A'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[#FFB800] font-bold text-sm">{ab.price > 0 ? `$${ab.price.toFixed(2)}` : 'FREE'}</p>
                          <p className="text-gray-500 text-xs capitalize">{ab.status ?? 'draft'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Earnings Tab */}
            {tab === 'earnings' && (
              <div>
                <div className="mb-8">
                  <p className="text-sm text-gray-400 mb-1">Total Earnings</p>
                  <p className="text-4xl font-black text-[#FFB800]">${totalEarnings.toFixed(2)}</p>
                </div>
                <h2 className="text-lg font-bold text-white mb-5">By Category</h2>
                <div className="space-y-3 mb-10">
                  {Object.entries(earningsByCategory).map(([cat, amount]) => {
                    const pct = totalEarnings > 0 ? (amount / totalEarnings) * 100 : 0;
                    return (
                      <div key={cat} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-white font-medium">{CATEGORY_LABELS[cat] ?? cat}</span>
                          <span className="text-[#FFB800] font-bold text-sm">${amount.toFixed(2)}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#FFB800] to-[#FF6B00] rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-gray-500 text-xs mt-1">{pct.toFixed(1)}% of total</p>
                      </div>
                    );
                  })}
                  {Object.keys(earningsByCategory).length === 0 && (
                    <div className="text-center py-16 text-gray-500">No earnings recorded yet.</div>
                  )}
                </div>
                {earnings.length > 0 && (
                  <>
                    <h2 className="text-lg font-bold text-white mb-4">Recent Transactions</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left text-gray-400 font-medium py-3 pr-4">Period</th>
                            <th className="text-left text-gray-400 font-medium py-3 pr-4">Category</th>
                            <th className="text-right text-gray-400 font-medium py-3">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {earnings.slice(0, 20).map(e => (
                            <tr key={e.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                              <td className="py-3 pr-4 text-gray-300">{e.period}</td>
                              <td className="py-3 pr-4 text-gray-300">{CATEGORY_LABELS[e.category] ?? e.category}</td>
                              <td className="py-3 text-right font-bold text-[#FFB800]">${e.amount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Translations Tab */}
            {tab === 'translations' && (
              <div>
                <h2 className="text-lg font-bold text-white mb-6">Book Translations</h2>
                {translations.length === 0 ? (
                  <div className="text-center py-20 bg-white/3 border border-white/5 rounded-2xl">
                    <div className="text-5xl mb-4">🌍</div>
                    <p className="text-gray-400">No translations yet. Enable Auto-Translate in Settings.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {translations.map(t => (
                      <div key={t.id} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F5A0]/20 to-[#00D9FF]/10 flex items-center justify-center text-xl shrink-0">🌍</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{t.book_title}</p>
                          <p className="text-gray-400 text-xs mt-0.5">→ {t.language}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${TRANSLATION_STATUS_COLORS[t.status] ?? TRANSLATION_STATUS_COLORS['pending']}`}>
                          {t.status}
                        </span>
                        <p className="text-gray-500 text-xs shrink-0">
                          {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {tab === 'settings' && (
              <div className="max-w-lg">
                <h2 className="text-lg font-bold text-white mb-6">Author Settings</h2>
                <div className="space-y-5">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white mb-1">Auto-Translate Books</p>
                        <p className="text-gray-400 text-sm">Automatically translate new books into supported languages using AI.</p>
                      </div>
                      <button
                        onClick={() => setAutoTranslate(a => !a)}
                        className={`relative w-12 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${autoTranslate ? 'bg-[#00F5A0]' : 'bg-white/10'}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoTranslate ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#00F5A0]/5 border border-[#00F5A0]/20 rounded-xl p-4 text-sm text-gray-400">
                    <p className="text-[#00F5A0] font-medium mb-1">Supported Translation Languages</p>
                    <p>French, Norwegian, Swahili, Zulu, German, Russian, Bambumbu, Luganda, Spanish, Arabic, Chinese</p>
                  </div>

                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="w-full py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white rounded-xl font-semibold disabled:opacity-40 transition-opacity"
                  >
                    {savingSettings ? 'Saving…' : 'Save Settings'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
