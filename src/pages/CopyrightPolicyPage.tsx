import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function CopyrightPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0A1128] text-white flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-white/10 py-16">
          <div className="max-w-4xl mx-auto px-4 lg:px-8">
            <p className="text-[#FF6B00] text-sm font-semibold uppercase tracking-widest mb-3">Legal</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Copyright Policy</h1>
            <p className="text-white/60 text-lg">Last updated: April 2026</p>
            <p className="mt-6 text-white/80 text-lg leading-relaxed">
              WANKONG respects the rights of creators and copyright owners. This policy explains our commitment
              to copyright, what creators are responsible for, and the procedures for reporting and resolving
              copyright infringement on the platform.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/dmca-policy"
                className="px-4 py-2 bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF6B00] rounded-lg text-sm hover:bg-[#FF6B00]/20 transition-colors"
              >
                Formal DMCA Procedure →
              </Link>
              <a
                href="mailto:copyright@wankong.com"
                className="px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-lg text-sm hover:bg-white/10 transition-colors"
              >
                copyright@wankong.com
              </a>
            </div>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16 space-y-12">

          {/* 1. Commitment */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FF6B00]">1. WANKONG's Commitment to Copyright</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              WANKONG is a platform built by creators for creators. We believe that intellectual property rights
              are fundamental to a healthy creator economy. We take copyright seriously — not only as a legal
              obligation, but because protecting creators' works is core to our mission.
            </p>
            <p className="text-white/70 leading-relaxed">
              WANKONG complies with applicable copyright laws and has implemented policies and processes to
              address copyright infringement on our platform promptly and fairly. We expect all users — whether
              they upload one song or publish a hundred books — to share this commitment.
            </p>
          </section>

          {/* 2. Creator Responsibility */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FF6B00]">2. Creator Responsibility</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Every creator who uploads content to WANKONG represents and warrants the following:
            </p>
            <div className="space-y-3">
              {[
                'You own all rights (or hold valid licences) to every element of the content you upload, including the master recording, underlying composition, lyrics, artwork, and any samples or interpolations.',
                'You have obtained all mechanical licences, sync licences, and any other required clearances for the content.',
                'The content does not infringe any third-party copyright, trademark, or other intellectual property right.',
                'You have the authority to grant WANKONG the display and distribution licences described in our Terms of Service.',
              ].map((item, i) => (
                <div key={i} className="flex gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#FF6B00]/15 border border-[#FF6B00]/30 text-[#FF6B00] text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <p className="text-white/65 text-sm leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Reporting Infringement */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FF6B00]">3. Reporting Copyright Infringement</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              If you believe your copyrighted work has been uploaded to WANKONG without authorisation, you may
              file a copyright infringement claim by emailing{' '}
              <a href="mailto:copyright@wankong.com" className="text-[#00D9FF] hover:underline">
                copyright@wankong.com
              </a>
              . Your claim must include all of the following:
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
              {[
                { label: 'Description of the work', detail: 'A clear description of the copyrighted work you claim has been infringed (e.g. "My song \'Sunset\' released on my album \'Horizon\' in 2024").' },
                { label: 'Infringing URL', detail: 'The URL or content ID of the infringing material on WANKONG so we can locate it promptly.' },
                { label: 'Your contact information', detail: 'Your full name, email address, and phone number so we can respond to your claim.' },
                { label: 'Statement of authority', detail: 'A statement that you are the copyright owner, or are authorised to act on behalf of the copyright owner, with respect to the work in question.' },
                { label: 'Good faith statement', detail: 'A statement that you have a good faith belief that the use of the work is not authorised by the copyright owner, its agent, or the law.' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="font-semibold text-[#FF6B00] text-sm">{item.label}</p>
                  <p className="text-white/60 text-sm mt-0.5">{item.detail}</p>
                </div>
              ))}
            </div>
            <p className="text-white/50 text-xs mt-4">
              For formal DMCA notices with the legal declaration of accuracy and perjury statement, please use
              our DMCA procedure at{' '}
              <Link to="/dmca-policy" className="text-[#00D9FF] hover:underline">/dmca-policy</Link>.
            </p>
          </section>

          {/* 4. Takedown Procedure */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FF6B00]">4. Takedown Procedure</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              Upon receiving a valid copyright claim, WANKONG will:
            </p>
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-white/10" />
              {[
                { step: 'Review the claim', detail: 'WANKONG\'s copyright team reviews the claim within 48 hours of receipt to assess its validity.' },
                { step: 'Notify the uploader', detail: 'The creator who uploaded the content is notified that a copyright claim has been made against their content.' },
                { step: 'Remove the content', detail: 'If the claim is valid on its face, the content is disabled or removed from the platform.' },
                { step: 'Notify the claimant', detail: 'The claimant is informed that the content has been acted upon.' },
              ].map((item, i) => (
                <div key={item.step} className="relative flex gap-5 pl-2 pb-5">
                  <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-[#FF6B00]/20 border border-[#FF6B00]/40 flex items-center justify-center text-[#FF6B00] text-sm font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="font-semibold text-white text-sm">{item.step}</p>
                    <p className="text-white/55 text-sm mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. Counter-Notice */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FF6B00]">5. Counter-Notice Procedure</h2>
            <p className="text-white/70 leading-relaxed mb-4">
              If you are a creator whose content was removed and you believe the removal was in error — for
              example, because you hold a valid licence or the claim was incorrect — you may file a
              counter-notice. To submit a counter-notice, email{' '}
              <a href="mailto:copyright@wankong.com" className="text-[#00D9FF] hover:underline">
                copyright@wankong.com
              </a>{' '}
              with the subject line "Counter-Notice" and include:
            </p>
            <ul className="space-y-2">
              {[
                'The URL or content ID of the removed content',
                'Your full name and contact information',
                'A statement that you consent to the jurisdiction of the relevant court',
                'A statement under penalty of perjury that the content was removed by mistake or misidentification',
                'Any evidence of your rights to the content (licence agreements, original files, etc.)',
              ].map((item, i) => (
                <li key={i} className="flex gap-3 text-white/65 text-sm">
                  <span className="text-[#FF6B00] flex-shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-white/55 text-sm mt-4">
              If the counter-notice is valid, WANKONG will forward it to the original claimant. If the
              claimant does not initiate legal proceedings within 10–14 business days, the content may be
              reinstated.
            </p>
          </section>

          {/* 6. Repeat Offender Policy */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FF6B00]">6. Repeat Offender Policy</h2>
            <div className="bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-xl p-5">
              <p className="text-white/75 text-sm leading-relaxed mb-4">
                WANKONG operates a three-strikes repeat offender policy for copyright violations:
              </p>
              <div className="space-y-3">
                {[
                  { strike: 'Strike 1', result: 'Content removed. Formal warning issued to account.' },
                  { strike: 'Strike 2', result: 'Content removed. Temporary account suspension (30 days). Upload privileges restricted.' },
                  { strike: 'Strike 3', result: 'Permanent account ban. All earnings under review. Account reported if required by law.' },
                ].map((s) => (
                  <div key={s.strike} className="flex gap-4">
                    <span className="flex-shrink-0 px-2 py-0.5 bg-[#FF6B00]/30 text-[#FF6B00] text-xs font-bold rounded">{s.strike}</span>
                    <span className="text-white/65 text-sm">{s.result}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 7. Content Removal Timeline */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FF6B00]">7. Content Removal Timeline</h2>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#FF6B00]">48–72</p>
                <p className="text-white/50 text-sm">hours</p>
              </div>
              <div className="text-white/65 text-sm leading-relaxed">
                WANKONG aims to review and act on all valid copyright claims within 48–72 hours of receipt.
                Complex claims involving multiple works, unclear ownership, or disputed licences may take
                longer. Claimants will be notified if additional time is needed.
              </div>
            </div>
          </section>

          {/* 8. Safe Harbour */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FF6B00]">8. Safe Harbour</h2>
            <p className="text-white/70 leading-relaxed">
              WANKONG operates as a user-content platform and qualifies for safe harbour protection under
              applicable law (including the DMCA in the United States and equivalent provisions in other
              jurisdictions) for content uploaded by users, provided WANKONG acts in good faith on valid
              takedown notices. WANKONG does not pre-screen all user-uploaded content and is not liable for
              infringing content uploaded by users where it is unaware of the infringement and acts promptly
              upon notice.
            </p>
          </section>

          {/* 9. Musical Works */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FF6B00]">9. Musical Works: Covers, Samples, Remixes</h2>
            <div className="space-y-4">
              {[
                {
                  title: 'Cover Songs',
                  body: 'To upload a cover song to WANKONG for streaming or distribution, you must hold a valid mechanical licence for the underlying composition. WANKONG does not obtain mechanical licences on behalf of creators. Cover songs without mechanical licences will be removed upon notice.',
                },
                {
                  title: 'Samples',
                  body: 'Using an unlicensed sample in your music is a copyright violation. All samples — whether audio recordings or underlying compositions — must be cleared before upload. WANKONG is not responsible for sampling disputes arising from improperly cleared samples.',
                },
                {
                  title: 'Remixes',
                  body: 'Remixes of third-party works require the permission of both the master recording owner (typically the label or original artist) and the composition owner (publisher/songwriter). Fan remixes without permission are not permitted on WANKONG even if they are non-commercial.',
                },
              ].map((item) => (
                <div key={item.title} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 10. DMCA Link */}
          <section className="bg-gradient-to-r from-[#FF6B00]/10 to-transparent border border-[#FF6B00]/20 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-3 text-[#FF6B00]">10. Formal DMCA Procedure</h2>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              If you need to file a formal DMCA takedown notice — including the full legal declaration required
              under the Digital Millennium Copyright Act — please refer to our dedicated DMCA Policy page,
              which includes the required form language and our registered DMCA agent's contact information.
            </p>
            <Link
              to="/dmca-policy"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              View DMCA Policy →
            </Link>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
