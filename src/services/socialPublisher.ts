import { supabase } from '@/lib/supabase';

export interface SocialPublishResult {
  platform: 'youtube' | 'facebook' | 'instagram' | 'twitter';
  url: string | null;
  error?: string;
}

export interface PublishSummary {
  submissionId: string;
  success: boolean;
  results: SocialPublishResult[];
  publishedAt: string;
}

interface Submission {
  id: string;
  title: string;
  description: string;
  audio_url?: string;
  video_url?: string;
  cover_art?: string;
  creator_id?: string;
  competition_id?: string;
  status: string;
  social_urls?: Record<string, string>;
}

/** Retrieve stored OAuth token for a creator + platform from `social_accounts` table */
async function getToken(creatorId: string, platform: string): Promise<string | null> {
  const { data } = await supabase
    .from('social_accounts')
    .select('access_token')
    .eq('user_id', creatorId)
    .eq('platform', platform)
    .maybeSingle();
  return data?.access_token ?? null;
}

/**
 * YouTube Data API v3 — upload a video by URL.
 * Requires a stored OAuth2 access_token with `youtube.upload` scope.
 * Steps: insert metadata → receive upload URL → PUT video bytes.
 */
async function publishToYouTube(submission: Submission): Promise<SocialPublishResult> {
  if (!submission.creator_id) return { platform: 'youtube', url: null, error: 'No creator_id' };

  const token = await getToken(submission.creator_id, 'youtube');
  if (!token) return { platform: 'youtube', url: null, error: 'YouTube not connected' };

  try {
    if (!submission.video_url) return { platform: 'youtube', url: null, error: 'No video URL' };

    // 1. Initiate a resumable upload to get the upload session URI
    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method:  'POST',
        headers: {
          'Authorization':   `Bearer ${token}`,
          'Content-Type':    'application/json',
          'X-Upload-Content-Type': 'video/*',
        },
        body: JSON.stringify({
          snippet: {
            title:       submission.title,
            description: submission.description ?? '',
            tags:        ['wankong', 'music'],
            categoryId:  '10', // Music
          },
          status: {
            privacyStatus:         'public',
            selfDeclaredMadeForKids: false,
          },
        }),
      }
    );

    if (!initRes.ok) {
      const err = await initRes.text();
      return { platform: 'youtube', url: null, error: `YouTube init failed: ${err}` };
    }

    const uploadUri = initRes.headers.get('Location');
    if (!uploadUri) return { platform: 'youtube', url: null, error: 'No upload URI from YouTube' };

    // 2. Fetch the video bytes from the stored URL
    const videoRes = await fetch(submission.video_url);
    if (!videoRes.ok) return { platform: 'youtube', url: null, error: 'Cannot fetch video file' };
    const videoBlob = await videoRes.blob();

    // 3. PUT the video bytes to the resumable upload URI
    const uploadRes = await fetch(uploadUri, {
      method:  'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  videoBlob.type || 'video/mp4',
      },
      body: videoBlob,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return { platform: 'youtube', url: null, error: `YouTube upload failed: ${err}` };
    }

    const data = await uploadRes.json() as { id?: string };
    const videoId = data.id;
    if (!videoId) return { platform: 'youtube', url: null, error: 'No video ID returned' };

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    return { platform: 'youtube', url };
  } catch (err: any) {
    return { platform: 'youtube', url: null, error: err?.message || 'YouTube publish failed' };
  }
}

/**
 * Instagram Content Publishing API (Graph API).
 * Requires a Page/Creator access_token with `instagram_content_publish` permission.
 * For video: create container → wait for status FINISHED → publish.
 */
