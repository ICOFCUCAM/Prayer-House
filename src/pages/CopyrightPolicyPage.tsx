import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SECTIONS = [
  {
    id: 'overview',
    title: '1. Overview',
    content: `WANKONG respects intellectual property rights and expects all users and creators to do the same. This Copyright Policy explains how we handle copyright in content uploaded to or streamed through the WANKONG platform, and the procedures for reporting infringement under the Digital Millennium Copyright Act (DMCA) and equivalent international laws.\n\nFor DMCA-specific takedown procedures, see also our DMCA Policy at wankong.com/dmca-policy.`,
  },
  {
    id: 'ownership',
    title: '2. Content Ownership',
    content: `When you upload content to WANKONG, you retain full ownership of your intellectual property. By uploading, you grant WANKONG a non-exclusive, royalty-free, worldwide licence to host, stream, distribute, and display your content solely for the purpose of operating the platform and delivering your content to users.\n\nThis licence ends when you delete your content from the platform, subject to cached copies that may persist for up to 30 days for CDN delivery purposes.`,
  },
  {
    id: 'prohibited',
    title: '3. Prohibited Content',
    bullets: [
      'Uploading music, books, videos, or podcasts you do not own or have not licensed.',
      'Using samples, beats, or instrumentals without appropriate licenses or clearances.',
      'Reproducing and distributing published works (books, articles) without the rights holder\'s permission.',
      'Re-uploading content that has previously been removed for copyright infringement.',
      'Circumventing Digital Rights Management (DRM) protections on any content.',
      'Distributing cover songs without obtaining the appropriate mechanical license.',
    ],
  },
  {
    id: 'reporting',
    title: '4. Reporting Infringement',
    content: `If you believe your copyrighted work has been uploaded to WANKONG without your permission, you may submit a copyright infringement notice to:\n\ncopyright@wankong.com\n\nYour notice must include:\n• Your name and contact information\n• Identification of the copyrighted work claimed to be infringed\n• URL or specific location of the infringing content on WANKONG\n• A statement of good faith belief that the use is not authorized\n• A statement that the information in the notice is accurate, under penalty of perjury\n• Your physical or electronic signature\n\nWe will respond to valid notices within 3–5 business days.`,
  },
  {
    id: 'counter-notice',
    title: '5. Counter-Notices',
    content: `If your content was removed due to a copyright notice you believe was filed in error or misidentification, you may submit a counter-notice to copyright@wankong.com. A valid counter-notice must include:\n\n• Your name and contact information\n• Identification of the removed content and its location before removal\n• A statement under penalty of perjury that you have a good faith belief the content was removed by mistake\n• Your consent to jurisdiction of the federal court in your district\n• Your physical or electronic signature\n\nUpon receiving a valid counter-notice, WANKONG will restore the content within 10–14 business days unless the original complainant files a court action.`,
  },
  {
    id: 'repeat-infringers',
    title: '6. Repeat Infringer Policy',
    content: `WANKONG maintains a repeat infringer policy. Accounts that receive three or more valid copyright infringement notices within a 12-month period will be permanently terminated. All content on the account will be removed, and earnings may be withheld pending investigation.\n\nCredible appeals can be submitted to legal@wankong.com within 30 days of account termination.`,
  },
  {
    id: 'licensed-content',
    title: '7. Licensed & Cleared Content',
    content: `WANKONG works with music publishers, PROs (Performing Rights Organisations), and CMOs (Collective Management Organisations) to ensure that streamed content is properly licensed. If you are a rights holder and wish to establish a licensing agreement with WANKONG, contact licensing@wankong.com.`,
  },
  {
    id: 'contact',
    title: '8. Copyright Contact',
    content: `Copyright infringement notices: copyright@wankong.com\nLicensing enquiries: licensing@wankong.com\nLegal matters: legal@wankong.com\n\nDesignated DMCA Agent: WANKONG Legal Team, copyright@wankong.com`,
  },
];

export default function CopyrightPolicyPage() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#0A1128]">
      <Header />

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 text-sm px-4 py-1.5 rounded-full mb-5">
            Legal
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Copyright Policy</h1>
          <p className="text-gray-400">Last updated: April 11, 2026</p>
        </div>

        <div className="bg-[#FFB800]/5 border border-[#FFB800]/20 rounded-2xl p-5 mb-10 text-sm text-gray-300 leading-relaxed">
          WANKONG takes copyright seriously. This policy explains content ownership, reporting procedures, and our repeat infringer policy. For DMCA takedown notices specifically, see our DMCA Policy.
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

                  {(s as any).bullets && (
                    <ul className="space-y-2">
                      {(s as any).bullets.map((b: string, i: number) => (
                        <li key={i} className="flex gap-3 text-sm text-gray-300">
                          <span className="text-[#FFB800] mt-0.5 shrink-0">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-gray-500 text-sm">
            Copyright concerns? Contact{' '}
            <a href="mailto:copyright@wankong.com" className="text-[#FFB800] hover:underline">
              copyright@wankong.com
            </a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
