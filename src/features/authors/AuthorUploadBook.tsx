import React, { useRef, useState } from 'react';
import {
  BookOpen, Upload, FileText, ImagePlus, Globe, Tag, DollarSign,
  AlignLeft, Hash, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── AuthorUploadBook ──────────────────────────────────────────────────────────
// Upload a book: cover image + PDF, insert into ecom_products.
// Spec: title, description, price, genre, language, pages, cover image, PDF file.
// Shows per-file upload progress. Calls onSuccess(bookId) on completion.

// ── Constants ──────────────────────────────────────────────────────────────

const GENRES = [
  'Gospel', 'Fiction', 'Non-Fiction', 'Biography', 'Prayer',
  'Theology', 'Children', 'Poetry',
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'ar', label: 'Arabic' },
  { code: 'sw', label: 'Swahili' },
  { code: 'de', label: 'German' },
  { code: 'ru', label: 'Russian' },
  { code: 'zh', label: 'Chinese' },
  { code: 'yo', label: 'Yoruba' },
  { code: 'ha', label: 'Hausa' },
  { code: 'pt', label: 'Portuguese' },
];

// ── Types ──────────────────────────────────────────────────────────────────

interface AuthorUploadBookProps {
  authorId: string;
  onSuccess: (bookId: string) => void;
}

interface FormState {
  title: string;
  description: string;
  price: string;
  genre: string;
  language: string;
  pages: string;
}

const INITIAL_FORM: FormState = {
  title: '',
  description: '',
  price: '0',
  genre: 'Gospel',
  language: 'en',
  pages: '',
};

// ── Helper ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden bg-white/8">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, percent)}%`, background: color }}
      />
    </div>
  );
}