async function publishToInstagram(submission: Submission): Promise<SocialPublishResult> {
  if (!submission.creator_id) return { platform: 'instagram', url: null, error: 'No creator_id' };

  const token = await getToken(submission.creator_id, 'instagram');
  if (!token) return { platform: 'instagram', url: null, error: 'Instagram not connected' };

  try {
    // Fetch the Instagram account ID
    const meRes  = await fetch(`https://graph.instagram.com/me?fields=id&access_token=${token}`);
    const meData = await meRes.json() as { id?: string; error?: { message: string } };
    if (!meData.id) return { platform: 'instagram', url: null, error: meData.error?.message ?? 'Cannot get IG user ID' };
    const igUserId = meData.id;

    const mediaUrl = submission.video_url ?? submission.cover_art;
    const isVideo  = !!submission.video_url;

    // 1. Create media container
    const params = new URLSearchParams({
      caption:      `${submission.title}\n\n${submission.description ?? ''}\n\n#wankong #music`,
      access_token: token,
    });
    if (isVideo) {
      params.set('media_type', 'REELS');
      params.set('video_url',  mediaUrl ?? '');
    } else {
      params.set('image_url', mediaUrl ?? '');
    }

    const containerRes  = await fetch(`https://graph.instagram.com/v18.0/${igUserId}/media`, {
      method: 'POST',
      body:   params,
    });
    const containerData = await containerRes.json() as { id?: string; error?: { message: string } };
    if (!containerData.id) {
      return { platform: 'instagram', url: null, error: containerData.error?.message ?? 'IG container creation failed' };
    }
    const containerId = containerData.id;

    // 2. Poll until container status = FINISHED (video processing)
    if (isVideo) {
      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise(r => setTimeout(r, 3000));
        const statusRes  = await fetch(`https://graph.instagram.com/${containerId}?fields=status_code&access_token=${token}`);
        const statusData = await statusRes.json() as { status_code?: string };
        if (statusData.status_code === 'FINISHED') break;
        if (statusData.status_code === 'ERROR') {
          return { platform: 'instagram', url: null, error: 'IG video processing error' };
        }
      }
    }

    // 3. Publish the container
    const publishRes  = await fetch(`https://graph.instagram.com/v18.0/${igUserId}/media_publish`, {
      method: 'POST',
      body:   new URLSearchParams({ creation_id: containerId, access_token: token }),
    });
    const publishData = await publishRes.json() as { id?: string; error?: { message: string } };
    if (!publishData.id) {
      return { platform: 'instagram', url: null, error: publishData.error?.message ?? 'IG publish failed' };
    }

    const url = `https://www.instagram.com/p/${publishData.id}/`;
    return { platform: 'instagram', url };
  } catch (err: any) {
    return { platform: 'instagram', url: null, error: err?.message || 'Instagram publish failed' };
  }
}

/**
 * Twitter API v2 — post a tweet.
 * Requires an OAuth 2.0 user access_token with `tweet.write` scope.
 */
async function publishToTwitter(submission: Submission): Promise<SocialPublishResult> {
  if (!submission.creator_id) return { platform: 'twitter', url: null, error: 'No creator_id' };

  const token = await getToken(submission.creator_id, 'twitter');
  if (!token) return { platform: 'twitter', url: null, error: 'Twitter not connected' };

  try {
    const text = [
      `🎵 ${submission.title}`,
      submission.description ? submission.description.slice(0, 200) : '',
      '#wankong #music #newrelease',
    ].filter(Boolean).join('\n\n').slice(0, 280);

    const tweetRes = await fetch('https://api.twitter.com/2/tweets', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!tweetRes.ok) {
      const err = await tweetRes.json() as { detail?: string };
      return { platform: 'twitter', url: null, error: err.detail ?? 'Twitter post failed' };
    }

    const tweetData = await tweetRes.json() as { data?: { id: string } };
    const tweetId   = tweetData.data?.id;
    if (!tweetId) return { platform: 'twitter', url: null, error: 'No tweet ID returned' };

    // Fetch author username to construct URL
    const userRes  = await fetch('https://api.twitter.com/2/users/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const userData = await userRes.json() as { data?: { username: string } };
    const username = userData.data?.username ?? 'wankong';

    const url = `https://twitter.com/${username}/status/${tweetId}`;
    return { platform: 'twitter', url };
  } catch (err: any) {
    return { platform: 'twitter', url: null, error: err?.message || 'Twitter publish failed' };
  }
}

/**
 * Facebook Graph API — post to a Page's feed or as a video.
 * Requires a page_access_token with `pages_manage_posts` permission.
 */
async function publishToFacebook(submission: Submission): Promise<SocialPublishResult> {
  if (!submission.creator_id) return { platform: 'facebook', url: null, error: 'No creator_id' };

  const token = await getToken(submission.creator_id, 'facebook');
  if (!token) return { platform: 'facebook', url: null, error: 'Facebook not connected' };

  try {
    // Get the connected page ID
    const pagesRes  = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${token}`);
    const pagesData = await pagesRes.json() as { data?: Array<{ id: string; access_token: string }> };
    const page = pagesData.data?.[0];
    if (!page) return { platform: 'facebook', url: null, error: 'No Facebook Page found' };

    const pageId    = page.id;
    const pageToken = page.access_token;

    let postId: string | undefined;

    if (submission.video_url) {
      // Video post
      const formData = new FormData();
      formData.append('file_url',    submission.video_url);
      formData.append('title',       submission.title);
      formData.append('description', submission.description ?? '');
      formData.append('access_token', pageToken);

      const videoRes  = await fetch(`https://graph.facebook.com/v18.0/${pageId}/videos`, {
        method: 'POST',
        body:   formData,
      });
      const videoData = await videoRes.json() as { id?: string; error?: { message: string } };
      if (!videoData.id) return { platform: 'facebook', url: null, error: videoData.error?.message ?? 'FB video post failed' };
      postId = videoData.id;
    } else {
      // Link/image post
      const body: Record<string, string> = {
        message:      `🎵 ${submission.title}\n\n${submission.description ?? ''}\n\n#wankong #music`,
        access_token: pageToken,
      };
      if (submission.cover_art) body.link = submission.cover_art;

      const postRes  = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const postData = await postRes.json() as { id?: string; error?: { message: string } };
      if (!postData.id) return { platform: 'facebook', url: null, error: postData.error?.message ?? 'FB post failed' };
      postId = postData.id;
    }

    const url = `https://www.facebook.com/${pageId}/posts/${postId?.split('_')[1] ?? postId}`;
    return { platform: 'facebook', url };
  } catch (err: any) {
    return { platform: 'facebook', url: null, error: err?.message || 'Facebook publish failed' };
  }
}

