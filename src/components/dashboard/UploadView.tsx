import React, { useState, useRef } from 'react';
import { ContentType } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/store/AppContext';

export default function UploadView() {
  const { user } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<ContentType>('music');
  const [artist, setArtist] = useState('');
  const [author, setAuthor] = useState('');
  const [language, setLanguage] = useState('en');
  const [genre, setGenre] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('');
  const [distribute, setDistribute] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setUploading(true);
    setError('');

    // Simulate progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) { clearInterval(interval); return 90; }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      // Build product record for ecom_products
      const productData = {
        title,
        body_html: description,
        vendor: artist || author || user?.displayName || 'Unknown',
        product_type: contentType.charAt(0).toUpperCase() + contentType.slice(1),
        status: 'active',
        language,
        genre,
        artist: contentType === 'music' ? artist : null,
        author: contentType === 'book' ? author : null,
        audio_url: audioUrl || null,
        handle: title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
        tags: [contentType, genre, language].filter(Boolean).join(','),
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('ecom_products')
        .insert([productData]);

      if (insertError) throw insertError;

      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => { setUploading(false); setUploadComplete(true); }, 500);
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || 'Upload failed. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (uploadComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Upload Successful!</h2>
        <p className="text-gray-400 mb-6">Your content "{title}" has been published to the marketplace.</p>
        {distribute && <p className="text-sm text-indigo-400 mb-4">Distribution to platforms has been queued.</p>}
        <button onClick={() => { setUploadComplete(false); setFile(null); setTitle(''); setDescription(''); setUploadProgress(0); setArtist(''); setAuthor(''); setAudioUrl(''); setPrice(''); }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-xl transition-colors">
          Upload Another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Content</h1>
        <p className="text-gray-400 mt-1">Share your creative work with the world</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${dragOver ? 'border-indigo-500 bg-indigo-500/10' : file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-700 hover:border-gray-600 bg-gray-900/30'}`}
        >
          <input ref={fileRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} accept="audio/*,video/*,image/*,.pdf,.epub" />
          {file ? (
            <div>
              <svg className="w-12 h-12 text-emerald-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-sm text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }} className="text-sm text-red-400 hover:text-red-300 mt-2">Remove</button>
            </div>
          ) : (
            <div>
              <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <p className="text-white font-medium">Drop your file here or click to browse</p>
              <p className="text-sm text-gray-500 mt-1">Supports audio, video, images, PDF, EPUB</p>
            </div>
          )}
        </div>

        {uploading && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white">Uploading...</span>
              <span className="text-sm text-indigo-400">{Math.min(100, Math.round(uploadProgress))}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, uploadProgress)}%` }} />
            </div>
          </div>
        )}

        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter content title" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Describe your content..." />
            </div>
            {(contentType === 'music' || contentType === 'podcast') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Artist / Host Name</label>
                <input type="text" value={artist} onChange={e => setArtist(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Artist or host name" />
              </div>
            )}
            {(contentType === 'book' || contentType === 'article') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Author Name</label>
                <input type="text" value={author} onChange={e => setAuthor(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Author name" />
              </div>
            )}
            {(contentType === 'music' || contentType === 'podcast') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Audio URL (optional)</label>
                <input type="url" value={audioUrl} onChange={e => setAudioUrl(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://..." />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Content Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['music', 'video', 'podcast', 'book', 'course', 'article'] as ContentType[]).map(t => (
                  <button key={t} type="button" onClick={() => setContentType(t)} className={`py-2 px-3 rounded-lg text-xs font-medium capitalize transition-all ${contentType === t ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-indigo-500'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Genre / Category</label>
              <select value={genre} onChange={e => setGenre(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select genre</option>
                {['Afrobeats', 'Hip-Hop', 'Electronic', 'Soul', 'Jazz', 'Amapiano', 'Highlife', 'Bongo Flava', 'Gospel', 'Documentary', 'Education', 'Technology', 'Poetry', 'Travel', 'Art', 'Business'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {[
                  { code: 'en', name: 'English' }, { code: 'fr', name: 'French' }, { code: 'sw', name: 'Swahili' },
                  { code: 'yo', name: 'Yoruba' }, { code: 'ha', name: 'Hausa' }, { code: 'ig', name: 'Igbo' },
                  { code: 'zu', name: 'Zulu' }, { code: 'af', name: 'Afrikaans' }, { code: 'am', name: 'Amharic' },
                  { code: 'es', name: 'Spanish' }, { code: 'pt', name: 'Portuguese' }, { code: 'ar', name: 'Arabic' },
                ].map(l => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Monetization */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-white">Paid Content</p>
                  <p className="text-xs text-gray-400">Set a price for your content</p>
                </div>
                <button type="button" onClick={() => setIsPaid(!isPaid)} className={`w-12 h-6 rounded-full transition-colors relative ${isPaid ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isPaid ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {isPaid && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Price (USD)</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="9.99" step="0.01" min="0.99" />
                </div>
              )}
            </div>

            {/* Distribution for music */}
            {contentType === 'music' && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Auto-Distribute</p>
                    <p className="text-xs text-gray-400">Spotify, Apple Music, TikTok & 30+</p>
                  </div>
                  <button type="button" onClick={() => setDistribute(!distribute)} className={`w-12 h-6 rounded-full transition-colors relative ${distribute ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${distribute ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <button type="submit" disabled={!title || uploading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors text-lg">
          {uploading ? 'Publishing...' : 'Publish Content'}
        </button>
      </form>
    </div>
  );
}
