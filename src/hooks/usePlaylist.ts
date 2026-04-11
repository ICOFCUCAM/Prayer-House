import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/store/AppContext';
import { usePlayer } from '@/components/GlobalPlayer';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Playlist {
  id:             string;
  creator_id:     string | null;
  name:           string;
  description:    string | null;
  cover_url:      string | null;
  is_public:      boolean;
  is_editorial:   boolean;
  editorial_type: string | null;
  track_count:    number;
  follower_count: number;
  created_at:     string;
  updated_at:     string;
}

export interface PlaylistTrack {
  id:           string;
  playlist_id:  string;
  track_id:     string;
  content_type: 'music' | 'video' | 'audiobook' | 'podcast' | 'course' | 'competition';
  title:        string;
  artist:       string | null;
  cover_url:    string | null;
  audio_url:    string | null;
  video_url:    string | null;
  duration:     number | null;
  position:     number;
  added_at:     string;
}

export interface SavedTrack {
  id:           string;
  user_id:      string;
  track_id:     string;
  content_type: 'music' | 'video' | 'audiobook' | 'podcast' | 'course' | 'competition';
  title:        string;
  artist:       string | null;
  cover_url:    string | null;
  audio_url:    string | null;
  video_url:    string | null;
  duration:     number | null;
  saved_at:     string;
}

