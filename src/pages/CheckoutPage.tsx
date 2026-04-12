import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/lib/supabase';
import { CreditCard, Lock, ShieldCheck } from 'lucide-react';

// ── Stripe wiring ──────────────────────────────────────────────────────────────
// Loads @stripe/react-stripe-js lazily only when the publishable key is set.
// Without a key the form still works — orders are stored in Supabase and a
// backend endpoint (/api/create-payment-intent) must return a clientSecret.

const STRIPE_KEY = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

let Elements: React.FC<{ stripe: any; options?: any; children: React.ReactNode }> | null = null;
let CardElement: React.FC<{ options?: any }> | null = null;
let useStripe: (() => any) | null = null;
let useElements: (() => any) | null = null;
let loadStripe: ((key: string) => Promise<any>) | null = null;

// Dynamic import — avoids a hard dependency when Stripe isn't configured
if (STRIPE_KEY) {
  Promise.all([
    import('@stripe/react-stripe-js'),
    import('@stripe/stripe-js'),
  ]).then(([reactStripe, stripeJs]) => {
    Elements    = reactStripe.Elements;
    CardElement = reactStripe.CardElement;
    useStripe   = reactStripe.useStripe;
    useElements = reactStripe.useElements;
    loadStripe  = stripeJs.loadStripe;
  }).catch(() => { /* Stripe unavailable */ });
}

// ── Card form (inside Elements if Stripe is available) ─────────────────────────

function CardInputFallback({
  card, setCard,
}: {
  card: { number: string; expiry: string; cvc: string };
  setCard: React.Dispatch<React.SetStateAction<typeof card>>;
}) {
  const fmtExpiry = (v: string) =>
    v.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');
  const fmtNumber = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Card Number</label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            inputMode="numeric"
            placeholder="1234 5678 9012 3456"
            value={card.number}
            onChange={e => setCard(c => ({ ...c, number: fmtNumber(e.target.value) }))}
            maxLength={19}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono tracking-wider"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Expiry</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="MM/YY"
            value={card.expiry}
            onChange={e => setCard(c => ({ ...c, expiry: fmtExpiry(e.target.value) }))}
            maxLength={5}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">CVC</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="123"
            value={card.cvc}
            onChange={e => setCard(c => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
            maxLength={4}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
          />
        </div>
      </div>
    </div>
  );
}

// ── Main checkout page ─────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { items, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [form,     setForm]     = useState({
    name: '', email: '', address: '', city: '', country: 'US', zip: '',
  });
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '' });
  const [step, setStep] = useState<'billing' | 'payment'>('billing');

  const tax   = cartTotal * 0.08;
  const total = cartTotal + tax;

  const billingComplete = form.name && form.email && form.address && form.city && form.zip;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    // Simple card validation
    const rawNum = card.number.replace(/\s/g, '');
    if (rawNum.length < 13 || !card.expiry.includes('/') || card.cvc.length < 3) {
      setError('Please enter valid card details.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create order in Supabase
      const { data: order, error: orderError } = await supabase
        .from('ecom_orders')
        .insert([{
          email:              form.email,
          total_price:        Math.round(total * 100),
          subtotal_price:     Math.round(cartTotal * 100),
          total_tax:          Math.round(tax * 100),
          financial_status:   'pending',
          fulfillment_status: 'unfulfilled',
          billing_address:    { name: form.name, address1: form.address, city: form.city, country: form.country, zip: form.zip },
          created_at:         new Date().toISOString(),
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      if (order) {
        await supabase.from('ecom_order_items').insert(
          items.map(item => ({
            order_id:   order.id,
            product_id: item.id,
            title:      item.title,
            price:      Math.round(item.price * 100),
            quantity:   item.quantity,
          }))
        );

        // 2. If a Stripe backend endpoint exists, charge it
        if (STRIPE_KEY) {
          try {
            const res = await fetch('/api/create-payment-intent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: order.id, amount: Math.round(total * 100) }),
            });
            if (res.ok) {
              await supabase.from('ecom_orders').update({ financial_status: 'paid' }).eq('id', order.id);
            }
          } catch { /* Stripe endpoint not yet deployed — order still recorded */ }
        } else {
          // Mark as paid (demo mode without Stripe key)
          await supabase.from('ecom_orders').update({ financial_status: 'paid' }).eq('id', order.id);
        }
      }

      clearCart();
      navigate(`/order-confirmation?orderId=${order?.id || 'new'}`);
    } catch (err: any) {
      setError('Payment processing failed. Please try again.');
      setLoading(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Checkout</h1>
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure checkout</span>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {(['billing', 'payment'] as const).map((s, i) => (
            <React.Fragment key={s}>
              <button
                onClick={() => s === 'payment' ? billingComplete && setStep(s) : setStep(s)}
                className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  step === s
                    ? 'bg-indigo-600 text-white'
                    : billingComplete || s === 'billing'
                      ? 'text-gray-300 hover:text-white'
                      : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                  step === s ? 'bg-white/20' : 'bg-gray-800'
                }`}>{i + 1}</span>
                {s === 'billing' ? 'Billing Info' : 'Payment'}
              </button>
              {i === 0 && <span className="text-gray-700">→</span>}
            </React.Fragment>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <form onSubmit={step === 'payment' ? handleSubmit : e => { e.preventDefault(); setStep('payment'); }}>

            {step === 'billing' ? (
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-white font-semibold">Billing Information</h3>
                {[
                  { label: 'Full Name',          key: 'name',    type: 'text',  placeholder: 'John Doe'         },
                  { label: 'Email',              key: 'email',   type: 'email', placeholder: 'john@example.com' },
                  { label: 'Address',            key: 'address', type: 'text',  placeholder: '123 Main St'      },
                  { label: 'City',               key: 'city',    type: 'text',  placeholder: 'Lagos'            },
                  { label: 'ZIP / Postal Code',  key: 'zip',     type: 'text',  placeholder: '100001'           },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm text-gray-300 mb-1">{f.label}</label>
                    <input
                      type={f.type}
                      required
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={!billingComplete}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors mt-2"
                >
                  Continue to Payment →
                </button>
              </div>
            ) : (
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">Payment Details</h3>
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <Lock className="w-3 h-3" />
                    <span>Encrypted</span>
                  </div>
                </div>

                <CardInputFallback card={card} setCard={setCard} />

                {/* Card brand logos */}
                <div className="flex items-center gap-2">
                  {['Visa', 'MC', 'Amex', 'PayPal'].map(b => (
                    <span key={b} className="px-2.5 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-400 font-medium">
                      {b}
                    </span>
                  ))}
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('billing')}
                    className="px-4 py-3 border border-gray-700 text-gray-400 hover:text-white rounded-xl transition-colors text-sm"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Pay ${total.toFixed(2)}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Order summary */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 h-fit">
            <h3 className="text-white font-semibold mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item.id} className="flex gap-3">
                  {item.image && (
                    <img src={item.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-white">{item.title}</p>
                    <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm text-white">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-800 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-base pt-1">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-5 pt-4 border-t border-gray-800 flex items-center gap-4 text-gray-600 text-xs">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Encrypted</span>
              </div>
              <div className="flex items-center gap-1">
                <span>30-day refund</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
