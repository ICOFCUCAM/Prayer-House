import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

type Topic = {
  id: string;
  icon: string;
  title: string;
  faqs: { q: string; a: string }[];
};

const TOPICS: Topic[] = [
  {
    id: 'account',
    icon: '👤',
    title: 'Account & Sign In',
    faqs: [
      {
        q: 'How do I create a WANKONG account?',
        a: 'Visit wankong.com and click "Sign Up". You can register with your email address or continue with Google or Apple. After verifying your email, your account is ready to use.',
      },
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'On the sign-in screen, click "Forgot password?" and enter your email. You will receive a reset link within a few minutes. Check your spam folder if you do not see it.',
      },
      {
        q: 'How do I change my username or profile picture?',
        a: 'Go to Account Settings → Profile and update your details. Changes take effect immediately across the platform.',
      },
      {
        q: 'Can I have multiple WANKONG accounts?',
        a: 'Each person may have one standard account. Creators who need a separate artist profile can set this up within their existing account under Creator Tools.',
      },
    ],
  },
  {
    id: 'subscription',
    icon: '💳',
    title: 'Subscriptions & Billing',
    faqs: [
      {
        q: 'How do I upgrade my plan?',
        a: 'Go to Account Settings → Subscription → Upgrade. Select your desired plan and complete payment. Your new plan activates immediately.',
      },
      {
        q: 'Can I get a refund?',
        a: 'Monthly subscriptions are non-refundable for the current billing period. Annual subscriptions are eligible for a pro-rated refund within 14 days of renewal. See our Subscription Terms for full details.',
      },
      {
        q: 'How do I cancel my subscription?',
        a: 'Go to Account Settings → Subscription → Cancel Plan. You will retain access until the end of your current billing period.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'We accept Visa, Mastercard, Amex, PayPal, mobile money (M-Pesa, MTN MoMo, Airtel Money in supported markets), and USDT cryptocurrency.',
      },
    ],
  },
  {
    id: 'content',
    icon: '🎵',
    title: 'Playing & Downloading Content',
    faqs: [
      {
        q: 'Why is content not playing?',
        a: 'Check your internet connection. If on mobile data, ensure data is enabled for WANKONG. Try refreshing the page or restarting the app. If the issue persists, contact support.',
      },
      {
        q: 'How do I download music or eBooks for offline use?',
        a: 'Standard and Pro subscribers can download content. On the track or book page, tap the download icon. Downloaded content is available in your Library → Downloads.',
      },
      {
        q: 'How many devices can I use simultaneously?',
        a: 'Standard plan: 1 stream at a time. Pro plan: 2 simultaneous streams. Family plan: 6 independent streams (one per member).',
      },
      {
        q: 'Why has a track or book disappeared from the platform?',
        a: 'Content may be removed by the creator, by WANKONG for policy violations, or due to licensing changes. Purchased downloads remain in your library even if the content is removed from the platform.',
      },
    ],
  },
  {
    id: 'creators',
    icon: '🎤',
    title: 'Creators & Uploading',
    faqs: [
      {
        q: 'How do I upload music or a book?',
        a: 'Log in and navigate to Creator Tools → Upload. Select your content type, fill in the required metadata (title, genre, ISRC for music), and submit for review. Approval typically takes 24–48 hours.',
      },
      {
        q: 'When do I get paid?',
        a: 'Earnings are calculated at end of month and paid within 10 business days. Minimum payout threshold is $10 USD. See the Creator Monetization Policy for full details.',
      },
      {
        q: 'What file formats are supported?',
        a: 'Audio: MP3 (320kbps+), WAV, FLAC. Video: MP4 (H.264). eBooks: EPUB, PDF. Podcasts: MP3, M4A.',
      },
      {
        q: 'How do I enter the Talent Arena?',
        a: 'Go to Talent Arena and join or create a competition room. You can submit an entry video or audio clip. Votes from the community determine rankings. See competition terms for prize rules.',
      },
    ],
  },
  {
    id: 'technical',
    icon: '🔧',
    title: 'Technical Issues',
    faqs: [
      {
        q: 'The app is slow or crashing. What should I do?',
        a: 'Update the app to the latest version. Clear the cache via app settings. If issues continue, uninstall and reinstall. For web, try a different browser or clear browser cache.',
      },
      {
        q: 'Audio is cutting out or buffering.',
        a: 'Switch to a lower quality setting in Player Settings if you have a slow connection. On mobile, ensure background data is enabled for WANKONG. Try using headphones to rule out speaker issues.',
      },
      {
        q: 'How do I report a bug?',
        a: 'Use the in-app feedback button (menu → Report a Problem) or email bugs@wankong.com with a description of the issue and your device/browser details.',
      },
    ],
  },
];

export default function HelpCenterPage() {
  const [activeTopic, setActiveTopic] = useState<string>(TOPICS[0].id);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const topic = TOPICS.find(t => t.id === activeTopic)!;

  return (
    <div className="min-h-screen bg-[#0A1128]">
      <Header />

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-16">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black text-white mb-3">Help Centre</h1>
          <p className="text-gray-400 text-sm">Find answers to common questions about WANKONG</p>
        </div>

        {/* Topic tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {TOPICS.map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTopic(t.id); setOpenFaq(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTopic === t.id
                  ? 'bg-[#00D9FF] text-[#0A1128]'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:border-white/20'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.title}</span>
            </button>
          ))}
        </div>

        {/* FAQs */}
        <div className="space-y-2 mb-12">
          {topic.faqs.map((faq, i) => {
            const key = `${topic.id}-${i}`;
            return (
              <div key={key} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === key ? null : key)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium text-white text-sm">{faq.q}</span>
                  <span className="text-gray-400 text-xs ml-4 shrink-0">{openFaq === key ? '▲' : '▼'}</span>
                </button>
                {openFaq === key && (
                  <div className="px-6 pb-5">
                    <p className="text-gray-300 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contact */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <h2 className="text-white font-semibold text-lg mb-2">Still need help?</h2>
          <p className="text-gray-400 text-sm mb-6">Our support team typically responds within 24 hours.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href="mailto:support@wankong.com"
              className="px-5 py-2.5 bg-[#00D9FF] text-[#0A1128] rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Email Support
            </a>
            <a
              href="mailto:bugs@wankong.com"
              className="px-5 py-2.5 bg-white/10 border border-white/10 text-white rounded-xl text-sm font-semibold hover:bg-white/15 transition-colors"
            >
              Report a Bug
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
