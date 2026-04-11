// ── Database Type Definitions ─────────────────────────────────────────────────
// TypeScript interfaces — no implementation, just types.

export interface Track {
  id: string;
  title: string;
  genre?: string;
  bpm?: number;
  audio_url: string;
  stream_count: number;
  user_id: string;
  created_at: string;
}

export interface DistributionRelease {
  id: string;
  artist_id?: string;
  status: string;
  audio_url?: string;
  artwork_url?: string;
  ditto_release_id?: string;
  created_at: string;
}

export interface Artist {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  bio?: string;
  photo_url?: string;
  verified: boolean;
  streams: number;
  followers: number;
}

export interface Author {
  user_id: string;
  slug: string;
  name: string;
  bio?: string;
  photo_url?: string;
  website?: string;
  total_downloads: number;
  total_earnings: number;
  auto_translate: boolean;
}

export interface EcomProduct {
  id: string;
  title: string;
  price: number;
  product_type: string;
  author_id?: string;
  image_url?: string;
  file_url?: string;
  genre?: string;
  language?: string;
  total_downloads?: number;
  created_at: string;
}

export interface Audiobook {
  id: string;
  book_id: string;
  author_id: string;
  title: string;
  narrator: string;
  language: string;
  ebook_price: number;
  audio_price: number;
  bundle_price: number;
  cover_url?: string;
}

export interface AudiobookChapter {
  id: string;
  audiobook_id: string;
  chapter_num: number;
  title: string;
  audio_url: string;
  duration_s: number;
}

export interface BookTranslation {
  id: string;
  book_id: string;
  language: string;
  title?: string;
  pdf_url?: string;
  status: string;
}

export interface CompetitionEntry {
  id: string;
  room_id: string;
  user_id: string;
  title: string;
  video_url: string;
  status: string;
  votes_count: number;
  ai_score?: number;
}

export interface CompetitionClip {
  id: string;
  entry_id: string;
  duration_s: number;
  clip_url?: string;
  clip_views: number;
  ranking_score?: number;
  status: string;
}

export interface CompetitionSubtitle {
  id: string;
  entry_id: string;
  language: string;
  vtt_url?: string;
  status: string;
}

export interface CreatorLevel {
  user_id: string;
  level: string;
  xp: number;
}

export interface CreatorEarning {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  period: string;
  paid: boolean;
  created_at: string;
}
