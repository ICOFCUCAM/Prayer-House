// ── socialPreviewPushService ───────────────────────────────────
// Production: integrate OAuth tokens for each platform and call their
// upload APIs. Currently stubbed with console logs and a returned payload.

export interface SocialPushPayload {
  entryId:       string;
  previewClipUrl: string;
  title:         string;
  artistName:    string;
  wankongUrl:    string; // backlink to original entry
}

export interface PushResult {
  platform: string;
  success:  boolean;
  postUrl?: string;
  error?:   string;
}

// ── pushToYouTubeShorts ────────────────────────────────────────
export async function pushToYouTubeShorts(payload: SocialPushPayload): Promise<PushResult> {
  // Production: POST to YouTube Data API v3 /videos with part=snippet,status
  // https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable
  console.info('[SocialPush] YouTube Shorts push queued', payload.entryId);
  return {
    platform: 'YouTube Shorts',
    success:  true,
    postUrl:  `https://youtube.com/shorts/${payload.entryId}`,
  };
}

// ── pushToInstagramReels ───────────────────────────────────────
export async function pushToInstagramReels(payload: SocialPushPayload): Promise<PushResult> {
  // Production: POST to Instagram Graph API /me/media → /me/media_publish
  console.info('[SocialPush] Instagram Reels push queued', payload.entryId);
  return {
    platform: 'Instagram Reels',
    success:  true,
    postUrl:  `https://instagram.com/p/${payload.entryId}`,
  };
}

// ── pushToTikTok ──────────────────────────────────────────────
export async function pushToTikTok(payload: SocialPushPayload): Promise<PushResult> {
  // Production: POST to TikTok Content Posting API
  console.info('[SocialPush] TikTok push queued', payload.entryId);
  return {
    platform: 'TikTok',
    success:  true,
    postUrl:  `https://tiktok.com/@wankong/video/${payload.entryId}`,
  };
}

// ── pushAll ───────────────────────────────────────────────────
export async function pushAll(payload: SocialPushPayload): Promise<PushResult[]> {
  const results = await Promise.allSettled([
    pushToYouTubeShorts(payload),
    pushToInstagramReels(payload),
    pushToTikTok(payload),
  ]);
  return results.map(r =>
    r.status === 'fulfilled'
      ? r.value
      : { platform: 'unknown', success: false, error: String(r.reason) }
  );
}
