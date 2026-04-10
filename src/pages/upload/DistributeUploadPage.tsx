import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import RoyaltySplitEditor, { type Split } from '@/components/distribution/RoyaltySplitEditor';
import {
  Music, ImageIcon, Upload, ChevronRight, Globe, DollarSign,
  CheckCircle, Loader2, AlertCircle,
} from 'lucide-react';

// ── constants ────────────────────────────────────────────────────────────────
const PLATFORMS = [
  { key: 'spotify',       label: 'Spotify'         },
  { key: 'apple_music',   label: 'Apple Music'     },
  { key: 'tiktok',        label: 'TikTok'          },
  { key: 'youtube_music', label: 'YouTube Music'   },
  { key: 'boomplay',      label: 'Boomplay'        },
  { key: 'audiomack',     label: 'Audiomack'       },
  { key: 'instagram',     label: 'Instagram Reels' },
  { key: 'facebook',      label: 'Facebook Music'  },
  { key: 'amazon',        label: 'Amazon Music'    },
  { key: 'deezer',        label: 'Deezer'          },
];

const GENRES    = ['Gospel','Afrobeats','Hip-Hop','RnB','Jazz','EDM','Classical','Reggae','Highlife','Blues','Pop','Rock'];
const LANGUAGES = [
  'English','French','Spanish','Arabic','Swahili',
  'Yoruba','Igbo','Hausa','Zulu','Portuguese',
];
const STEPS = ['Upload', 'Metadata', 'Platforms', 'Royalties', 'Confirm'];

const inputCls   = "w-full bg-[#0A1128] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]/40 focus:border-[#9D4EDD]/40 transition-colors";
const selectCls  = inputCls + " cursor-pointer";

// ── helper ────────────────────────────────────────────────────────────────────
function validateAudioFormat(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ['wav', 'flac', 'mp3'].includes(ext ?? '');
}