export async function publishApprovedSubmission(submissionId: string): Promise<PublishSummary> {
  const { data: submission, error: fetchError } = await supabase
    .from('competition_submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (fetchError || !submission) {
    throw new Error(`Submission ${submissionId} not found: ${fetchError?.message}`);
  }

  if (submission.status !== 'approved') {
    throw new Error(`Submission ${submissionId} is not approved (status: ${submission.status})`);
  }

  const [youtube, facebook, instagram, twitter] = await Promise.all([
    publishToYouTube(submission as Submission),
    publishToFacebook(submission as Submission),
    publishToInstagram(submission as Submission),
    publishToTwitter(submission as Submission),
  ]);

  const results: SocialPublishResult[] = [youtube, facebook, instagram, twitter];
  const existingUrls: Record<string, string> = submission.social_urls || {};
  const newUrls: Record<string, string> = { ...existingUrls };

  for (const result of results) {
    if (result.url) newUrls[result.platform] = result.url;
  }

  const { error: updateError } = await supabase
    .from('competition_submissions')
    .update({ social_urls: newUrls, social_published_at: new Date().toISOString() })
    .eq('id', submissionId);

  if (updateError) console.error('[socialPublisher] Failed to persist social URLs:', updateError.message);

  const summary: PublishSummary = { submissionId, success: results.some(r => r.url !== null), results, publishedAt: new Date().toISOString() };
  return summary;
}

export async function publishAllPendingApproved(): Promise<PublishSummary[]> {
  const { data: submissions, error } = await supabase
    .from('competition_submissions')
    .select('id')
    .eq('status', 'approved')
    .is('social_published_at', null);

  if (error || !submissions) return [];

  return Promise.all(
    submissions.map(s => publishApprovedSubmission(s.id).catch(err => ({
      submissionId: s.id, success: false, results: [], publishedAt: new Date().toISOString(),
    } as PublishSummary)))
  );
}

export async function getCreatorSocialStatus(creatorId: string) {
  const { data, error } = await supabase
    .from('competition_submissions')
    .select('id, title, status, social_urls, social_published_at, created_at')
    .eq('creator_id', creatorId)
    .eq('status', 'approved')
    .order('social_published_at', { ascending: false });

  if (error) return [];

  return (data || []).map(s => ({
    id: s.id,
    title: s.title,
    socialUrls: s.social_urls || {},
    publishedAt: s.social_published_at,
    platforms: Object.keys(s.social_urls || {}),
  }));
}
