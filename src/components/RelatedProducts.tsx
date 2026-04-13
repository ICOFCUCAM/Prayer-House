import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Product {
  id:                string;
  handle:            string;
  title:             string;
  vendor?:           string;
  product_type:      string;
  cover_image_url?:  string;
  price?:            number;
  language?:         string;
  genre?:            string;
}

// ── Scoring ────────────────────────────────────────────────────────────────────

// Content-based relevance score: same genre > same language > same type > same creator
function score(candidate: Product, seed: Product): number {
  let s = 0;
  if (candidate.genre    && seed.genre    && candidate.genre    === seed.genre)    s += 4;
  if (candidate.language && seed.language && candidate.language === seed.language) s += 3;
  if (candidate.product_type?.toLowerCase() === seed.product_type?.toLowerCase())  s += 2;
  const seedCreator      = (seed.vendor || '').toLowerCase();
  const candidateCreator = (candidate.vendor || '').toLowerCase();
  if (seedCreator && candidateCreator && candidateCreator === seedCreator) s += 5;
  return s;
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  product:    Product;
  maxItems?:  number;
  className?: string;
}

export default function RelatedProducts({ product, maxItems = 6, className = '' }: Props) {
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!product) return;
    setLoading(true);

    // Fetch candidates: same type OR same language OR same genre, exclude self
    const conditions = [
      `product_type.ilike.${product.product_type?.split(' ')[0] || 'music'}%`,
    ];
    if (product.language) conditions.push(`language.eq.${product.language}`);
    if (product.genre)    conditions.push(`genre.ilike.%${product.genre}%`);

    supabase
      .from('ecom_products')
      .select('id,handle,title,vendor,product_type,cover_image_url,price,language,genre')
      .or(conditions.join(','))
      .eq('status', 'active')
      .neq('id', product.id)
      .limit(40)
      .then(({ data }) => {
        const candidates = (data ?? []) as Product[];
        // Score and sort
        const scored = candidates
          .map(c => ({ product: c, score: score(c, product) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, maxItems)
          .map(x => x.product);
        setRelated(scored);
        setLoading(false);
      });
  }, [product?.id]);

  if (!loading && related.length === 0) return null;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="w-4 h-4 text-[#00D9FF]" />
        <h3 className="text-white font-bold text-base">You might also like</h3>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {Array.from({ length: maxItems }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {related.map(p => {
            const image   = p.cover_image_url;
            const creator = p.vendor;
            const isFree  = !p.price || p.price === 0;

            return (
              <Link
                key={p.id}
                to={`/products/${p.handle}`}
                className="group block rounded-2xl overflow-hidden bg-[#0D1635] border border-white/5 hover:border-[#00D9FF]/30 transition-all hover:scale-[1.02]"
              >
                {/* Thumbnail */}
                <div className="aspect-square relative overflow-hidden">
                  {image ? (
                    <img
                      src={image}
                      alt={p.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1a2240] to-[#0D1635] flex items-center justify-center">
                      <span className="text-2xl opacity-30">🎵</span>
                    </div>
                  )}
                  {/* Price badge */}
                  <div className={`absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    isFree ? 'bg-emerald-500/90 text-white' : 'bg-black/60 text-white'
                  }`}>
                    {isFree ? 'FREE' : `$${((p.price || 0) / 100).toFixed(2)}`}
                  </div>
                </div>

                {/* Info */}
                <div className="px-2.5 py-2">
                  <p className="text-white text-[11px] font-semibold truncate leading-tight">{p.title}</p>
                  {creator && (
                    <p className="text-white/40 text-[10px] truncate mt-0.5">{creator}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
