import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SECTIONS = [
  {
    id: 'plans',
    title: '1. Subscription Plans',
    content: null,
    types: [
      {
        name: 'Free Tier',
        color: '#6B7280',
        description: 'Access to limited streaming, community features, and public Talent Arena rooms. Ad-supported. No offline listening.',
      },
      {
        name: 'WANKONG Standard',
        color: '#00D9FF',
        description: 'Full streaming library, offline downloads, HD audio quality, eBook reader access. Billed monthly or annually.',
      },
      {
        name: 'WANKONG Pro',
        color: '#9D4EDD',
        description: 'Everything in Standard plus creator tools, advanced analytics, priority distribution, reduced platform fees, and early access to new features.',
      },
      {
        name: 'WANKONG Family',
        color: '#00F5A0',
        description: 'Up to 6 individual Standard accounts under one billing. Each member maintains a separate profile, playlist, and library.',
      },
    ],
  },
  {
    id: 'billing',
    title: '2. Billing & Payment',
    content: `Subscriptions are billed in advance on the date you subscribe. Annual subscriptions are charged in full at the start of each billing year.\n\nAccepted payment methods:\n• Major credit/debit cards (Visa, Mastercard, Amex)\n• PayPal\n• Mobile money (M-Pesa, MTN MoMo, Airtel Money — where available)\n• Cryptocurrency (USDT on supported networks)\n\nAll prices are displayed in USD unless you have selected a local currency. Currency conversion rates are determined at the time of transaction. WANKONG does not add currency conversion fees; your bank may.`,
  },
  {
    id: 'trials',
    title: '3. Free Trials',
    content: `New subscribers may be eligible for a 30-day free trial of WANKONG Standard or Pro. Trial eligibility is determined at sign-up and is limited to one trial per person, per payment method, and per household.\n\nYour chosen payment method will be charged automatically at the end of the trial period unless you cancel before the trial expires. We will send a reminder email 3 days before your trial ends.`,
  },
  {
    id: 'cancellation',
    title: '4. Cancellation & Refunds',
    content: `You may cancel your subscription at any time via Account Settings → Subscription → Cancel Plan. Cancellation takes effect at the end of your current billing period — you retain access until then.\n\nRefund policy:\n• Monthly subscriptions: No refunds are issued for partial months.\n• Annual subscriptions: A pro-rated refund is available within 14 days of the annual billing date if you have not used more than 5% of your annual term. After 14 days, no refund is issued.\n• Trials: No refund is required for trial periods — simply cancel before the trial ends.\n\nRefund requests must be submitted to billing@wankong.com. Please include your account email and order reference.`,
  },
  {
    id: 'price-changes',
    title: '5. Price Changes',
    content: `WANKONG may update subscription pricing. We will notify you by email and in-app notification at least 30 days before any price increase takes effect. If you do not cancel before the new price takes effect, you agree to the updated pricing.\n\nPrice changes do not affect the current billing period — they take effect from your next renewal date.`,
  },
  {
    id: 'family-sharing',
    title: '6. Family Plan Rules',
    content: `The WANKONG Family plan is intended for members of the same household. WANKONG reserves the right to verify household membership and may convert accounts found to be in violation to individual Standard subscriptions without a refund of the price difference.\n\nEach family member has their own login, library, and listening history. The primary account holder manages billing and can add or remove members at any time.`,
  },
  {
    id: 'termination',
    title: '7. Account Termination',
    content: `WANKONG may terminate or suspend your subscription if you violate the Community Guidelines, Terms of Service, or this Subscription Terms agreement. In cases of serious violations, no refund will be issued.\n\nIf WANKONG discontinues the subscription service entirely, all active subscribers will receive a pro-rated refund for the unused portion of their subscription term.`,
  },
  {
    id: 'contact',
    title: '8. Contact',
    content: `For billing support, contact billing@wankong.com. For general subscription questions, visit our Help Centre at wankong.com/help.`,
  },
];

export default function SubscriptionTermsPage() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#0A1128]">
      <Header />

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 text-sm px-4 py-1.5 rounded-full mb-5">
            Legal
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Subscription Terms</h1>
          <p className="text-gray-400">Last updated: April 11, 2026</p>
        </div>

        <div className="bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 rounded-2xl p-5 mb-10 text-sm text-gray-300 leading-relaxed">
          These terms govern your WANKONG subscription, including billing cycles, cancellation rights, refund eligibility, and plan-specific rules.
        </div>

        <div className="space-y-2">
          {SECTIONS.map(s => (
            <div key={s.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <button
                onClick={() => setActive(active === s.id ? null : s.id)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-medium text-white text-sm">{s.title}</span>
                <span className="text-gray-400 text-xs">{active === s.id ? '▲' : '▼'}</span>
              </button>

              {active === s.id && (
                <div className="px-6 pb-6">
                  {s.content && (
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{s.content}</p>
                  )}

                  {(s as any).types && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {(s as any).types.map((t: any) => (
                        <div
                          key={t.name}
                          className="bg-white/5 border border-white/10 rounded-xl p-4"
                          style={{ borderLeftColor: t.color, borderLeftWidth: 3 }}
                        >
                          <h3 className="font-semibold text-sm mb-2" style={{ color: t.color }}>{t.name}</h3>
                          <p className="text-gray-300 text-xs leading-relaxed">{t.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-gray-500 text-sm">
            Billing questions? Contact{' '}
            <a href="mailto:billing@wankong.com" className="text-[#9D4EDD] hover:underline">
              billing@wankong.com
            </a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
