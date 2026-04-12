import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

// ── Plan price mappings (env vars take precedence) ───────────────────────────
const PLAN_PRICE_IDS: Record<string, Record<string, string>> = {
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY  ?? '',
    yearly:  process.env.STRIPE_PRICE_PRO_YEARLY   ?? '',
  },
  premium: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY  ?? '',
    yearly:  process.env.STRIPE_PRICE_PREM_YEARLY  ?? '',
  },
};

// Fallback: create ad-hoc prices if env vars are missing
const PLAN_AMOUNTS: Record<string, Record<string, number>> = {
  pro:     { monthly: 499,  yearly: 4788 },
  premium: { monthly: 999,  yearly: 9588 },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: 'Stripe is not configured on this server.' });

  const stripe = new Stripe(key, { apiVersion: '2024-04-10' as any });

  try {
    const { planId, billing = 'monthly', userId, email } = req.body as {
      planId:   string;
      billing?: 'monthly' | 'yearly';
      userId?:  string;
      email?:   string;
    };

    if (!planId || !['pro', 'premium'].includes(planId)) {
      return res.status(400).json({ error: 'Invalid planId.' });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VITE_APP_URL ?? 'http://localhost:5173';

    // Resolve price — use pre-created price ID if available, else create ad-hoc
    let priceId = PLAN_PRICE_IDS[planId]?.[billing];

    if (!priceId) {
      // Create a one-off price for this session
      const amount   = PLAN_AMOUNTS[planId]?.[billing] ?? 999;
      const interval = billing === 'yearly' ? 'year' : 'month';

      const product = await stripe.products.create({
        name: `WANKONG ${planId.charAt(0).toUpperCase() + planId.slice(1)} (${billing})`,
      });

      const price = await stripe.prices.create({
        product:    product.id,
        unit_amount: amount,
        currency:   'usd',
        recurring:  { interval },
      });

      priceId = price.id;
    }

    // Build session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode:       'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?subscribed=1&plan=${planId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/pricing`,
      metadata:    { planId, billing, userId: userId ?? '' },
      allow_promotion_codes: true,
    };

    if (email) sessionParams.customer_email = email;

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('[create-checkout-session]', err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}
