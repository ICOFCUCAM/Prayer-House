import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import { usePlayer } from '@/components/GlobalPlayer';
import { usePlaylist } from '@/hooks/usePlaylist';
import { usePlaylistContext } from '@/contexts/PlaylistContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CommentsSection from '@/components/CommentsSection';
import RelatedProducts from '@/components/RelatedProducts';

const TYPE_COLORS: Record<string, string> = {
  music:    'from-indigo-500 to-purple-600',
  book:     'from-amber-500 to-orange-600',
  books:    'from-amber-500 to-orange-600',
  video:    'from-red-500 to-pink-600',
  videos:   'from-red-500 to-pink-600',
  podcast:  'from-green-500 to-teal-600',
  podcasts: 'from-green-500 to-teal-600',
  course:   'from-blue-500 to-cyan-600',
  courses:  'from-blue-500 to-cyan-600',
};

function toContentType(raw: string): 'music' | 'video' | 'audiobook' | 'podcast' | 'course' {
  const t = raw.toLowerCase();
  if (t === 'music')                          return 'music';
  if (t === 'video'  || t === 'videos')       return 'video';
  if (t === 'book'   || t === 'books')        return 'audiobook';
  if (t === 'podcast'|| t === 'podcasts')     return 'podcast';
  if (t === 'course' || t === 'courses')      return 'course';
  return 'music';
}