// XHR-based upload with real progress
async function xhrUpload(
  bucket: string,
  path: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token ?? '';
    const uploadUrl = `${(supabase as any).supabaseUrl}/storage/v1/object/${bucket}/${path}`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-upsert', 'true');

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));

    const form = new FormData();
    form.append('', file, file.name);
    xhr.send(form);
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export function AuthorUploadBook({ authorId, onSuccess }: AuthorUploadBookProps) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');

  // Per-file progress (0-100)
  const [coverProgress, setCoverProgress] = useState(0);
  const [pdfProgress, setPdfProgress] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Cover must be an image file.');
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverProgress(0);
    setError('');
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    setPdfProgress(0);
    setError('');
  };

  const validate = (): string => {
    if (!form.title.trim()) return 'Book title is required.';
    if (!form.description.trim()) return 'Description is required.';
    if (isNaN(Number(form.price)) || Number(form.price) < 0)
      return 'Enter a valid price (0 or more).';
    if (!pdfFile) return 'Please upload the book PDF.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSubmitting(true);
    setError('');

    try {
      const bookId = crypto.randomUUID();
      const ts = Date.now();
      const handle = `${slugify(form.title)}-${bookId.slice(0, 6)}`;

      let coverUrl: string | null = null;
      let pdfUrl: string | null = null;

      // Upload cover image to 'cover-images' bucket
      if (coverFile) {
        const coverPath = `authors/${authorId}/${ts}_cover.jpg`;
        coverUrl = await xhrUpload('cover-images', coverPath, coverFile, setCoverProgress);
      }

      // Upload PDF to 'book-pdfs' bucket
      if (pdfFile) {
        const pdfPath = `authors/${authorId}/${ts}.pdf`;
        pdfUrl = await xhrUpload('book-pdfs', pdfPath, pdfFile, setPdfProgress);
      }

      // Insert into ecom_products
      const { data: inserted, error: insertErr } = await supabase
        .from('ecom_products')
        .insert([
          {
            id: bookId,
            handle,
            title: form.title.trim(),
            description: form.description.trim(),
            price: parseFloat(Number(form.price).toFixed(2)),
            genre: form.genre,
            language: form.language,
            pages: form.pages ? parseInt(form.pages, 10) : null,
            product_type: 'Book',
            author_id: authorId,
            image_url: coverUrl,
            file_url: pdfUrl,
            // Keep cover_url for backwards compat
            cover_url: coverUrl,
          },
        ])
        .select('id')
        .single();

      if (insertErr) throw insertErr;

      setSuccess(true);
      setForm(INITIAL_FORM);
      setCoverFile(null);
      setCoverPreview('');
      setPdfFile(null);
      setCoverProgress(0);
      setPdfProgress(0);
      setTimeout(() => onSuccess(inserted?.id ?? bookId), 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-14 bg-[#0A1128] rounded-2xl border border-[#00F5A0]/30">
        <div className="w-14 h-14 rounded-full bg-[#00F5A0]/10 flex items-center justify-center">
          <BookOpen size={28} className="text-[#00F5A0]" />
        </div>
        <p className="text-[#00F5A0] font-semibold text-lg">Book published!</p>
        <p className="text-gray-400 text-sm">Your book is now live on WANKONG.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#0A1128] rounded-2xl border border-white/10 p-6 space-y-6 text-white"
    >
      <div>
        <h2 className="text-lg font-bold text-white">Upload a New Book</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Fill in the details and upload your cover image and PDF.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-[auto,1fr] gap-6">
        {/* Cover image picker */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">
            Cover Image
          </label>
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={submitting}
            className={`relative w-32 h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors overflow-hidden ${
              coverPreview
                ? 'border-[#00D9FF]/50'
                : 'border-white/10 hover:border-[#00D9FF]/40'
            }`}
          >
            {coverPreview ? (
              <img
                src={coverPreview}
                alt="Cover preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <>
                <ImagePlus size={24} className="text-gray-500" />
                <span className="text-xs text-gray-600">Add cover</span>
              </>
            )}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverChange}
            disabled={submitting}
          />
          {/* Cover progress bar */}
          {coverFile && submitting && (
            <div className="space-y-1">
              <ProgressBar percent={coverProgress} color="#00D9FF" />
              <p className="text-xs text-gray-500 text-right">{coverProgress}%</p>
            </div>
          )}
        </div>

        {/* Right column fields */}
        <div className="space-y-4">
          {/* Title */}
          <Field label="Book Title" icon={<BookOpen size={15} />}>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter book title"
              disabled={submitting}
              className={inputCls}
            />
          </Field>

          {/* Genre + Language row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Genre" icon={<Tag size={14} />}>
              <select
                name="genre"
                value={form.genre}
                onChange={handleChange}
                disabled={submitting}
                className={selectCls}
              >
                {GENRES.map((g) => (
                  <option key={g} value={g} className="bg-[#0A1128]">
                    {g}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Language" icon={<Globe size={14} />}>
              <select
                name="language"
                value={form.language}
                onChange={handleChange}
                disabled={submitting}
                className={selectCls}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-[#0A1128]">
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Price + Pages row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (USD)" icon={<DollarSign size={14} />}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  $
                </span>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  disabled={submitting}
                  className={`${inputCls} pl-7`}
                />
              </div>
            </Field>

            <Field label="Pages" icon={<Hash size={14} />}>
              <input
                type="number"
                name="pages"
                value={form.pages}
                onChange={handleChange}
                min="1"
                placeholder="e.g. 256"
                disabled={submitting}
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Description */}
      <Field label="Description" icon={<AlignLeft size={14} />}>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={4}
          placeholder="Write a compelling description for your book..."
          disabled={submitting}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/60 transition-colors resize-none disabled:opacity-50"
        />
      </Field>

      {/* PDF upload */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">
          Book PDF <span className="text-red-400">*</span>
        </label>
        <button
          type="button"
          onClick={() => pdfInputRef.current?.click()}
          disabled={submitting}
          className={`w-full flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-4 transition-colors ${
            pdfFile
              ? 'border-[#00D9FF]/40 bg-[#00D9FF]/5'
              : 'border-white/10 hover:border-[#00D9FF]/30'
          } disabled:opacity-50`}
        >
          {pdfFile ? (
            <>
              <FileText size={20} className="text-[#00D9FF] shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-sm font-medium text-[#00D9FF] truncate">{pdfFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload size={20} className="text-gray-500 shrink-0" />
              <div className="text-left">
                <p className="text-sm text-gray-400">Click to select PDF</p>
                <p className="text-xs text-gray-600">Maximum file size: 100 MB</p>
              </div>
            </>
          )}
        </button>
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handlePdfChange}
          disabled={submitting}
        />
        {/* PDF progress bar */}
        {pdfFile && submitting && (
          <div className="space-y-1 pt-1">
            <ProgressBar percent={pdfProgress} color="#9D4EDD" />
            <p className="text-xs text-gray-500 text-right">{pdfProgress}%</p>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-[#00D9FF] hover:bg-[#00D9FF]/85 disabled:opacity-50 disabled:cursor-not-allowed text-[#0A1128] font-semibold py-3 px-6 rounded-xl transition-all active:scale-[0.98]"
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Publishing…
          </>
        ) : (
          <>
            <Upload size={16} />
            Publish Book
          </>
        )}
      </button>
    </form>
  );
}

// ── Reusable field wrapper ─────────────────────────────────────────────────

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/60 transition-colors disabled:opacity-50';

const selectCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#00D9FF]/60 transition-colors appearance-none disabled:opacity-50';

export default AuthorUploadBook;
