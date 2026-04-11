import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import GlobalPlayer from './components/GlobalPlayer';
import ProtectedRoute from './components/ProtectedRoute';

const Index = lazy(() => import('./pages/Index'));
const NotFound = lazy(() => import('./pages/NotFound'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const CollectionPage = lazy(() => import('./pages/CollectionPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const BookUploadPage = lazy(() => import('./pages/BookUploadPage'));
const ArtistProfile = lazy(() => import('./pages/ArtistProfile'));
const AuthorProfile = lazy(() => import('./pages/AuthorProfile'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const DistributePage = lazy(() => import('./pages/DistributePage'));
const TalentArenaPage = lazy(() => import('./pages/TalentArenaPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const CareersPage = lazy(() => import('./pages/CareersPage'));
const PressPage = lazy(() => import('./pages/PressPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const DmcaPage = lazy(() => import('./pages/DmcaPage'));
const EbookMarketplacePage = lazy(() => import('./pages/EbookMarketplacePage'));
const MusicStorePage = lazy(() => import('./pages/MusicStorePage'));
const DistributeUploadPage = lazy(() => import('./pages/upload/DistributeUploadPage'));
const TalentArenaUploadPage = lazy(() => import('./pages/talent-arena/TalentArenaUploadPage'));
const TalentArenaRoomPage = lazy(() => import('./pages/talent-arena/TalentArenaRoomPage'));

// New Phase 2 pages
const ArtistPublicPage = lazy(() => import('./pages/artists/ArtistPublicPage'));
const AuthorDashboardPage = lazy(() => import('./pages/authors/AuthorDashboardPage'));
const EarningsDashboardPage = lazy(() => import('./pages/dashboard/EarningsDashboardPage'));
const MusicCollectionPage = lazy(() => import('./pages/collections/MusicCollectionPage'));
const BooksCollectionPage = lazy(() => import('./pages/collections/BooksCollectionPage'));
const VideosCollectionPage = lazy(() => import('./pages/collections/VideosCollectionPage'));
const PodcastsCollectionPage = lazy(() => import('./pages/collections/PodcastsCollectionPage'));
const TalentArenaCollectionPage = lazy(() => import('./pages/collections/TalentArenaCollectionPage'));
const ReleasesPage = lazy(() => import('./pages/distribution/ReleasesPage'));
const WatchPage = lazy(() => import('./pages/competition/WatchPage'));
const ResultsPage = lazy(() => import('./pages/competition/ResultsPage'));

const Spinner = () => (
  <div className="min-h-screen bg-[#0A1128] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function App() {
  return (
    <>
      <GlobalPlayer />
      <Suspense fallback={<Spinner />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/collections/:handle" element={<CollectionPage />} />
          <Route path="/products/:handle" element={<ProductPage />} />
          <Route path="/artist/:id" element={<ArtistProfile />} />
          <Route path="/author/:id" element={<AuthorProfile />} />
          <Route path="/talent-arena" element={<TalentArenaPage />} />
          <Route path="/talent-arena/room/:roomId" element={<TalentArenaRoomPage />} />
          <Route path="/ebook-marketplace" element={<EbookMarketplacePage />} />
          <Route path="/music-store" element={<MusicStorePage />} />

          {/* Company pages */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/press" element={<PressPage />} />
          <Route path="/terms-of-service" element={<TermsPage />} />
          <Route path="/privacy-policy" element={<PrivacyPage />} />
          <Route path="/dmca-policy" element={<DmcaPage />} />

          {/* Protected: any logged-in user */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/book-upload" element={<ProtectedRoute><BookUploadPage /></ProtectedRoute>} />
          <Route path="/distribute" element={<ProtectedRoute requiredRole={['creator','singer_artist','admin']}><DistributePage /></ProtectedRoute>} />
          <Route path="/upload/distribute" element={<ProtectedRoute><DistributeUploadPage /></ProtectedRoute>} />
          <Route path="/talent-arena/upload" element={<ProtectedRoute><TalentArenaUploadPage /></ProtectedRoute>} />

          {/* Phase 2 — Artists & Authors */}
          <Route path="/artists/:slug" element={<ArtistPublicPage />} />
          <Route path="/authors/dashboard" element={<ProtectedRoute><AuthorDashboardPage /></ProtectedRoute>} />
          <Route path="/dashboard/earnings" element={<ProtectedRoute><EarningsDashboardPage /></ProtectedRoute>} />

          {/* Phase 2 — Collections */}
          <Route path="/collections/music" element={<MusicCollectionPage />} />
          <Route path="/collections/books" element={<BooksCollectionPage />} />
          <Route path="/collections/videos" element={<VideosCollectionPage />} />
          <Route path="/collections/podcasts" element={<PodcastsCollectionPage />} />
          <Route path="/collections/talent-arena" element={<TalentArenaCollectionPage />} />

          {/* Phase 2 — Distribution */}
          <Route path="/distribution/releases" element={<ProtectedRoute><ReleasesPage /></ProtectedRoute>} />

          {/* Phase 2 — Competition */}
          <Route path="/competition/watch/:entryId" element={<WatchPage />} />
          <Route path="/competition/results/:roomId" element={<ResultsPage />} />

          {/* Protected: admin only */}
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPage /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
