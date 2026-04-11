import React, { useState, useRef } from 'react';
import { Upload, Video, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UploadResult {
  entryId: string;
  videoUrl: string;
}

interface CompetitionUploaderProps {
  roomId: string;
  userId: string;
  onSuccess: (result: UploadResult) => void;
}

export function CompetitionUploader({ roomId, userId, onSuccess }: CompetitionUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile]         = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');
  const [form, setForm]         = useState({ title: '', performer_name: '', category: 'vocal' });

  const validateVideo = (f: File): string => {
    if (!['video/mp4', 'video/quicktime'].includes(f.type)) return 'Only MP4 / MOV allowed';
    if (f.size > 500 * 1024 * 1024) return 'File too large (max 500 MB)';
    return '';
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateVideo(f);
    if (err) { setError(err); return; }
    setFile(f);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');

    try {
      const path = `competition/${roomId}/${userId}_${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('competition_videos').upload(path, file);
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('competition_videos').getPublicUrl(path);

      const { data: entry, error: dbErr } = await supabase
        .from('competition_entries_v2')
        .insert([{
          room_id:        roomId,
          user_id:        userId,
          video_url:      publicUrl,
          title:          form.title,
          performer_name: form.performer_name,
          category:       form.category,
          status:         'pending_review',
        }])
        .select('id')
        .single();

      if (dbErr) throw dbErr;
      onSuccess({ entryId: entry.id, videoUrl: publicUrl });
    } catch (err: any) {
      setError(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-[#00D9FF]/40 hover:border-[#00D9FF] rounded-xl p-8 text-center cursor-pointer transition-colors"
      >
        {file ? (
          <div className="flex items-center justify-center gap-3 text-[#00D9FF]">
            <Video size={24} />
            <span className="font-medium">{file.name}</span>
            <CheckCircle size={18} className="text-[#00F5A0]" />
          </div>
        ) : (
          <>
            <Upload size={32} className="mx-auto mb-2 text-gray-400" />
            <p className="text-gray-400 text-sm">Drop video or click to browse</p>
            <p className="text-gray-500 text-xs mt-1">MP4 / MOV · Max 500 MB</p>
          </>
        )}
        <input ref={fileRef} type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={handleFile} />
      </div>

      {error && <p className="text-red-400 text-sm flex items-center gap-1"><AlertCircle size={14} />{error}</p>}

      <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        placeholder="Performance title" required
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00D9FF]" />

      <input value={form.performer_name} onChange={e => setForm(f => ({ ...f, performer_name: e.target.value }))}
        placeholder="Performer name" required
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00D9FF]" />

      <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00D9FF]">
        <option value="vocal">Vocal</option>
        <option value="instrumental">Instrumental</option>
        <option value="choir">Choir</option>
        <option value="poetry">Poetry / Spoken Word</option>
        <option value="dance">Dance</option>
      </select>

      <button type="submit" disabled={!file || uploading}
        className="w-full bg-[#00D9FF] text-black font-semibold py-3 rounded-xl hover:bg-[#00D9FF]/90 disabled:opacity-50 transition-colors">
        {uploading ? 'Uploading...' : 'Submit Entry'}
      </button>
    </form>
  );
}
