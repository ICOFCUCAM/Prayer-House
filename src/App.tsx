import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import GlobalPlayer from './components/GlobalPlayer';
import ProtectedRoute from './components/ProtectedRoute';

// ── Public pages ───────────────────────────────────────────────────────────────
const Index              = lazy(() => import('./pages/Index'));
const NotFound           = lazy(() => import('./pages/NotFound'));
const CartPage           = lazy(() => import('./pages/CartPage'));
const CheckoutPage       = lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmation  = lazy(() => import('./pages/OrderConfirmation'));
const SearchPage         = lazy(() => import('./pages/SearchPage'));
const CollectionPage     = lazy(() => import('./pages/CollectionPage'));
const ProductPage        = lazy(() => import('./pages/ProductPage'));
const BookUploadPage     = lazy(() => import('./pages/BookUploadPage'));
const ArtistProfile      = lazy(() => import('./pages/ArtistProfile'));
const AuthorProfile      = lazy(() => import('./pages/AuthorProfile'));
const DistributePage     = lazy(() => import('./pages/DistributePage'));
const TalentArenaPage    = lazy(() => import('./pages/TalentArenaPage'));
const AboutPage          = lazy(() => import('./pages/AboutPage'));
const CareersPage        = lazy(() => import('./pages/CareersPage'));
const PressPage          = lazy(() => import('./pages/PressPage'));
const TermsPage          = lazy(() => import('./pages/TermsPage'));
const PrivacyPage        = lazy(() => import('./pages/PrivacyPage'));
const DmcaPage           = lazy(() => import('./pages/DmcaPage'));
const EbookMarketplacePage = lazy(() => import('./pages/EbookMarketplacePage'));
const MusicStorePage     = lazy(() => import('./pages/MusicStorePage'));
const DistributeUploadPage   = lazy(() => import('./pages/upload/DistributeUploadPage'));
const TalentArenaUploadPage  = lazy(() => import('./pages/talent-arena/TalentArenaUploadPage'));
const TalentArenaRoomPage    = lazy(() => import('./pages/talent-arena/TalentArenaRoomPage'));

// ── Phase 2 pages ──────────────────────────────────────────────────────────────
const ArtistPublicPage          = lazy(() => import('./pages/artists/ArtistPublicPage'));
const AuthorDashboardPage       = lazy(() => import('./pages/authors/AuthorDashboardPage'));
const EarningsDashboardPage     = lazy(() => import('./pages/dashboard/EarningsDashboardPage'));
const MusicCollectionPage       = lazy(() => import('./pages/collections/MusicCollectionPage'));
const BooksCollectionPage       = lazy(() => import('./pages/collections/BooksCollectionPage'));
const VideosCollectionPage      = lazy(() => import('./pages/collections/VideosCollectionPage'));
const PodcastsCollectionPage    = lazy(() => import('./pages/collections/PodcastsCollectionPage'));
const TalentArenaCollectionPage = lazy(() => import('./pages/collections/TalentArenaCollectionPage'));
const ReleasesPage              = lazy(() => import('./pages/distribution/ReleasesPage'));
const WatchPage                 = lazy(() => import('./pages/competition/WatchPage'));
const ResultsPage               = lazy(() => import('./pages/competition/ResultsPage'));

// ── Legal & utility pages ──────────────────────────────────────────────────────
const CookiePolicyPage              = lazy(() => import('./pages/CookiePolicyPage'));
const CommunityGuidelinesPage       = lazy(() => import('./pages/CommunityGuidelinesPage'));
const CompetitionTermsPage          = lazy(() => import('./pages/CompetitionTermsPage'));
const DistributionAgreementPage     = lazy(() => import('./pages/DistributionAgreementPage'));
const CreatorMonetizationPolicyPage = lazy(() => import('./pages/CreatorMonetizationPolicyPage'));
const SubscriptionTermsPage         = lazy(() => import('./pages/SubscriptionTermsPage'));
const CopyrightPolicyPage           = lazy(() => import('./pages/CopyrightPolicyPage'));
const ReportContentPage             = lazy(() => import('./pages/ReportContentPage'));
const HelpCenterPage                = lazy(() => import('./pages/HelpCenterPage'));
const MobileAppPage                 = lazy(() => import('./pages/MobileAppPage'));
const PartnersPage                  = lazy(() => import('./pages/PartnersPage'));
const ApiAccessPage                 = lazy(() => import('./pages/ApiAccessPage'));

// ── Phase 4 — Auth ─────────────────────────────────────────────────────────────
const CallbackPage    = lazy(() => import('./pages/auth/CallbackPage'));
const SelectRolePage  = lazy(() => import('./pages/auth/SelectRolePage'));
const RegisterPage    = lazy(() => import('./pages/auth/RegisterPage'));

// ── Phase 4 — Role dashboards ─────────────────────────────────────────────────
const DashboardPage         = lazy(() => import('./pages/DashboardPage'));
const ArtistDashboardPage   = lazy(() => import('./pages/dashboard/ArtistDashboardPage'));
const AuthorDashboardNewPage = lazy(() => import('./pages/dashboard/AuthorDashboardPage'));

// ── Phase 4 — Admin ────────────────────────────────────────────────────────────
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AcceptInvitePage   = lazy(() => import('./pages/admin/AcceptInvitePage'));

// ── Spinner ────────────────────────────────────────────────────────────────────