export interface PlaylistItemInput {
  track_id:     string;
  content_type: PlaylistTrack['content_type'];
  title:        string;
  artist?:      string;
  cover_url?:   string;
  audio_url?:   string;
  video_url?:   string;
  duration?:    number;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePlaylist() {
  const { user } = useApp();
  const player   = usePlayer();

  const [myPlaylists,       setMyPlaylists]       = useState<Playlist[]>([]);
  const [followedPlaylists, setFollowedPlaylists] = useState<Playlist[]>([]);
  const [editorialPlaylists,setEditorialPlaylists]= useState<Playlist[]>([]);
  const [savedTracks,       setSavedTracks]       = useState<SavedTrack[]>([]);
  const [loading,           setLoading]           = useState(false);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadMyPlaylists = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('playlists')
      .select('*')
      .eq('creator_id', user.id)
      .eq('is_editorial', false)
      .order('updated_at', { ascending: false });
    if (data) setMyPlaylists(data as Playlist[]);
  }, [user]);

  const loadFollowedPlaylists = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('playlist_followers')
      .select('playlist_id, playlists(*)')
      .eq('user_id', user.id)
      .order('followed_at', { ascending: false });
    if (data) {
      const playlists = data.map((r: any) => r.playlists).filter(Boolean);
      setFollowedPlaylists(playlists as Playlist[]);
    }
  }, [user]);

  const loadEditorialPlaylists = useCallback(async () => {
    const { data } = await supabase
      .from('playlists')
      .select('*')
      .eq('is_editorial', true)
      .order('created_at', { ascending: true });
    if (data) setEditorialPlaylists(data as Playlist[]);
  }, []);

  const loadSavedTracks = useCallback(async (contentType?: SavedTrack['content_type']) => {
    if (!user) return;
    let query = supabase
      .from('saved_tracks')
      .select('*')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false });
    if (contentType) query = query.eq('content_type', contentType);
    const { data } = await query;
    if (data) setSavedTracks(data as SavedTrack[]);
  }, [user]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      loadMyPlaylists(),
      loadFollowedPlaylists(),
      loadEditorialPlaylists(),
      loadSavedTracks(),
    ]);
    setLoading(false);
  }, [loadMyPlaylists, loadFollowedPlaylists, loadEditorialPlaylists, loadSavedTracks]);

  // Auto-load when user changes
  useEffect(() => { if (user) loadAll(); }, [user, loadAll]);

  // ── Playlist CRUD ──────────────────────────────────────────────────────────

  const createPlaylist = useCallback(async (
    name: string,
    description?: string,
    isPublic = true,
  ): Promise<Playlist | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('playlists')
      .insert([{ creator_id: user.id, name, description: description || null, is_public: isPublic }])
      .select().single();
    if (error || !data) return null;
    const pl = data as Playlist;
    setMyPlaylists(prev => [pl, ...prev]);
    return pl;
  }, [user]);

  const renamePlaylist = useCallback(async (
    id: string,
    name: string,
    description?: string,
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('playlists')
      .update({ name, description: description ?? null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return false;
    setMyPlaylists(prev => prev.map(p => p.id === id ? { ...p, name, description: description ?? p.description } : p));
    return true;
  }, []);

  const deletePlaylist = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('playlists').delete().eq('id', id);
    if (error) return false;
    setMyPlaylists(prev => prev.filter(p => p.id !== id));
    return true;
  }, []);

  // ── Track management ───────────────────────────────────────────────────────

  const getPlaylistTracks = useCallback(async (playlistId: string): Promise<PlaylistTrack[]> => {
    const { data } = await supabase
      .from('playlist_tracks')
      .select('*')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });
    return (data ?? []) as PlaylistTrack[];
  }, []);

  const addTrackToPlaylist = useCallback(async (
    playlistId: string,
    item: PlaylistItemInput,
  ): Promise<boolean> => {
    if (!user) return false;
    // Get current max position
    const { data: existing } = await supabase
      .from('playlist_tracks')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1);
    const nextPos = existing && existing.length > 0 ? (existing[0].position + 1) : 0;

    const { error } = await supabase.from('playlist_tracks').insert([{
      playlist_id:  playlistId,
      track_id:     item.track_id,
      content_type: item.content_type,
      title:        item.title,
      artist:       item.artist ?? null,
      cover_url:    item.cover_url ?? null,
      audio_url:    item.audio_url ?? null,
      video_url:    item.video_url ?? null,
      duration:     item.duration ?? null,
      position:     nextPos,
      added_by:     user.id,
    }]);
    if (error) return false;
    // Bump local track_count
    setMyPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, track_count: p.track_count + 1 } : p));
    return true;
  }, [user]);

  const removeTrackFromPlaylist = useCallback(async (
    playlistId: string,
    trackId: string,
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('track_id', trackId);
    if (error) return false;
    setMyPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, track_count: Math.max(p.track_count - 1, 0) } : p));
    return true;
  }, []);

  const reorderTracks = useCallback(async (
    playlistId: string,
    tracks: PlaylistTrack[],
  ): Promise<boolean> => {
    // Update positions in batch
    const updates = tracks.map((t, i) =>
      supabase.from('playlist_tracks').update({ position: i }).eq('id', t.id)
    );
    const results = await Promise.allSettled(updates);
    return results.every(r => r.status === 'fulfilled');
  }, []);

  // ── Follow / Unfollow ──────────────────────────────────────────────────────

  const followPlaylist = useCallback(async (playlistId: string): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase
      .from('playlist_followers')
      .insert([{ playlist_id: playlistId, user_id: user.id }]);
    if (error) return false;
    await loadFollowedPlaylists();
    return true;
  }, [user, loadFollowedPlaylists]);

  const unfollowPlaylist = useCallback(async (playlistId: string): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase
      .from('playlist_followers')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('user_id', user.id);
    if (error) return false;
    setFollowedPlaylists(prev => prev.filter(p => p.id !== playlistId));
    return true;
  }, [user]);

  const isFollowing = useCallback((playlistId: string): boolean => {
    return followedPlaylists.some(p => p.id === playlistId);
  }, [followedPlaylists]);

  // ── Saved tracks ───────────────────────────────────────────────────────────

  const saveTrack = useCallback(async (item: PlaylistItemInput): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase.from('saved_tracks').insert([{
      user_id:      user.id,
      track_id:     item.track_id,
      content_type: item.content_type,
      title:        item.title,
      artist:       item.artist ?? null,
      cover_url:    item.cover_url ?? null,
      audio_url:    item.audio_url ?? null,
      video_url:    item.video_url ?? null,
      duration:     item.duration ?? null,
    }]);
    if (error) return false;
    await loadSavedTracks();
    return true;
  }, [user, loadSavedTracks]);

  const unsaveTrack = useCallback(async (trackId: string): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase
      .from('saved_tracks')
      .delete()
      .eq('user_id', user.id)
      .eq('track_id', trackId);
    if (error) return false;
    setSavedTracks(prev => prev.filter(t => t.track_id !== trackId));
    return true;
  }, [user]);

  const isSaved = useCallback((trackId: string): boolean => {
    return savedTracks.some(t => t.track_id === trackId);
  }, [savedTracks]);

  // ── Admin: create editorial playlist ──────────────────────────────────────

  const createEditorialPlaylist = useCallback(async (
    name: string,
    editorialType: 'trending' | 'top_creators' | 'winners' | 'new_releases',
    description?: string,
  ): Promise<Playlist | null> => {
    const { data, error } = await supabase
      .from('playlists')
      .insert([{
        name,
        description: description ?? null,
        is_public:   true,
        is_editorial: true,
        editorial_type: editorialType,
      }])
      .select().single();
    if (error || !data) return null;
    const pl = data as Playlist;
    setEditorialPlaylists(prev => [...prev, pl]);
    return pl;
  }, []);

  // ── Play playlist via GlobalPlayer ─────────────────────────────────────────

  const playPlaylist = useCallback((
    playlistTracks: PlaylistTrack[],
    startIndex = 0,
    shuffled = false,
  ) => {
    if (!playlistTracks.length) return;
    let ordered = [...playlistTracks];
    if (shuffled) {
      for (let i = ordered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
      }
      startIndex = 0;
    }
    const picked = ordered[Math.min(startIndex, ordered.length - 1)];
    const rest   = ordered.filter((_, i) => i !== Math.min(startIndex, ordered.length - 1));

    const toTrack = (pt: PlaylistTrack) => ({
      id:       pt.track_id,
      title:    pt.title,
      artist:   pt.artist ?? 'Unknown',
      albumArt: pt.cover_url ?? undefined,
      cover:    pt.cover_url ?? undefined,
      audioUrl: pt.audio_url ?? undefined,
      videoUrl: pt.video_url ?? undefined,
      duration: pt.duration ?? undefined,
      type:     pt.content_type === 'music' ? 'audio' as const :
                pt.content_type === 'podcast' ? 'podcast' as const : 'audio' as const,
    });

    player.play(toTrack(picked), rest.map(toTrack));
  }, [player]);

  return {
    // state
    myPlaylists,
    followedPlaylists,
    editorialPlaylists,
    savedTracks,
    loading,
    // loaders
    loadAll,
    loadMyPlaylists,
    loadSavedTracks,
    getPlaylistTracks,
    // playlist CRUD
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    // track management
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    reorderTracks,
    // follow
    followPlaylist,
    unfollowPlaylist,
    isFollowing,
    // saved tracks
    saveTrack,
    unsaveTrack,
    isSaved,
    // admin
    createEditorialPlaylist,
    // player
    playPlaylist,
  };
}
