import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: 'Stripe is not configured on this server.' });

  const stripe = new Stripe(key, { apiVersion: '2024-04-10' as any });

  try {
    const { amount, currency = 'usd', orderId, customer_email } = req.body as {
      amount: number;
      currency?: string;
      orderId?: string;
      customer_email?: string;
    };

    if (!amount || amount < 50) {
      return res.status(400).json({ error: 'Amount must be at least 50 cents.' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount:       Math.round(amount),
      currency:     currency.toLowerCase(),
      metadata:     { orderId: orderId ?? '' },
      receipt_email: customer_email,
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    console.error('[create-payment-intent]', err);
    res.status(400).json({ error: err.message });
  }
}