const Spinner = () => (
  <div className="min-h-screen bg-[#0A1128] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
  </div>
);

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <>
      <GlobalPlayer />
      <Suspense fallback={<Spinner />}>
        <Routes>
          {/* ── Public ─────────────────────────────────────────────────────── */}
          <Route path="/"                         element={<Index />} />
          <Route path="/cart"                     element={<CartPage />} />
          <Route path="/checkout"                 element={<CheckoutPage />} />
          <Route path="/order-confirmation"       element={<OrderConfirmation />} />
          <Route path="/search"                   element={<SearchPage />} />
          <Route path="/collections/:handle"      element={<CollectionPage />} />
          <Route path="/products/:handle"         element={<ProductPage />} />
          <Route path="/artist/:id"               element={<ArtistProfile />} />
          <Route path="/author/:id"               element={<AuthorProfile />} />
          <Route path="/talent-arena"             element={<TalentArenaPage />} />
          <Route path="/talent-arena/room/:roomId" element={<TalentArenaRoomPage />} />
          <Route path="/ebook-marketplace"        element={<EbookMarketplacePage />} />
          <Route path="/music-store"              element={<MusicStorePage />} />

          {/* ── Company ────────────────────────────────────────────────────── */}
          <Route path="/about"                    element={<AboutPage />} />
          <Route path="/careers"                  element={<CareersPage />} />
          <Route path="/press"                    element={<PressPage />} />
          <Route path="/terms-of-service"         element={<TermsPage />} />
          <Route path="/privacy-policy"           element={<PrivacyPage />} />
          <Route path="/dmca-policy"              element={<DmcaPage />} />
          <Route path="/cookies"                  element={<CookiePolicyPage />} />
          <Route path="/community-guidelines"     element={<CommunityGuidelinesPage />} />
          <Route path="/competition-terms"        element={<CompetitionTermsPage />} />
          <Route path="/distribution-agreement"   element={<DistributionAgreementPage />} />
          <Route path="/creator-monetization-policy" element={<CreatorMonetizationPolicyPage />} />
          <Route path="/subscription-terms"       element={<SubscriptionTermsPage />} />
          <Route path="/copyright"                element={<CopyrightPolicyPage />} />
          <Route path="/report"                   element={<ReportContentPage />} />
          <Route path="/help"                     element={<HelpCenterPage />} />
          <Route path="/mobile"                   element={<MobileAppPage />} />
          <Route path="/partners/:type"           element={<PartnersPage />} />
          <Route path="/api-access"               element={<ApiAccessPage />} />

          {/* ── Auth (Phase 4) ─────────────────────────────────────────────── */}
          <Route path="/auth/callback"            element={<CallbackPage />} />
          <Route path="/auth/register"            element={<RegisterPage />} />
          <Route path="/auth/select-role"         element={
            <ProtectedRoute><SelectRolePage /></ProtectedRoute>
          } />

          {/* ── Phase 2 — Public collections & artist pages ────────────────── */}
          <Route path="/artists/:slug"            element={<ArtistPublicPage />} />
          <Route path="/collections/music"        element={<MusicCollectionPage />} />
          <Route path="/collections/books"        element={<BooksCollectionPage />} />
          <Route path="/collections/videos"       element={<VideosCollectionPage />} />
          <Route path="/collections/podcasts"     element={<PodcastsCollectionPage />} />
          <Route path="/collections/talent-arena" element={<TalentArenaCollectionPage />} />

          {/* ── Phase 2 — Competition pages ────────────────────────────────── */}
          <Route path="/competition/watch/:entryId"   element={<WatchPage />} />
          <Route path="/competition/results/:roomId"  element={<ResultsPage />} />

          {/* ── Protected: any logged-in user ──────────────────────────────── */}
          <Route path="/dashboard"          element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/dashboard/earnings" element={<ProtectedRoute><EarningsDashboardPage /></ProtectedRoute>} />
          <Route path="/book-upload"        element={<ProtectedRoute><BookUploadPage /></ProtectedRoute>} />
          <Route path="/distribute"         element={<ProtectedRoute requiredRole={['artist']}><DistributePage /></ProtectedRoute>} />
          <Route path="/upload/distribute"  element={<ProtectedRoute><DistributeUploadPage /></ProtectedRoute>} />
          <Route path="/talent-arena/upload" element={<ProtectedRoute><TalentArenaUploadPage /></ProtectedRoute>} />

          {/* ── Phase 2 & 4 — Role-specific dashboards ─────────────────────── */}
          <Route path="/dashboard/artist"   element={
            <ProtectedRoute requiredRole="artist"><ArtistDashboardPage /></ProtectedRoute>
          } />
          <Route path="/dashboard/author"   element={
            <ProtectedRoute requiredRole="author"><AuthorDashboardNewPage /></ProtectedRoute>
          } />
          <Route path="/authors/dashboard"  element={
            <ProtectedRoute requiredRole="author"><AuthorDashboardPage /></ProtectedRoute>
          } />
          <Route path="/distribution/releases" element={
            <ProtectedRoute><ReleasesPage /></ProtectedRoute>
          } />

          {/* ── Admin invite accept (public — token is the auth) */}
          <Route path="/admin/invite/:token" element={<AcceptInvitePage />} />

          {/* ── Phase 4 — Admin (all sub-routes handled inside AdminDashboardPage) */}
          <Route path="/admin/*"            element={
            <ProtectedRoute requiredRole="admin"><AdminDashboardPage /></ProtectedRoute>
          } />

          <Route path="*"                   element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
