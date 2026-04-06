import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import { usePlayer } from '@/components/GlobalPlayer';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ProductPage() {
  const { handle } = useParams<{ handle: string }>();
  const { addToCart } = useCart();
  const { playTrack } = usePlayer();
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      const { data } = await supabase.from('ecom_products').select('*').eq('handle', handle).single();
      if (data) {
        setProduct(data);
        const { data: varData } = await supabase.from('ecom_product_variants').select('*').eq('product_id', data.id);
        if (varData?.length) { setVariants(varData); setSelectedVariant(varData[0]); }
      }
      setLoading(false);
    }
    fetchProduct();
  }, [handle]);

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400 text-lg mb-4">Product not found</p>
        <Link to="/" className="text-indigo-400 hover:text-indigo-300">← Go back home</Link>
      </div>
    </div>
  );

  const price = selectedVariant ? selectedVariant.price / 100 : (product.price || 0) / 100;
  const image = product.images?.[0] || product.cover_art;
  const type = product.product_type?.toLowerCase() || '';

  const handleAddToCart = () => {
    addToCart({ id: product.id, title: product.title, price, image: image || '', variant: selectedVariant?.title });
  };

  const handlePlay = () => {
    if (product.audio_url) {
      playTrack({ id: product.id, title: product.title, artist: product.vendor || product.artist || 'Unknown', cover: image || '', audioUrl: product.audio_url });
    }
  };

  const TYPE_COLORS: Record<string, string> = {
    music: 'from-indigo-500 to-purple-600',
    book: 'from-amber-500 to-orange-600',
    video: 'from-red-500 to-pink-600',
    podcast: 'from-green-500 to-teal-600',
  };
  const gradient = TYPE_COLORS[type] || 'from-indigo-500 to-purple-600';

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Header />
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12">
        <Link to="/" className="text-sm text-gray-400 hover:text-white mb-6 inline-flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>

        <div className="grid md:grid-cols-2 gap-10 mt-4">
          {/* Image */}
          <div>
            {image ? (
              <img src={image} alt={product.title} className="w-full aspect-square object-cover rounded-2xl" />
            ) : (
              <div className={`w-full aspect-square rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <span className="text-white/30 text-6xl font-bold">{product.title?.[0]}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs text-white font-medium bg-gradient-to-r ${gradient} capitalize`}>{product.product_type || type}</span>
              {product.language && <span className="px-3 py-1 rounded-full text-xs text-gray-300 bg-gray-800">{product.language}</span>}
            </div>

            <h1 className="text-3xl font-bold text-white mb-2">{product.title}</h1>
            {(product.vendor || product.artist || product.author) && (
              <p className="text-gray-400 mb-4">by {product.artist || product.author || product.vendor}</p>
            )}

            {product.body_html && (
              <p className="text-gray-300 leading-relaxed mb-6">{product.body_html}</p>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {product.genre && <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500">Genre</p><p className="text-sm text-white">{product.genre}</p></div>}
              {product.language && <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500">Language</p><p className="text-sm text-white">{product.language}</p></div>}
              {product.duration && <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500">Duration</p><p className="text-sm text-white">{product.duration}</p></div>}
              {product.pages && <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500">Pages</p><p className="text-sm text-white">{product.pages}</p></div>}
            </div>

            {/* Variants */}
            {variants.length > 1 && (
              <div className="mb-5">
                <p className="text-sm text-gray-400 mb-2">Options</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map(v => (
                    <button key={v.id} onClick={() => setSelectedVariant(v)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedVariant?.id === v.id ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                      {v.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price & quantity */}
            <div className="flex items-center gap-4 mb-6">
              <p className="text-3xl font-bold text-white">{price > 0 ? `$${price.toFixed(2)}` : 'Free'}</p>
              {price > 0 && (
                <div className="flex items-center gap-2 bg-gray-800 rounded-xl p-1">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 text-white hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors">−</button>
                  <span className="text-white w-6 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} className="w-8 h-8 text-white hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors">+</button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {product.audio_url && (
                <button onClick={handlePlay} className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  Preview
                </button>
              )}
              <button onClick={handleAddToCart} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors">
                {price > 0 ? 'Add to Cart' : 'Get for Free'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
