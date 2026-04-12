import type { VercelRequest, VercelResponse } from '@vercel/node';

interface EmailPayload {
  to:       string | string[];
  subject:  string;
  html:     string;
  from?:    string;
  replyTo?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(500).json({ error: 'Email service not configured.' });

  // Simple internal auth — server-to-server calls include this header
  const authHeader = req.headers['x-internal-key'];
  if (authHeader && authHeader !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { to, subject, html, from, replyTo } = req.body as EmailPayload;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    const fromAddress = from ?? `WANKONG <noreply@${process.env.EMAIL_DOMAIN ?? 'wankong.com'}>`;

    const body: Record<string, unknown> = {
      from:    fromAddress,
      to:      Array.isArray(to) ? to : [to],
      subject,
      html,
    };
    if (replyTo) body.reply_to = replyTo;

    const response = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      console.error('[send-email] Resend error:', result);
      return res.status(response.status).json({ error: (result as any).message ?? 'Email send failed' });
    }

    return res.status(200).json({ id: (result as any).id, success: true });
  } catch (err: any) {
    console.error('[send-email]', err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}
