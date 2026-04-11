import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { usePlaylistContext } from '@/contexts/PlaylistContext';
import { usePlayer } from '@/components/GlobalPlayer';
import { useApp } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';

interface Product {
  id: string;
  handle: string;
  title: string;
  vendor?: string;
  product_type?: string;
  image?: string;
  price?: number;
  language?: string;
  artist?: string;
  author?: string;
  audio_url?: string;
  preview_url?: string;
  genre?: string;
}

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'featured';
}

const TYPE_COLORS: Record<string, string> = {
  Music:    'from-indigo-500 to-purple-600',
  Books:    'from-amber-500 to-orange-600',
  Videos:   'from-red-500 to-pink-600',
  Podcasts: 'from-green-500 to-teal-600',
  Courses:  'from-blue-500 to-cyan-600',
};

const TYPE_CONTENT: Record<string, 'music' | 'video' | 'audiobook' | 'podcast' | 'course'> = {
  Music:    'music',
  Videos:   'video',
  Books:    'audiobook',
  Podcasts: 'podcast',
  Courses:  'course',
};

export default function ProductCard({ product, variant = 'default' }: ProductCardProps) {
  const { addToCart }         = useCart();
  const { openAddToPlaylist } = usePlaylistContext();
  const { play }              = usePlayer();
  const { user }              = useApp();

  const [saved, setSaved] = useState(false);

  const price      = product.price ? product.price / 100 : 0;
  const isFree     = price === 0;
  const type       = product.product_type || 'Music';
  const gradient   = TYPE_COLORS[type] ?? TYPE_COLORS['Music'];
  const contentType = TYPE_CONTENT[type] ?? 'music';
  const creator    = product.artist || product.author || product.vendor;
  const previewUrl = product.preview_url || product.audio_url;

  // Load initial saved state for this track
  useEffect(() => {
    if (!user) return;
    supabase
      .from('saved_tracks')
      .select('id')
      .eq('user_id', user.id)
      .eq('track_id', product.id)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, product.id]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    const next = !saved;
    setSaved(next); // optimistic
    if (next) {
      await supabase.from('saved_tracks').insert([{
        user_id:      user.id,
        track_id:     product.id,
        content_type: contentType,
        title:        product.title,
        artist:       creator ?? null,
        cover_url:    product.image ?? null,
        audio_url:    product.audio_url ?? null,
      }]);
    } else {
      await supabase.from('saved_tracks').delete()
        .eq('user_id', user.id)
        .eq('track_id', product.id);
    }
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!previewUrl) return;
    play({
      id:       product.id,
      title:    product.title,
      artist:   creator ?? 'Unknown',
      albumArt: product.image,
      audioUrl: previewUrl,
      type:     contentType,
    });
  };

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openAddToPlaylist({
      track_id:     product.id,
      content_type: contentType,
      title:        product.title,
      artist:       creator,
      cover_url:    product.image,
      audio_url:    product.audio_url,
    });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({ id: product.id, title: product.title, price, image: product.image || '' });
  };

  const priceBadge = isFree ? (
    <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500 text-white font-bold">FREE</span>
  ) : (
    <span className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-600 text-white font-bold">${price.toFixed(2)}</span>
  );

  // ── Featured variant ────────────────────────────────────────────────────────

  if (variant === 'featured') {
    return (
      <Link
        to={`/products/${product.handle}`}
        className="group relative block rounded-2xl overflow-hidden aspect-[3/4] bg-gray-900"
      >
        {product.image && (
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs text-white bg-gradient-to-r ${gradient} mb-2`}>
            {type}
          </span>
          <h3 className="text-white font-bold text-lg leading-tight">{product.title}</h3>
          {creator && <p className="text-gray-300 text-sm mt-1">{creator}</p>}
          <div className="flex items-center justify-between mt-3">
            {priceBadge}
            <div className="flex items-center gap-1.5">
              {previewUrl && (
                <button
                  onClick={handlePreview}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  title="Preview"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              )}
              <button
                onClick={handleAddToCart}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg transition-colors"
              >
                {isFree ? 'Get Free' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ── Default variant ─────────────────────────────────────────────────────────

  return (
    <Link
      to={`/products/${product.handle}`}
      className="group block bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden hover:border-indigo-500/30 transition-all hover:-translate-y-0.5"
    >
      {/* Cover art */}
      <div className="relative aspect-square overflow-hidden bg-gray-800">
        {product.image ? (
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-white/50 text-4xl font-bold">{product.title?.[0] ?? '?'}</span>
          </div>
        )}

        {/* Type badge (top-left) */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-0.5 text-[10px] text-white rounded-full bg-gradient-to-r ${gradient}`}>
            {type}
          </span>
        </div>

        {/* Language badge (top-right) */}
        {product.language && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 text-[10px] text-white bg-black/50 rounded-full">
              {product.language}
            </span>
          </div>
        )}

        {/* Hover action buttons (bottom-right) */}
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {/* Save */}
          <button
            onClick={handleSave}
            title={saved ? 'Saved' : 'Save'}
            className={`p-2 rounded-lg transition-colors ${
              saved ? 'bg-indigo-600 text-white' : 'bg-gray-900/80 hover:bg-gray-700 text-white'
            }`}
          >
            <svg className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>

          {/* Preview */}
          {previewUrl && (
            <button
              onClick={handlePreview}
              title="Preview"
              className="bg-gray-900/80 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}

          {/* Add to playlist */}
          <button
            onClick={handleAddToPlaylist}
            title="Add to playlist"
            className="bg-gray-900/80 hover:bg-indigo-600 text-white p-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          </button>

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            title={isFree ? 'Get Free' : 'Add to Cart'}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Card footer */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white truncate">{product.title}</h3>
        {creator && <p className="text-xs text-gray-400 truncate mt-0.5">{creator}</p>}
        {product.genre && <p className="text-xs text-gray-500 truncate">{product.genre}</p>}
        <div className="mt-2">{priceBadge}</div>
      </div>
    </Link>
  );
}