// ── component ─────────────────────────────────────────────────────────────────
export default function DistributeUploadPage() {
  const navigate  = useNavigate();
  const audioRef  = useRef<HTMLInputElement>(null);
  const artRef    = useRef<HTMLInputElement>(null);

  const [step, setStep]           = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]      = useState(false);
  const [error,      setError]     = useState('');

  // Step 1 — track files
  const [audioFile,    setAudioFile]    = useState<File | null>(null);
  const [artFile,      setArtFile]      = useState<File | null>(null);
  const [artPreview,   setArtPreview]   = useState('');
  const [track, setTrack] = useState({
    title: '', artist_name: '', genre: '', language: 'English', explicit: false,
  });

  // Step 2 — metadata
  const [meta, setMeta] = useState({
    release_type: 'single' as 'single' | 'ep' | 'album',
    release_date: '',
    copyright_owner: 'WANKONG Records',
    composer: '',
    producer: '',
    label_name: 'WANKONG Records',
  });

  // Step 3 — platforms
  const [platforms, setPlatforms] = useState<Record<string, boolean>>({
    spotify: true, apple_music: true, tiktok: true, youtube_music: true,
    boomplay: true, audiomack: true, instagram: true,
    facebook: true, amazon: true, deezer: true,
  });
  const allSelected = Object.values(platforms).every(Boolean);

  // Step 4 — royalty splits
  const [splits, setSplits] = useState<Split[]>([
    { id: '1', role: 'artist',   label: track.artist_name, percentage: 70 },
    { id: '2', role: 'platform', label: 'WANKONG',          percentage: 30 },
  ]);
  const splitsTotal = splits.reduce((s, r) => s + r.percentage, 0);
  const splitsValid = Math.abs(splitsTotal - 100) < 0.01;

  // ── upload & submit ─────────────────────────────────────────────────────────
  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload audio
      let audioUrl = '';
      if (audioFile) {
        const path = `${user.id}/${Date.now()}_${audioFile.name}`;
        const { error: upErr } = await supabase.storage.from('music_uploads').upload(path, audioFile);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('music_uploads').getPublicUrl(path);
        audioUrl = publicUrl;
      }

      // Upload artwork
      let artworkUrl = '';
      if (artFile) {
        const path = `${user.id}/${Date.now()}_${artFile.name}`;
        const { error: upErr } = await supabase.storage.from('cover_artworks').upload(path, artFile);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('cover_artworks').getPublicUrl(path);
        artworkUrl = publicUrl;
      }

      // Insert track
      const { data: trackRow, error: trackErr } = await supabase
        .from('tracks')
        .insert([{
          artist_id:   user.id,
          title:       track.title,
          genre:       track.genre,
          language:    track.language,
          explicit:    track.explicit,
          audio_url:   audioUrl,
          artwork_url: artworkUrl,
          status:      'pending_review',
        }])
        .select()
        .single();
      if (trackErr) throw trackErr;

      // Insert release_metadata
      await supabase.from('release_metadata').insert([{
        track_id: trackRow.id, ...meta,
      }]);

      // Insert distribution_targets
      await supabase.from('distribution_targets').insert([{
        track_id: trackRow.id, ...platforms,
      }]);

      // Insert royalty_splits
      await supabase.from('royalty_splits').insert(
        splits.map(s => ({
          track_id:     trackRow.id,
          role:         s.role,
          label:        s.label,
          percentage:   s.percentage,
          recipient_id: null,
        }))
      );

      // Insert distribution_releases
      await supabase.from('distribution_releases').insert([{
        track_id:     trackRow.id,
        status:       'pending_admin_review',
        submitted_at: new Date().toISOString(),
      }]);

      setDone(true);
    } catch (err: any) {
      setError(err.message ?? 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── success screen ──────────────────────────────────────────────────────────
  if (done) return (
    <div className="min-h-screen bg-[#0A1128] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-[#00F5A0]/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-[#00F5A0]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Submitted for Review</h2>
        <p className="text-gray-400 text-sm mb-6">
          "<span className="text-white">{track.title}</span>" is pending admin approval before distribution.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/dashboard" className="px-5 py-2.5 bg-[#9D4EDD] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity">Dashboard</Link>
          <button onClick={() => { setDone(false); setStep(0); }} className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors">Upload Another</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A1128]">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-8">
          <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-300">Distribute Music</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                i === step ? 'bg-[#9D4EDD] text-white' :
                i < step  ? 'bg-[#9D4EDD]/20 text-[#9D4EDD]' :
                             'bg-white/5 text-gray-500'
              }`}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black bg-white/10">
                  {i < step ? '✓' : i + 1}
                </span>
                {s}
              </div>
              {i < STEPS.length - 1 && <div className="h-px w-6 bg-white/10 shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* ── STEP 0 — Upload ──────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Upload Your Track</h2>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Artwork */}
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Cover Artwork</p>
                <div
                  onClick={() => artRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-[#9D4EDD]/40 cursor-pointer overflow-hidden bg-[#0D1B3E] flex items-center justify-center transition-colors group"
                >
                  <input ref={artRef} type="file" className="hidden" accept="image/*"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { setArtFile(f); setArtPreview(URL.createObjectURL(f)); }
                    }}
                  />
                  {artPreview
                    ? <img src={artPreview} alt="" className="w-full h-full object-cover" />
                    : <div className="text-center p-4">
                        <ImageIcon className="w-8 h-8 text-gray-600 mx-auto mb-2 group-hover:text-[#9D4EDD]/60 transition-colors" />
                        <p className="text-xs text-gray-500">Upload artwork</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">3000×3000px recommended</p>
                      </div>}
                </div>
              </div>

              {/* Audio */}
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Audio File</p>
                <div
                  onClick={() => audioRef.current?.click()}
                  className={`h-full min-h-[160px] rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center p-6 transition-colors ${
                    audioFile ? 'border-[#00D9FF]/40 bg-[#00D9FF]/5' : 'border-white/10 hover:border-white/20 bg-[#0D1B3E]'
                  }`}
                >
                  <input ref={audioRef} type="file" className="hidden" accept=".wav,.flac,.mp3"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (!validateAudioFormat(f)) {
                        setError('Only WAV, FLAC, or MP3 files are accepted.');
                        return;
                      }
                      setError('');
                      setAudioFile(f);
                    }}
                  />
                  <Music className={`w-8 h-8 mb-2 ${audioFile ? 'text-[#00D9FF]' : 'text-gray-600'}`} />
                  {audioFile
                    ? <><p className="text-white text-sm font-semibold text-center">{audioFile.name}</p>
                        <p className="text-gray-500 text-xs mt-1">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</p></>
                    : <><p className="text-gray-400 text-sm">Click to upload</p>
                        <div className="flex gap-1.5 mt-2">
                          {['WAV','FLAC','MP3'].map(f => <span key={f} className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-white/5 text-gray-500">{f}</span>)}
                        </div></>}
                </div>
              </div>
            </div>

            {/* Track fields */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Track Title *</label>
                <input type="text" required value={track.title}
                  onChange={e => setTrack(p => ({ ...p, title: e.target.value }))}
                  className={inputCls} placeholder="Track title" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Artist Name *</label>
                <input type="text" required value={track.artist_name}
                  onChange={e => setTrack(p => ({ ...p, artist_name: e.target.value }))}
                  className={inputCls} placeholder="Your artist name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Genre</label>
                <select value={track.genre} onChange={e => setTrack(p => ({ ...p, genre: e.target.value }))} className={selectCls}>
                  <option value="">Select genre</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Language</label>
                <select value={track.language} onChange={e => setTrack(p => ({ ...p, language: e.target.value }))} className={selectCls}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#0D1B3E] border border-white/10 rounded-xl">
              <div>
                <p className="text-white font-medium text-sm">Explicit Content</p>
                <p className="text-gray-500 text-xs">Contains strong language or adult themes</p>
              </div>
              <button type="button" onClick={() => setTrack(p => ({ ...p, explicit: !p.explicit }))}
                className={`w-12 h-6 rounded-full transition-colors relative ${track.explicit ? 'bg-red-500' : 'bg-gray-700'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform ${track.explicit ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <button onClick={() => setStep(1)}
              disabled={!track.title || !track.artist_name || !audioFile}
              className="w-full py-3.5 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              Next: Release Metadata <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── STEP 1 — Metadata ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Release Metadata</h2>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Release Type</label>
              <div className="grid grid-cols-3 gap-3">
                {(['single','ep','album'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setMeta(p => ({ ...p, release_type: t }))}
                    className={`py-3 rounded-xl text-sm font-semibold capitalize border transition-all ${
                      meta.release_type === t
                        ? 'bg-[#9D4EDD] border-[#9D4EDD] text-white'
                        : 'bg-[#0D1B3E] border-white/10 text-gray-400 hover:border-white/20'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Release Date</label>
                <input type="date" value={meta.release_date}
                  onChange={e => setMeta(p => ({ ...p, release_date: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Copyright Owner</label>
                <input type="text" value={meta.copyright_owner}
                  onChange={e => setMeta(p => ({ ...p, copyright_owner: e.target.value }))}
                  className={inputCls} placeholder="© Owner name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Composer</label>
                <input type="text" value={meta.composer}
                  onChange={e => setMeta(p => ({ ...p, composer: e.target.value }))}
                  className={inputCls} placeholder="Composer name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Producer</label>
                <input type="text" value={meta.producer}
                  onChange={e => setMeta(p => ({ ...p, producer: e.target.value }))}
                  className={inputCls} placeholder="Producer name" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Label Name</label>
                <input type="text" value={meta.label_name}
                  onChange={e => setMeta(p => ({ ...p, label_name: e.target.value }))}
                  className={inputCls} />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="px-6 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors">Back</button>
              <button onClick={() => setStep(2)} className="flex-1 py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                Next: Platform Targets <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 — Platforms ──────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Distribution Targets</h2>

            {/* Select all toggle */}
            <div className="flex items-center justify-between p-4 bg-[#0D1B3E] border border-white/10 rounded-xl">
              <div>
                <p className="text-white font-semibold text-sm">Distribute to All Platforms</p>
                <p className="text-gray-500 text-xs">Reach every supported DSP at once</p>
              </div>
              <button type="button"
                onClick={() => setPlatforms(prev => Object.fromEntries(Object.keys(prev).map(k => [k, !allSelected])))}
                className={`w-12 h-6 rounded-full transition-colors relative ${allSelected ? 'bg-[#00D9FF]' : 'bg-gray-700'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform ${allSelected ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map(p => (
                <button key={p.key} type="button"
                  onClick={() => setPlatforms(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    platforms[p.key]
                      ? 'bg-[#9D4EDD]/10 border-[#9D4EDD]/40 text-white'
                      : 'bg-[#0D1B3E] border-white/10 text-gray-400 hover:border-white/20'
                  }`}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${platforms[p.key] ? 'bg-[#9D4EDD]' : 'bg-white/10'}`}>
                    {platforms[p.key] && <span className="text-white text-[10px] font-black">✓</span>}
                  </div>
                  <span className="text-sm font-medium">{p.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-6 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors">Back</button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                Next: Royalty Splits <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — Royalties ──────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Royalty Splits</h2>
            <p className="text-gray-400 text-sm">Default: 70% artist, 30% platform. Add collaborators below.</p>

            <div className="p-5 bg-[#0D1B3E] border border-white/10 rounded-2xl">
              <RoyaltySplitEditor
                splits={splits}
                onChange={s => {
                  const updated = s.map(r =>
                    r.role === 'artist' && r.label === '' ? { ...r, label: track.artist_name } : r
                  );
                  setSplits(updated);
                }}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors">Back</button>
              <button onClick={() => setStep(4)} disabled={!splitsValid}
                className="flex-1 py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                Next: Confirm <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4 — Confirm ──────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white">Confirm & Submit</h2>

            <div className="bg-[#0D1B3E] border border-white/10 rounded-2xl p-5 space-y-4">
              {artPreview && (
                <img src={artPreview} alt="Artwork" className="w-28 h-28 rounded-xl object-cover" />
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500 text-xs">Track</p><p className="text-white font-semibold">{track.title}</p></div>
                <div><p className="text-gray-500 text-xs">Artist</p><p className="text-white font-semibold">{track.artist_name}</p></div>
                <div><p className="text-gray-500 text-xs">Genre</p><p className="text-white">{track.genre}</p></div>
                <div><p className="text-gray-500 text-xs">Type</p><p className="text-white capitalize">{meta.release_type}</p></div>
                <div><p className="text-gray-500 text-xs">Release Date</p><p className="text-white">{meta.release_date || 'Immediate'}</p></div>
                <div><p className="text-gray-500 text-xs">Label</p><p className="text-white">{meta.label_name}</p></div>
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-2">Platforms</p>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORMS.filter(p => platforms[p.key]).map(p => (
                    <span key={p.key} className="px-2 py-0.5 text-xs bg-[#9D4EDD]/20 text-[#9D4EDD] rounded-full">{p.label}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-gray-500 text-xs mb-2">Royalty Splits</p>
                <div className="space-y-1">
                  {splits.map(s => (
                    <div key={s.id} className="flex justify-between text-xs">
                      <span className="text-gray-400 capitalize">{s.role.replace('_', ' ')} {s.label && `· ${s.label}`}</span>
                      <span className="text-white font-semibold">{s.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="px-6 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors">Back</button>
              <button onClick={submit} disabled={submitting}
                className="flex-1 py-3.5 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-black font-bold rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><Globe className="w-4 h-4" /> Distribute Worldwide</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
