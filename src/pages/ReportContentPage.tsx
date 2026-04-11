import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

type Category = {
  id: string;
  label: string;
  color: string;
  description: string;
  email: string;
};

const CATEGORIES: Category[] = [
  {
    id: 'copyright',
    label: 'Copyright Infringement',
    color: '#FFB800',
    description: 'Content that uses your music, artwork, book, or other creative work without permission.',
    email: 'copyright@wankong.com',
  },
  {
    id: 'hate-speech',
    label: 'Hate Speech or Harassment',
    color: '#EF4444',
    description: 'Content that promotes violence, discrimination, or harassment based on race, gender, religion, sexuality, or other protected characteristics.',
    email: 'trust@wankong.com',
  },
  {
    id: 'misinformation',
    label: 'Misinformation',
    color: '#F97316',
    description: 'Content spreading demonstrably false information that could cause harm, including health misinformation.',
    email: 'trust@wankong.com',
  },
  {
    id: 'spam',
    label: 'Spam or Fake Accounts',
    color: '#6B7280',
    description: 'Bot activity, duplicate accounts, artificially inflated metrics, or misleading creator profiles.',
    email: 'trust@wankong.com',
  },
  {
    id: 'explicit',
    label: 'Explicit or Harmful Content',
    color: '#9D4EDD',
    description: 'Content that is sexually explicit without proper age-gating, or that depicts real violence or self-harm.',
    email: 'trust@wankong.com',
  },
  {
    id: 'impersonation',
    label: 'Impersonation',
    color: '#00D9FF',
    description: 'Accounts or content pretending to be another real person, artist, brand, or organisation.',
    email: 'trust@wankong.com',
  },
];

const STEPS = [
  { n: '1', text: 'Choose the category that best describes the issue below.' },
  { n: '2', text: 'Gather the URL of the content or profile you are reporting.' },
  { n: '3', text: 'Email the relevant team with the URL, a description, and any supporting evidence.' },
  { n: '4', text: 'You will receive a confirmation within 24 hours. Investigations typically take 3–7 business days.' },
];

export default function ReportContentPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const cat = CATEGORIES.find(c => c.id === selected);

  return (
    <div className="min-h-screen bg-[#0A1128]">
      <Header />

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 text-sm px-4 py-1.5 rounded-full mb-5">
            Support
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Report Content</h1>
          <p className="text-gray-400">Last updated: April 11, 2026</p>
        </div>

        <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-2xl p-5 mb-10 text-sm text-gray-300 leading-relaxed">
          WANKONG is committed to keeping the platform safe and lawful. Use this page to report content or accounts that violate our Community Guidelines, Terms of Service, or applicable law.
        </div>

        {/* Steps */}
        <div className="mb-10">
          <h2 className="text-white font-semibold mb-4">How to Report</h2>
          <div className="space-y-3">
            {STEPS.map(s => (
              <div key={s.n} className="flex gap-4 items-start">
                <div className="w-7 h-7 rounded-full bg-[#00D9FF]/10 border border-[#00D9FF]/30 flex items-center justify-center shrink-0 text-[#00D9FF] text-xs font-bold">
                  {s.n}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed pt-0.5">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Category picker */}
        <h2 className="text-white font-semibold mb-4">Select a Report Category</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(selected === c.id ? null : c.id)}
              className={`text-left bg-white/5 border rounded-2xl p-4 transition-all ${
                selected === c.id ? 'border-opacity-100' : 'border-white/10 hover:border-white/20'
              }`}
              style={selected === c.id ? { borderColor: c.color } : {}}
            >
              <div className="font-semibold text-sm mb-1" style={{ color: c.color }}>{c.label}</div>
              <p className="text-gray-400 text-xs leading-relaxed">{c.description}</p>
            </button>
          ))}
        </div>

        {/* Selected action */}
        {cat && (
          <div
            className="rounded-2xl p-6 mb-8 border"
            style={{ backgroundColor: `${cat.color}10`, borderColor: `${cat.color}30` }}
          >
            <h3 className="font-semibold text-white mb-2">Report: {cat.label}</h3>
            <p className="text-gray-300 text-sm mb-4">
              Please email our team with the content URL, a brief description, and any screenshots or evidence.
            </p>
            <a
              href={`mailto:${cat.email}?subject=Report: ${encodeURIComponent(cat.label)}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: cat.color }}
            >
              Email {cat.email}
            </a>
          </div>
        )}

        {/* Emergency */}
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-2xl p-5">
          <h3 className="text-[#EF4444] font-semibold mb-2 text-sm">Emergency / Immediate Threat</h3>
          <p className="text-gray-300 text-xs leading-relaxed">
            If you believe there is an immediate threat to life or safety, please contact your local emergency services immediately. You may also email{' '}
            <a href="mailto:urgent@wankong.com" className="text-[#EF4444] underline">urgent@wankong.com</a>{' '}
            for escalated review — we monitor this address 24/7.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
