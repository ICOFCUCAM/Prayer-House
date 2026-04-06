import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import GlobalPlayer from '@/components/GlobalPlayer';

// Pages (lazy loaded for better initial load performance)
const Index = React.lazy(() => import('@/pages/Index'));
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'));
const BookUploadPage = React.lazy(() => import('@/pages/BookUploadPage'));
const CollectionPage = React.lazy(() => import('@/pages/CollectionPage'));
const ProductPage = React.lazy(() => import('@/pages/ProductPage'));
const SearchPage = React.lazy(() => import('@/pages/SearchPage'));
const CartPage = React.lazy(() => import('@/pages/CartPage'));
const CheckoutPage = React.lazy(() => import('@/pages/CheckoutPage'));
const OrderConfirmation = React.lazy(() => import('@/pages/OrderConfirmation'));
const ArtistProfile = React.lazy(() => import('@/pages/ArtistProfile'));
const AuthorProfile = React.lazy(() => import('@/pages/AuthorProfile'));
const NotFound = React.lazy(() => import('@/pages/NotFound'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-lg">W</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Home */}
          <Route path="/" element={<Index />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Content Upload */}
          <Route path="/book-upload" element={<BookUploadPage />} />

          {/* Collections (music, books, videos, podcasts, talent-arena, artists, languages, …) */}
          <Route path="/collections/:handle" element={<CollectionPage />} />

          {/* Individual product/content */}
          <Route path="/products/:handle" element={<ProductPage />} />

          {/* Artist & Author Profiles */}
          <Route path="/artist/:id" element={<ArtistProfile />} />
          <Route path="/author/:id" element={<AuthorProfile />} />

          {/* Search */}
          <Route path="/search" element={<SearchPage />} />

          {/* Cart & Checkout */}
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      {/* Persistent music player — always rendered so playback survives navigation */}
      <GlobalPlayer />
    </>
  );
}
