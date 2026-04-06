import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) return;
    setLoading(true);
    supabase
      .from('ecom_products')
      .select('*')
      .or(`title.ilike.%${q}%,body_html.ilike.%${q}%,vendor.ilike.%${q}%,product_type.ilike.%${q}%,artist.ilike.%${q}%,author.ilike.%${q}%`)
      .eq('status', 'active')
      .limit(24)
      .then(({ data }) => {
        setResults(data || []);
        setLoading(false);
      });
  }, [q]);

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Search results for "{q}"</h1>
          {!loading && <p className="text-gray-400 mt-1">{results.length} results found</p>}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl aspect-square animate-pulse" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map(p => (
              <ProductCard key={p.id} product={{ ...p, image: p.images?.[0] || p.cover_art, price: p.variants?.[0]?.price || p.price }} />
            ))}
          </div>
        ) : q ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <p className="text-gray-400 text-lg">No results for "{q}"</p>
            <p className="text-gray-500 text-sm mt-1">Try a different search term</p>
            <Link to="/" className="inline-block mt-4 text-indigo-400 hover:text-indigo-300">Back to homepage</Link>
          </div>
        ) : null}
      </div>
      <Footer />
    </div>
  );
}
