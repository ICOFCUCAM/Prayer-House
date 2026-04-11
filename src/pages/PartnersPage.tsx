import React from 'react';
import { useParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

type PartnerType = {
  title: string;
  subtitle: string;
  color: string;
  description: string;
  benefits: string[];
  requirements: string[];
  cta: string;
  email: string;
};

const PARTNER_TYPES: Record<string, PartnerType> = {
  labels: {
    title: 'Record Labels',
    subtitle: 'For independent and major labels',
    color: '#00D9FF',
    description: 'WANKONG partners with record labels to bring their full catalogues to our streaming and distribution platform, reaching millions of listeners across Africa, the diaspora, and the world.',
    benefits: [
      'Bulk upload tools for large catalogues',
      'Dedicated label dashboard with per-artist analytics',
      'Priority placement in curated playlists',
      'Custom royalty splits for label-managed artists',
      'Early access to new distribution territories',
      'Direct support from a WANKONG partnerships manager',
    ],
    requirements: [
      'Registered legal entity with music publishing rights',
      'Minimum catalogue of 20 tracks',
      'Ability to provide complete metadata (ISRC, UPC, credits)',
      'Agreement to WANKONG Distribution Agreement',
    ],
    cta: 'Apply for Label Partnership',
    email: 'labels@wankong.com',
  },
  publishers: {
    title: 'Publishers',
    subtitle: 'For book and content publishers',
    color: '#9D4EDD',
    description: 'Partner with WANKONG to distribute your eBook and audiobook catalogue on the fastest-growing cultural platform for African and diaspora content. Reach readers who are hungry for authentic, local stories.',
    benefits: [
      'Dedicated publisher portal for catalogue management',
      'Revenue share on eBook sales and reads',
      'Audiobook co-production opportunities',
      'Genre-specific marketing campaigns',
      'Integration with existing distribution pipelines (ONIX support)',
      'Monthly royalty statements with per-title breakdowns',
    ],
    requirements: [
      'Registered publishing entity',
      'Rights to distribute in target territories',
      'EPUB or PDF files with complete metadata',
      'Minimum 10 titles to onboard',
    ],
    cta: 'Apply for Publisher Partnership',
    email: 'publishers@wankong.com',
  },
  brands: {
    title: 'Brand Partners',
    subtitle: 'For advertisers and sponsors',
    color: '#00F5A0',
    description: 'WANKONG offers brand partnership opportunities that connect you with a deeply engaged audience of music lovers, readers, and creators. Our ad-free premium model means brand integrations feel native, not intrusive.',
    benefits: [
      'Sponsored Talent Arena competitions with branded prize pools',
      'Editorial placements in curated collections and newsletters',
      'Creator-led branded content campaigns',
      'Event co-sponsorship for WANKONG live events',
      'Data insights on audience demographics and engagement',
      'Brand safety controls with WANKONG Trust team oversight',
    ],
    requirements: [
      'Brand must align with WANKONG values (music, culture, education, creativity)',
      'Minimum campaign budget of $5,000 USD',
      'No tobacco, gambling, or misleading financial product brands',
      'Agreement to WANKONG Brand Partnership Terms',
    ],
    cta: 'Explore Brand Partnerships',
    email: 'brands@wankong.com',
  },
  distributors: {
    title: 'Distribution Partners',
    subtitle: 'For digital distributors and aggregators',
    color: '#FFB800',
    description: 'If you operate a music or content distribution platform, integrate with WANKONG to deliver your clients\' content to our growing audience. We offer API access and white-label solutions for distributors of all sizes.',
    benefits: [
      'API integration for automated catalogue delivery',
      'Bulk metadata ingestion (CSV, DDEX, ONIX)',
      'Revenue reporting API for your artist dashboard',
      'Co-marketing to your existing client base',
      'Dedicated technical integration support',
      'Preferred royalty rates for high-volume partners',
    ],
    requirements: [
      'Existing distribution operations with 100+ artist clients',
      'Technical team capable of API integration',
      'Agreement to WANKONG Distribution Partner Agreement',
      'Content quality and metadata standards compliance',
    ],
    cta: 'Apply for Distribution Partnership',
    email: 'distribution@wankong.com',
  },
};

const DEFAULT_TYPE: PartnerType = {
  title: 'WANKONG Partners',
  subtitle: 'For labels, publishers, brands, and distributors',
  color: '#00D9FF',
  description: 'WANKONG partners with organisations across the creative and business ecosystem to expand access to African and diaspora culture worldwide. Explore our partnership programmes below.',
  benefits: [
    'Labels: wankong.com/partners/labels',
    'Publishers: wankong.com/partners/publishers',
    'Brands: wankong.com/partners/brands',
    'Distributors: wankong.com/partners/distributors',
  ],
  requirements: [],
  cta: 'General Partnership Enquiry',
  email: 'partners@wankong.com',
};

export default function PartnersPage() {
  const { type } = useParams<{ type: string }>();
  const partner = (type && PARTNER_TYPES[type]) ? PARTNER_TYPES[type] : DEFAULT_TYPE;

  return (
    <div className="min-h-screen bg-[#0A1128]">
      <Header />

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 text-sm px-4 py-1.5 rounded-full mb-5">
            Partnerships
          </div>
          <h1 className="text-4xl font-black text-white mb-2">{partner.title}</h1>
          <p className="text-gray-400 text-sm mb-4">{partner.subtitle}</p>
          <p className="text-gray-300 leading-relaxed">{partner.description}</p>
        </div>

        {/* Partner type tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {Object.entries(PARTNER_TYPES).map(([key, p]) => (
            <a
              key={key}
              href={`/partners/${key}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                type === key
                  ? 'text-[#0A1128] border-transparent'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
              }`}
              style={type === key ? { backgroundColor: p.color, borderColor: p.color } : {}}
            >
              {p.title}
            </a>
          ))}
        </div>

        {/* Benefits */}
        {partner.benefits.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-semibold mb-4">Partnership Benefits</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <ul className="space-y-3">
                {partner.benefits.map((b, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-300">
                    <span className="mt-0.5 shrink-0" style={{ color: partner.color }}>✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Requirements */}
        {partner.requirements.length > 0 && (
          <div className="mb-10">
            <h2 className="text-white font-semibold mb-4">Requirements</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <ul className="space-y-3">
                {partner.requirements.map((r, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-300">
                    <span className="text-gray-500 mt-0.5 shrink-0">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* CTA */}
        <div
          className="rounded-2xl p-6 text-center border"
          style={{ backgroundColor: `${partner.color}10`, borderColor: `${partner.color}30` }}
        >
          <h3 className="text-white font-semibold mb-2">{partner.cta}</h3>
          <p className="text-gray-400 text-sm mb-4">
            Send us an introduction email and we will be in touch within 3 business days.
          </p>
          <a
            href={`mailto:${partner.email}?subject=${encodeURIComponent(partner.cta)}`}
            className="inline-flex px-6 py-2.5 rounded-xl text-sm font-semibold text-[#0A1128] hover:opacity-90 transition-opacity"
            style={{ backgroundColor: partner.color }}
          >
            Email {partner.email}
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
