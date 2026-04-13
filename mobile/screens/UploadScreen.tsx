import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────────

type ModalType =
  | 'track'
  | 'album'
  | 'competition'
  | 'book'
  | 'audiobookChapter'
  | null;

const GENRES = ['Pop', 'Afrobeats', 'Hip-Hop', 'R&B', 'Gospel', 'Jazz', 'Classical', 'Reggae', 'Dancehall', 'Electronic', 'Folk', 'Country', 'Other'];
const CATEGORIES = ['Singing', 'Rap', 'Dance', 'Comedy', 'Spoken Word', 'Instrumental', 'Drama', 'Poetry', 'Other'];
const LANGUAGES = ['EN', 'FR', 'ES', 'AR', 'SW', 'DE', 'NO', 'SV', 'PT', 'RU', 'ZH', 'JA', 'YO', 'IG', 'HA', 'PID'];

// ── Helpers ────────────────────────────────────────────────────────────────────

async function uploadFileToStorage(
  bucket: string,
  path: string,
  uri: string,
  mimeType: string
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: mimeType, upsert: true });
  if (error) throw new Error(error.message);
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

function PickerRow({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setOpen(!open)}>
        <Text style={styles.pickerBtnText}>{value || `Select ${label}`}</Text>
        <Text style={styles.pickerArrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.pickerDropdown}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.pickerOption, value === opt && styles.pickerOptionActive]}
              onPress={() => { onSelect(opt); setOpen(false); }}
            >
              <Text style={[styles.pickerOptionText, value === opt && { color: '#00D9FF' }]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Track Upload Modal ─────────────────────────────────────────────────────────

function TrackUploadModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setFileUri(result.assets[0].uri);
      setFileName(result.assets[0].name ?? 'audio');
    }
  };

  const handleSubmit = async () => {
    if (!user) { Alert.alert('Not logged in'); return; }
    if (!title.trim()) { Alert.alert('Title required'); return; }
    if (!fileUri) { Alert.alert('Please select an audio file'); return; }

    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}_${fileName}`;
      const audioUrl = await uploadFileToStorage('music_uploads', path, fileUri, 'audio/mpeg');
      const { error } = await supabase.from('tracks').insert({
        user_id: user.id,
        title: title.trim(),
        genre: genre || null,
        audio_url: audioUrl,
        stream_count: 0,
      });
      if (error) throw error;
      Alert.alert('Success', 'Track uploaded successfully!');
      onClose();
      setTitle(''); setGenre(''); setFileUri(null); setFileName('');
    } catch (err: unknown) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>🎵 Upload Track</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Track title"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
          </View>
          <PickerRow label="Genre" value={genre} options={GENRES} onSelect={setGenre} />
          <TouchableOpacity style={styles.filePickBtn} onPress={pickFile}>
            <Text style={styles.filePickBtnText}>
              {fileUri ? `✓ ${fileName}` : '📂 Select Audio File'}
            </Text>
          </TouchableOpacity>
          {uploading && <ActivityIndicator color="#00D9FF" style={{ marginVertical: 12 }} />}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={uploading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={uploading}>
              <Text style={styles.submitBtnText}>{uploading ? 'Uploading…' : 'Upload'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Album Upload Modal ─────────────────────────────────────────────────────────

function AlbumUploadModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [albumTitle, setAlbumTitle] = useState('');
  const [artworkUri, setArtworkUri] = useState<string | null>(null);
  const [tracks, setTracks] = useState<{ title: string; uri: string | null; name: string }[]>([
    { title: '', uri: null, name: '' },
  ]);
  const [uploading, setUploading] = useState(false);

  const pickArtwork = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setArtworkUri(result.assets[0].uri);
    }
  };

  const pickTrackFile = async (index: number) => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.[0]) {
      setTracks((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], uri: result.assets[0].uri, name: result.assets[0].name ?? 'audio' };
        return next;
      });
    }
  };

  const addTrack = () => {
    if (tracks.length < 10) {
      setTracks((prev) => [...prev, { title: '', uri: null, name: '' }]);
    }
  };

  const handleSubmit = async () => {
    if (!user) { Alert.alert('Not logged in'); return; }
    if (!albumTitle.trim()) { Alert.alert('Album title required'); return; }
    setUploading(true);
    try {
      let artworkUrl: string | undefined;
      if (artworkUri) {
        artworkUrl = await uploadFileToStorage(
          'album_artwork',
          `${user.id}/${Date.now()}_artwork.jpg`,
          artworkUri,
          'image/jpeg'
        );
      }
      const { error } = await supabase.from('distribution_releases').insert({
        user_id: user.id,
        title: albumTitle.trim(),
        release_type: 'album',
        cover_url: artworkUrl ?? null,
        status: 'pending',
      });
      if (error) throw error;
      Alert.alert('Success', 'Album submitted for distribution!');
      onClose();
      setAlbumTitle(''); setArtworkUri(null); setTracks([{ title: '', uri: null, name: '' }]);
    } catch (err: unknown) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ScrollView contentContainerStyle={styles.modalSheetScroll}>
          <Text style={styles.modalTitle}>💿 Upload Album</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Album Title *</Text>
            <TextInput style={styles.input} value={albumTitle} onChangeText={setAlbumTitle}
              placeholder="Album title" placeholderTextColor="rgba(255,255,255,0.3)" />
          </View>
          <TouchableOpacity style={styles.filePickBtn} onPress={pickArtwork}>
            <Text style={styles.filePickBtnText}>{artworkUri ? '✓ Artwork selected' : '🖼 Select Artwork'}</Text>
          </TouchableOpacity>
          <Text style={styles.fieldLabel}>Tracks ({tracks.length}/10)</Text>
          {tracks.map((track, idx) => (
            <View key={idx} style={styles.albumTrackRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                value={track.title}
                onChangeText={(v) => setTracks((prev) => { const n = [...prev]; n[idx] = { ...n[idx], title: v }; return n; })}
                placeholder={`Track ${idx + 1} title`}
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <TouchableOpacity style={styles.miniPickBtn} onPress={() => pickTrackFile(idx)}>
                <Text style={styles.miniPickBtnText}>{track.uri ? '✓' : '📂'}</Text>
              </TouchableOpacity>
            </View>
          ))}
          {tracks.length < 10 && (
            <TouchableOpacity style={styles.addTrackBtn} onPress={addTrack}>
              <Text style={styles.addTrackBtnText}>+ Add Track</Text>
            </TouchableOpacity>
          )}
          {uploading && <ActivityIndicator color="#00D9FF" style={{ marginVertical: 12 }} />}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={uploading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={uploading}>
              <Text style={styles.submitBtnText}>{uploading ? 'Uploading…' : 'Submit'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Competition Upload Modal ───────────────────────────────────────────────────

function CompetitionUploadModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [performerName, setPerformerName] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.[0]) {
      setFileUri(result.assets[0].uri);
      setFileName(result.assets[0].name ?? 'video');
    }
  };

  const handleSubmit = async () => {
    if (!user) { Alert.alert('Not logged in'); return; }
    if (!title.trim()) { Alert.alert('Title required'); return; }
    if (!fileUri) { Alert.alert('Please select a video file'); return; }
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}_${fileName}`;
      const videoUrl = await uploadFileToStorage('competition_videos', path, fileUri, 'video/mp4');
      const { error } = await supabase.from('competition_entries_v2').insert({
        user_id: user.id,
        title: title.trim(),
        performer_name: performerName.trim() || null,
        category: category || null,
        language: language || null,
        video_url: videoUrl,
        votes_count: 0,
        status: 'pending',
      });
      if (error) throw error;
      Alert.alert('Success', 'Competition entry submitted!');
      onClose();
      setTitle(''); setPerformerName(''); setCategory(''); setLanguage(''); setFileUri(null); setFileName('');
    } catch (err: unknown) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ScrollView contentContainerStyle={styles.modalSheetScroll}>
          <Text style={styles.modalTitle}>🎭 Competition Entry</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Entry Title *</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle}
              placeholder="Entry title" placeholderTextColor="rgba(255,255,255,0.3)" />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Performer Name</Text>
            <TextInput style={styles.input} value={performerName} onChangeText={setPerformerName}
              placeholder="Your name or stage name" placeholderTextColor="rgba(255,255,255,0.3)" />
          </View>
          <PickerRow label="Category" value={category} options={CATEGORIES} onSelect={setCategory} />
          <PickerRow label="Language" value={language} options={LANGUAGES} onSelect={setLanguage} />
          <TouchableOpacity style={styles.filePickBtn} onPress={pickVideo}>
            <Text style={styles.filePickBtnText}>{fileUri ? `✓ ${fileName}` : '🎬 Select Video File'}</Text>
          </TouchableOpacity>
          {uploading && <ActivityIndicator color="#00D9FF" style={{ marginVertical: 12 }} />}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={uploading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={uploading}>
              <Text style={styles.submitBtnText}>{uploading ? 'Uploading…' : 'Submit'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Book Upload Modal ──────────────────────────────────────────────────────────

function BookUploadModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [genre, setGenre] = useState('');
  const [language, setLanguage] = useState('');
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState('');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.[0]) {
      setPdfUri(result.assets[0].uri);
      setPdfName(result.assets[0].name ?? 'book.pdf');
    }
  };

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!user) { Alert.alert('Not logged in'); return; }
    if (!title.trim()) { Alert.alert('Title required'); return; }
    if (!pdfUri) { Alert.alert('Please select a PDF file'); return; }
    setUploading(true);
    try {
      const pdfUrl = await uploadFileToStorage('book_files', `${user.id}/${Date.now()}_${pdfName}`, pdfUri, 'application/pdf');
      let imageUrl: string | undefined;
      if (coverUri) {
        imageUrl = await uploadFileToStorage('book_covers', `${user.id}/${Date.now()}_cover.jpg`, coverUri, 'image/jpeg');
      }
      const { error } = await supabase.from('ecom_products').insert({
        vendor_id: user.id,
        creator_id: user.id,
        title: title.trim(),
        price: Math.round((parseFloat(price) || 0) * 100),
        genre: genre || null,
        language: language || null,
        cover_image_url: imageUrl ?? null,
        product_type: 'Book',
        status: 'pending',
      });
      if (error) throw error;
      Alert.alert('Success', 'Book uploaded!');
      onClose();
      setTitle(''); setPrice(''); setGenre(''); setLanguage(''); setPdfUri(null); setPdfName(''); setCoverUri(null);
    } catch (err: unknown) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ScrollView contentContainerStyle={styles.modalSheetScroll}>
          <Text style={styles.modalTitle}>📚 Upload Book</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle}
              placeholder="Book title" placeholderTextColor="rgba(255,255,255,0.3)" />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Price (USD)</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice}
              placeholder="9.99" keyboardType="decimal-pad" placeholderTextColor="rgba(255,255,255,0.3)" />
          </View>
          <PickerRow label="Genre" value={genre} options={GENRES} onSelect={setGenre} />
          <PickerRow label="Language" value={language} options={LANGUAGES} onSelect={setLanguage} />
          <TouchableOpacity style={styles.filePickBtn} onPress={pickPdf}>
            <Text style={styles.filePickBtnText}>{pdfUri ? `✓ ${pdfName}` : '📄 Select PDF File'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filePickBtn} onPress={pickCover}>
            <Text style={styles.filePickBtnText}>{coverUri ? '✓ Cover selected' : '🖼 Select Cover Image'}</Text>
          </TouchableOpacity>
          {uploading && <ActivityIndicator color="#00D9FF" style={{ marginVertical: 12 }} />}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={uploading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={uploading}>
              <Text style={styles.submitBtnText}>{uploading ? 'Uploading…' : 'Publish'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Audiobook Chapter Modal ────────────────────────────────────────────────────

function AudiobookChapterModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [audiobookId, setAudiobookId] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterNum, setChapterNum] = useState('');
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.[0]) {
      setFileUri(result.assets[0].uri);
      setFileName(result.assets[0].name ?? 'chapter');
    }
  };

  const handleSubmit = async () => {
    if (!user) { Alert.alert('Not logged in'); return; }
    if (!chapterTitle.trim()) { Alert.alert('Chapter title required'); return; }
    if (!audiobookId.trim()) { Alert.alert('Audiobook ID required'); return; }
    if (!fileUri) { Alert.alert('Please select an audio file'); return; }
    setUploading(true);
    try {
      const path = `${audiobookId}/${Date.now()}_${fileName}`;
      const audioUrl = await uploadFileToStorage('audiobook-audio', path, fileUri, 'audio/mpeg');
      const { error } = await supabase.from('audiobook_chapters').insert({
        audiobook_id: audiobookId.trim(),
        title: chapterTitle.trim(),
        chapter_num: parseInt(chapterNum, 10) || 1,
        audio_url: audioUrl,
        duration_s: 0,
      });
      if (error) throw error;
      Alert.alert('Success', 'Chapter uploaded!');
      onClose();
      setAudiobookId(''); setChapterTitle(''); setChapterNum(''); setFileUri(null); setFileName('');
    } catch (err: unknown) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ScrollView contentContainerStyle={styles.modalSheetScroll}>
          <Text style={styles.modalTitle}>🎧 Upload Audiobook Chapter</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Audiobook ID *</Text>
            <TextInput style={styles.input} value={audiobookId} onChangeText={setAudiobookId}
              placeholder="Audiobook UUID" placeholderTextColor="rgba(255,255,255,0.3)" />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Chapter Title *</Text>
            <TextInput style={styles.input} value={chapterTitle} onChangeText={setChapterTitle}
              placeholder="Chapter title" placeholderTextColor="rgba(255,255,255,0.3)" />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Chapter Number</Text>
            <TextInput style={styles.input} value={chapterNum} onChangeText={setChapterNum}
              placeholder="1" keyboardType="number-pad" placeholderTextColor="rgba(255,255,255,0.3)" />
          </View>
          <TouchableOpacity style={styles.filePickBtn} onPress={pickAudio}>
            <Text style={styles.filePickBtnText}>{fileUri ? `✓ ${fileName}` : '📂 Select Audio File'}</Text>
          </TouchableOpacity>
          {uploading && <ActivityIndicator color="#00D9FF" style={{ marginVertical: 12 }} />}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={uploading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={uploading}>
              <Text style={styles.submitBtnText}>{uploading ? 'Uploading…' : 'Upload'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Upload Option Card ─────────────────────────────────────────────────────────

const UPLOAD_OPTIONS = [
  { id: 'track' as ModalType, emoji: '🎵', title: 'Upload Track', subtitle: 'MP3, WAV, FLAC', color: '#00D9FF' },
  { id: 'album' as ModalType, emoji: '💿', title: 'Upload Album', subtitle: 'Up to 10 tracks', color: '#9D4EDD' },
  { id: 'competition' as ModalType, emoji: '🎭', title: 'Competition Video', subtitle: 'Enter a contest', color: '#FF6B00' },
  { id: 'book' as ModalType, emoji: '📚', title: 'Upload Book', subtitle: 'PDF format', color: '#FFB800' },
  { id: 'audiobookChapter' as ModalType, emoji: '🎧', title: 'Audiobook Chapter', subtitle: 'Add to existing book', color: '#00F5A0' },
];

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function UploadScreen() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upload</Text>
          <Text style={styles.headerSub}>Share your creativity with the world</Text>
        </View>

        {UPLOAD_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.optionCard, { borderLeftColor: opt.color }]}
            onPress={() => setActiveModal(opt.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, { backgroundColor: `${opt.color}22` }]}>
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{opt.title}</Text>
              <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
            </View>
            <Text style={[styles.optionArrow, { color: opt.color }]}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TrackUploadModal visible={activeModal === 'track'} onClose={() => setActiveModal(null)} />
      <AlbumUploadModal visible={activeModal === 'album'} onClose={() => setActiveModal(null)} />
      <CompetitionUploadModal visible={activeModal === 'competition'} onClose={() => setActiveModal(null)} />
      <BookUploadModal visible={activeModal === 'book'} onClose={() => setActiveModal(null)} />
      <AudiobookChapterModal visible={activeModal === 'audiobookChapter'} onClose={() => setActiveModal(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1128' },
  scrollContent: { paddingBottom: 140 },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 16,
    borderLeftWidth: 4,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionEmoji: { fontSize: 26 },
  optionText: { flex: 1 },
  optionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  optionSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 3 },
  optionArrow: { fontSize: 28, fontWeight: '300' },
  // Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#131D3A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalSheetScroll: {
    backgroundColor: '#131D3A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 20 },
  field: { marginBottom: 14 },
  fieldLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pickerBtnText: { color: '#FFFFFF', fontSize: 15, flex: 1 },
  pickerArrow: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  pickerDropdown: {
    backgroundColor: '#1E2D50',
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  pickerOption: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  pickerOptionActive: { backgroundColor: 'rgba(0,217,255,0.08)' },
  pickerOptionText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  filePickBtn: {
    backgroundColor: 'rgba(0,217,255,0.1)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.3)',
    marginBottom: 12,
    borderStyle: 'dashed',
  },
  filePickBtnText: { color: '#00D9FF', fontSize: 14, fontWeight: '600' },
  albumTrackRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  miniPickBtn: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0,217,255,0.1)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.3)',
  },
  miniPickBtnText: { fontSize: 20 },
  addTrackBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  addTrackBtnText: { color: '#9D4EDD', fontSize: 14, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cancelBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#00D9FF',
  },
  submitBtnText: { color: '#0A1128', fontSize: 15, fontWeight: '800' },
});
