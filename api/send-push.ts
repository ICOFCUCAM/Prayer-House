import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const vapidPublic  = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail   = process.env.VAPID_EMAIL ?? 'mailto:admin@wankong.com';

  if (!vapidPublic || !vapidPrivate) {
    return res.status(500).json({ error: 'VAPID keys not configured.' });
  }

  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase not configured.' });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { userId, title, body, url, icon } = req.body as {
      userId:  string;
      title:   string;
      body:    string;
      url?:    string;
      icon?:   string;
    };

    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'Missing required fields: userId, title, body' });
    }

    // Fetch all push subscriptions for this user
    const { data: subs, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (subErr) throw subErr;
    if (!subs || subs.length === 0) {
      return res.status(200).json({ sent: 0, message: 'No subscriptions found for user.' });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon:  icon ?? '/pwa-192x192.png',
      badge: '/pwa-96x96.png',
      url:   url ?? '/',
      timestamp: Date.now(),
    });

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys:     { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          { TTL: 86400 }, // 24 hours
        )
      )
    );

    // Remove expired/invalid subscriptions (410 Gone)
    const staleEndpoints: string[] = [];
    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        const err = result.reason as { statusCode?: number };
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          staleEndpoints.push(subs[idx].endpoint);
        }
      }
    });

    if (staleEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', staleEndpoints);
    }

    const sent   = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return res.status(200).json({ sent, failed, total: subs.length });
  } catch (err: any) {
    console.error('[send-push]', err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}
