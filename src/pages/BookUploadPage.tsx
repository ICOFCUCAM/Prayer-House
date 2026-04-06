import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';

export default function BookUploadPage() {
  const navigate = useNavigate();
  const coverRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    author: '',
    language: 'en',
    description: '',
    genre: '',
    price: '',
    isFree: false,
    isbn: '',
    publisher: '',
    publicationYear: new Date().getFullYear().toString(),
  });

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setCoverFile(f);
      setCoverPreview(URL.createObjectURL(f));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.author) return;
    setSubmitting(true);
    setError('');

    try {
      const productData = {
        title: form.title,
        body_html: form.description,
        vendor: form.author,
        product_type: 'Book',
        status: 'active',
        handle: form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
        language: form.language,
        genre: form.genre,
        author: form.author,
        isbn: form.isbn,
        publisher: form.publisher,
        publication_year: form.publicationYear,
        price: form.isFree ? 0 : Math.round(parseFloat(form.price || '0') * 100),
        tags: ['book', form.genre, form.language].filter(Boolean).join(','),
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from('ecom_products').insert([productData]);
      if (insertError) throw insertError;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to publish book. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Book Published!</h2>
          <p className="text-gray-400 mb-6">"{form.title}" is now live in the Books collection.</p>
          <div className="flex gap-3 justify-center">
            <Link to="/collections/books" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors">View in Books</Link>
            <button onClick={() => { setSuccess(false); setForm({ title: '', author: '', language: 'en', description: '', genre: '', price: '', isFree: false, isbn: '', publisher: '', publicationYear: new Date().getFullYear().toString() }); setCoverPreview(''); setCoverFile(null); setPdfFile(null); }} className="px-5 py-2.5 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-colors">Upload Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Header />
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-12">
        <div className="mb-8">
          <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white mb-4 inline-flex items-center gap-1 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mt-2">Publish a Book</h1>
          <p className="text-gray-400 mt-1">Share your writing with readers worldwide</p>
        </div>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-8">
          {/* Cover Upload */}
          <div className="space-y-4">
            <div
              onClick={() => coverRef.current?.click()}
              className="aspect-[3/4] rounded-2xl border-2 border-dashed border-gray-700 hover:border-amber-500/50 cursor-pointer flex items-center justify-center overflow-hidden bg-gray-900/50 transition-colors"
            >
              <input ref={coverRef} type="file" className="hidden" accept="image/*" onChange={handleCoverChange} />
              {coverPreview ? (
                <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-sm text-gray-500">Upload cover image</p>
                  <p className="text-xs text-gray-600 mt-1">3:4 ratio recommended</p>
                </div>
              )}
            </div>

            {/* PDF Upload */}
            <div
              onClick={() => pdfRef.current?.click()}
              className={`p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${pdfFile ? 'border-amber-500/50 bg-amber-500/5' : 'border-gray-700 hover:border-gray-600 bg-gray-900/30'}`}
            >
              <input ref={pdfRef} type="file" className="hidden" accept=".pdf,.epub" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
              <div className="text-center">
                <svg className={`w-8 h-8 mx-auto mb-2 ${pdfFile ? 'text-amber-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-sm text-gray-400">{pdfFile ? pdfFile.name : 'Upload PDF or EPUB'}</p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="md:col-span-2 space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Book Title *</label>
                <input type="text" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Enter book title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Author Name *</label>
                <input type="text" required value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Author name" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" placeholder="Book synopsis and description..." />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Genre</label>
                <select value={form.genre} onChange={e => setForm(p => ({ ...p, genre: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">Select genre</option>
                  {['Fiction', 'Non-Fiction', 'Poetry', 'Biography', 'Business', 'Self-Help', 'Romance', 'Mystery', 'Sci-Fi', 'Fantasy', 'History', 'Philosophy', 'Education'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Language</label>
                <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                  {[{ code: 'en', name: 'English' }, { code: 'fr', name: 'French' }, { code: 'sw', name: 'Swahili' }, { code: 'yo', name: 'Yoruba' }, { code: 'ig', name: 'Igbo' }, { code: 'ha', name: 'Hausa' }, { code: 'zu', name: 'Zulu' }, { code: 'ar', name: 'Arabic' }, { code: 'pt', name: 'Portuguese' }].map(l => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Year Published</label>
                <input type="number" value={form.publicationYear} onChange={e => setForm(p => ({ ...p, publicationYear: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500" min="1900" max="2030" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">ISBN (optional)</label>
                <input type="text" value={form.isbn} onChange={e => setForm(p => ({ ...p, isbn: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="978-X-XXX-XXXXX-X" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Publisher (optional)</label>
                <input type="text" value={form.publisher} onChange={e => setForm(p => ({ ...p, publisher: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Publisher name" />
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-white">Free Book</p>
                  <p className="text-xs text-gray-400">Make this book available for free</p>
                </div>
                <button type="button" onClick={() => setForm(p => ({ ...p, isFree: !p.isFree }))} className={`w-12 h-6 rounded-full transition-colors relative ${form.isFree ? 'bg-amber-500' : 'bg-gray-700'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${form.isFree ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {!form.isFree && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Price (USD)</label>
                  <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="14.99" step="0.01" min="0.99" />
                </div>
              )}
            </div>

            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

            <button type="submit" disabled={submitting || !form.title || !form.author} className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors text-lg">
              {submitting ? 'Publishing...' : 'Publish Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
