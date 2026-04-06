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

async function publishToYouTube(submission: Submission): Promise<SocialPublishResult> {
  try {
    console.info('[socialPublisher] YouTube integration not yet configured.');
    return { platform: 'youtube', url: null, error: 'Not configured' };
  } catch (err: any) {
    return { platform: 'youtube', url: null, error: err?.message || 'YouTube publish failed' };
  }
}

async function publishToFacebook(submission: Submission): Promise<SocialPublishResult> {
  try {
    console.info('[socialPublisher] Facebook integration not yet configured.');
    return { platform: 'facebook', url: null, error: 'Not configured' };
  } catch (err: any) {
    return { platform: 'facebook', url: null, error: err?.message || 'Facebook publish failed' };
  }
}

async function publishToInstagram(submission: Submission): Promise<SocialPublishResult> {
  try {
    console.info('[socialPublisher] Instagram integration not yet configured.');
    return { platform: 'instagram', url: null, error: 'Not configured' };
  } catch (err: any) {
    return { platform: 'instagram', url: null, error: err?.message || 'Instagram publish failed' };
  }
}

async function publishToTwitter(submission: Submission): Promise<SocialPublishResult> {
  try {
    console.info('[socialPublisher] Twitter integration not yet configured.');
    return { platform: 'twitter', url: null, error: 'Not configured' };
  } catch (err: any) {
    return { platform: 'twitter', url: null, error: err?.message || 'Twitter publish failed' };
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