export default function ProductPage() {
  const { handle }                    = useParams<{ handle: string }>();
  const navigate                      = useNavigate();
  const { addToCart }                 = useCart();
  const { play, currentTrack, isPlaying, togglePlay } = usePlayer();
  const { saveTrack, unsaveTrack, isSaved }            = usePlaylist();
  const { openAddToPlaylist }         = usePlaylistContext();

  const [product,         setProduct]         = useState<any>(null);
  const [variants,        setVariants]        = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity,        setQuantity]        = useState(1);
  const [loading,         setLoading]         = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      const { data } = await supabase
        .from('ecom_products')
        .select('*')
        .eq('handle', handle)
        .single();
      if (data) {
        setProduct(data);
        const { data: varData } = await supabase
          .from('ecom_product_variants')
          .select('*')
          .eq('product_id', data.id);
        if (varData?.length) {
          setVariants(varData);
          setSelectedVariant(varData[0]);
        }
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

  const price       = selectedVariant ? selectedVariant.price / 100 : (product.price || 0) / 100;
  const isFree      = price === 0;
  const image       = product.images?.[0] || product.cover_art || product.cover_url;
  const rawType     = product.product_type?.toLowerCase() || '';
  const gradient    = TYPE_COLORS[rawType] || 'from-indigo-500 to-purple-600';
  const contentType = toContentType(rawType);
  const creator     = product.vendor || product.artist || product.author;
  const previewUrl  = product.preview_url || product.audio_url;
  const trackSaved  = isSaved(product.id);
  const isPreviewing = currentTrack?.id === product.id && isPlaying;

  // ── Actions ────────────────────────────────────────────────────────────────

  const handlePlay = () => {
    if (currentTrack?.id === product.id) { togglePlay(); return; }
    if (!previewUrl) return;
    play({
      id:       product.id,
      title:    product.title,
      artist:   creator || 'Unknown',
      albumArt: image   || undefined,
      cover:    image   || undefined,
      audioUrl: previewUrl,
      type:     contentType,
    });
  };

  const handleAddToCart = () => {
    addToCart({ id: product.id, title: product.title, price, image: image || '', variant: selectedVariant?.title });
  };

  const handleBuyNow = () => {
    addToCart({ id: product.id, title: product.title, price, image: image || '', variant: selectedVariant?.title });
    navigate('/cart');
  };

  const handleDownload = () => {
    const url = product.audio_url || product.preview_url;
    if (url) window.open(url, '_blank');
  };

  const handleSave = async () => {
    if (trackSaved) {
      await unsaveTrack(product.id);
    } else {
      await saveTrack({
        track_id:     product.id,
        content_type: contentType,
        title:        product.title,
        artist:       creator   || undefined,
        cover_url:    image     || undefined,
        audio_url:    product.audio_url || undefined,
      });
    }
  };

  const handleAddToPlaylist = () => {
    openAddToPlaylist({
      track_id:     product.id,
      content_type: contentType,
      title:        product.title,
      artist:       creator || undefined,
      cover_url:    image   || undefined,
      audio_url:    product.audio_url || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Header />
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12">

        <Link
          to="/collections/marketplace"
          className="text-sm text-gray-400 hover:text-white mb-6 inline-flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Marketplace
        </Link>

        <div className="grid md:grid-cols-2 gap-10 mt-4">

          {/* Cover art */}
          <div>
            {image ? (
              <img src={image} alt={product.title} className="w-full aspect-square object-cover rounded-2xl" />
            ) : (
              <div className={`w-full aspect-square rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <span className="text-white/30 text-6xl font-bold">{product.title?.[0]}</span>
              </div>
            )}
          </div>

          {/* Info panel */}
          <div>
            {/* Type + language badges */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs text-white font-medium bg-gradient-to-r ${gradient} capitalize`}>
                {product.product_type || rawType}
              </span>
              {product.language && (
                <span className="px-3 py-1 rounded-full text-xs text-gray-300 bg-gray-800">
                  {product.language}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold text-white mb-2">{product.title}</h1>
            {creator && <p className="text-gray-400 mb-4">by {creator}</p>}

            {product.body_html && (
              <p className="text-gray-300 leading-relaxed mb-6">{product.body_html}</p>
            )}

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {product.genre && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Genre</p>
                  <p className="text-sm text-white">{product.genre}</p>
                </div>
              )}
              {product.language && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Language</p>
                  <p className="text-sm text-white">{product.language}</p>
                </div>
              )}
              {product.duration && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="text-sm text-white">{product.duration}</p>
                </div>
              )}
              {product.pages && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Pages</p>
                  <p className="text-sm text-white">{product.pages}</p>
                </div>
              )}
            </div>

            {/* Variant selector */}
            {variants.length > 1 && (
              <div className="mb-5">
                <p className="text-sm text-gray-400 mb-2">Options</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedVariant?.id === v.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {v.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-4 mb-6">
              {isFree ? (
                <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 text-xl font-bold rounded-xl border border-emerald-500/30">
                  FREE
                </span>
              ) : (
                <p className="text-3xl font-bold text-white">${price.toFixed(2)}</p>
              )}
              {!isFree && (
                <div className="flex items-center gap-2 bg-gray-800 rounded-xl p-1">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-8 h-8 text-white hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
                  >
                    −
                  </button>
                  <span className="text-white w-6 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-8 h-8 text-white hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {/* ── Primary action buttons ── */}
            <div className="flex flex-wrap gap-3">

              {/* Play Preview — shown whenever a preview/audio URL exists */}
              {previewUrl && (
                <button
                  onClick={handlePlay}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-colors font-medium ${
                    isPreviewing
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    {isPreviewing
                      ? <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      : <path d="M8 5v14l11-7z" />
                    }
                  </svg>
                  {isPreviewing ? 'Pause' : 'Play Preview'}
                </button>
              )}

              {isFree ? (
                <>
                  {/* Download */}
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>

                  {/* Add to Library */}
                  <button
                    onClick={handleSave}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-colors ${
                      trackSaved
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'border border-gray-700 text-white hover:bg-gray-800'
                    }`}
                  >
                    <svg className="w-5 h-5" fill={trackSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    {trackSaved ? 'In Library' : 'Add to Library'}
                  </button>
                </>
              ) : (
                <>
                  {/* Add to Cart */}
                  <button
                    onClick={handleAddToCart}
                    className="flex items-center gap-2 px-5 py-3 border border-gray-700 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Add to Cart
                  </button>

                  {/* Buy Now */}
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
                  >
                    Buy Now — ${(price * quantity).toFixed(2)}
                  </button>
                </>
              )}
            </div>

            {/* ── Secondary actions ── */}
            <div className="flex gap-2 mt-4">
              {/* Save (for paid products, shown separately since library is primary for free) */}
              {!isFree && (
                <button
                  onClick={handleSave}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl transition-colors ${
                    trackSaved
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill={trackSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  {trackSaved ? 'Saved' : 'Save'}
                </button>
              )}

              {/* Add to Playlist */}
              <button
                onClick={handleAddToPlaylist}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-800 text-gray-400 hover:text-white rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add to Playlist
              </button>
            </div>
          </div>
        </div>

        {/* Related products */}
        <RelatedProducts product={product} className="mt-12 pt-8 border-t border-white/5" />

        {/* Comments */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <CommentsSection productId={product.id} />
        </div>
      </div>
      <Footer />
    </div>
  );
}
