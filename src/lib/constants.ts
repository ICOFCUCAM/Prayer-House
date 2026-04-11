// Image URLs
export const IMAGES = {
  hero: 'https://d64gsuwffb70l.cloudfront.net/69bdd0721a1fe097ab8615d8_1774047590438_0a152d8a.png',
  creators: [
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053194842_4e7d08fa.png',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053186152_a5879d67.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053262911_338b602f.png',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053195174_1f65915a.png',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053279433_076743a5.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053281195_3603bc91.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053285720_db058b51.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053288237_83c81ac1.png',
  ],
  albums: [
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053314367_c35ab590.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053317838_445c1653.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053319978_3606005c.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053336943_5453fd20.png',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053333688_d4dd31da.png',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053321694_21dd71b1.jpg',
  ],
  thumbnails: [
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053362630_93b47696.png',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053354252_6b0e039f.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053364952_67a6522e.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053357848_39a24c42.jpg',
  ],
};

export type UserRole = 'viewer' | 'creator' | 'singer_artist' | 'admin' | 'moderator' | 'finance_manager' | 'distribution_manager' | 'marketing_manager' | 'analytics_manager';
export type ContentType = 'book' | 'music' | 'video' | 'podcast' | 'article' | 'course';
export type ViewPage = 'home' | 'marketplace' | 'competitions' | 'dashboard' | 'wallet' | 'admin' | 'distribution' | 'analytics' | 'upload' | 'settings' | 'notifications' | 'library';

export interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  verified: boolean;
  followers: number;
  earnings: number;
  country: string;
  category: string;
  bio: string;
}

export interface ContentItem {
  id: string;
  title: string;
  creator: string;
  creatorAvatar: string;
  type: ContentType;
  thumbnail: string;
  price: number;
  isPaid: boolean;
  views: number;
  likes: number;
  category: string;
  tags: string[];
  description: string;
  createdAt: string;
}

export interface Competition {
  id: string;
  name: string;
  type: 'weekly' | 'monthly' | 'special';
  category: string;
  prizePool: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'voting' | 'completed';
  entries: number;
  sponsor: string;
  banner: string;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  date: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  date: string;
}

// Mock creators data
export const MOCK_CREATORS: Creator[] = [
  { id: '1', name: 'Amara Okafor', username: 'amaramusic', avatar: IMAGES.creators[0], verified: true, followers: 245000, earnings: 89500, country: 'NG', category: 'Music', bio: 'Afrobeats artist from Lagos' },
  { id: '2', name: 'Kwame Asante', username: 'kwamecreates', avatar: IMAGES.creators[1], verified: true, followers: 189000, earnings: 67200, country: 'GH', category: 'Video', bio: 'Filmmaker & storyteller' },
  { id: '3', name: 'Zuri Mwangi', username: 'zuribeats', avatar: IMAGES.creators[2], verified: true, followers: 312000, earnings: 124800, country: 'KE', category: 'Music', bio: 'Producer & DJ from Nairobi' },
  { id: '4', name: 'Fatima Diallo', username: 'fatimawrites', avatar: IMAGES.creators[3], verified: false, followers: 78000, earnings: 23400, country: 'SN', category: 'Book', bio: 'Author & poet' },
  { id: '5', name: 'David Chen', username: 'davidtalks', avatar: IMAGES.creators[4], verified: true, followers: 567000, earnings: 198000, country: 'US', category: 'Podcast', bio: 'Tech podcast host' },
  { id: '6', name: 'Marcus Johnson', username: 'marcusjbeats', avatar: IMAGES.creators[5], verified: true, followers: 423000, earnings: 156700, country: 'US', category: 'Music', bio: 'Hip-hop producer' },
  { id: '7', name: 'Yuki Tanaka', username: 'yukicourses', avatar: IMAGES.creators[6], verified: false, followers: 134000, earnings: 45600, country: 'JP', category: 'Course', bio: 'Online educator' },
  { id: '8', name: 'Carlos Rivera', username: 'carlosvids', avatar: IMAGES.creators[7], verified: true, followers: 289000, earnings: 98300, country: 'MX', category: 'Video', bio: 'Content creator & vlogger' },
];

// Mock content
export const MOCK_CONTENT: ContentItem[] = [
  { id: 'c1', title: 'Midnight Vibes EP', creator: 'Amara Okafor', creatorAvatar: IMAGES.creators[0], type: 'music', thumbnail: IMAGES.albums[0], price: 9.99, isPaid: true, views: 45200, likes: 8900, category: 'Afrobeats', tags: ['afrobeats', 'ep', 'new'], description: 'A soulful collection of midnight grooves', createdAt: '2026-03-15' },
  { id: 'c2', title: 'African Stories Documentary', creator: 'Kwame Asante', creatorAvatar: IMAGES.creators[1], type: 'video', thumbnail: IMAGES.thumbnails[0], price: 4.99, isPaid: true, views: 23100, likes: 5600, category: 'Documentary', tags: ['africa', 'documentary'], description: 'Exploring untold stories across the continent', createdAt: '2026-03-10' },
  { id: 'c3', title: 'Nairobi Nights Album', creator: 'Zuri Mwangi', creatorAvatar: IMAGES.creators[2], type: 'music', thumbnail: IMAGES.albums[1], price: 12.99, isPaid: true, views: 89300, likes: 21000, category: 'Electronic', tags: ['electronic', 'album'], description: 'Electronic beats inspired by Nairobi nightlife', createdAt: '2026-03-08' },
  { id: 'c4', title: 'Voices of the Sahel', creator: 'Fatima Diallo', creatorAvatar: IMAGES.creators[3], type: 'book', thumbnail: IMAGES.albums[2], price: 14.99, isPaid: true, views: 12400, likes: 3200, category: 'Poetry', tags: ['poetry', 'africa'], description: 'A poetry collection from West Africa', createdAt: '2026-03-05' },
  { id: 'c5', title: 'Tech Disruption Podcast S3', creator: 'David Chen', creatorAvatar: IMAGES.creators[4], type: 'podcast', thumbnail: IMAGES.thumbnails[1], price: 0, isPaid: false, views: 156000, likes: 34000, category: 'Technology', tags: ['tech', 'podcast', 'free'], description: 'Season 3 of the hit tech podcast', createdAt: '2026-03-01' },
  { id: 'c6', title: 'Beat Making Masterclass', creator: 'Marcus Johnson', creatorAvatar: IMAGES.creators[5], type: 'course', thumbnail: IMAGES.thumbnails[2], price: 49.99, isPaid: true, views: 67800, likes: 15600, category: 'Education', tags: ['course', 'music', 'production'], description: 'Learn professional beat making', createdAt: '2026-02-28' },
  { id: 'c7', title: 'Golden Hour Sessions', creator: 'Amara Okafor', creatorAvatar: IMAGES.creators[0], type: 'music', thumbnail: IMAGES.albums[3], price: 7.99, isPaid: true, views: 34500, likes: 7800, category: 'Afrobeats', tags: ['afrobeats', 'single'], description: 'Live acoustic sessions', createdAt: '2026-02-25' },
  { id: 'c8', title: 'Lagos to London Vlog', creator: 'Carlos Rivera', creatorAvatar: IMAGES.creators[7], type: 'video', thumbnail: IMAGES.thumbnails[3], price: 0, isPaid: false, views: 98200, likes: 22100, category: 'Travel', tags: ['travel', 'vlog', 'free'], description: 'Travel documentary series', createdAt: '2026-02-20' },
  { id: 'c9', title: 'Rhythm & Soul Collection', creator: 'Zuri Mwangi', creatorAvatar: IMAGES.creators[2], type: 'music', thumbnail: IMAGES.albums[4], price: 11.99, isPaid: true, views: 56700, likes: 13400, category: 'Soul', tags: ['soul', 'collection'], description: 'A curated soul music collection', createdAt: '2026-02-15' },
  { id: 'c10', title: 'Digital Art Fundamentals', creator: 'Yuki Tanaka', creatorAvatar: IMAGES.creators[6], type: 'course', thumbnail: IMAGES.albums[5], price: 29.99, isPaid: true, views: 43200, likes: 9800, category: 'Art', tags: ['art', 'course', 'digital'], description: 'Master digital art from scratch', createdAt: '2026-02-10' },
  { id: 'c11', title: 'Afro House Mix Vol. 2', creator: 'Marcus Johnson', creatorAvatar: IMAGES.creators[5], type: 'music', thumbnail: IMAGES.albums[0], price: 6.99, isPaid: true, views: 78900, likes: 18200, category: 'House', tags: ['house', 'mix', 'afro'], description: 'The hottest afro house tracks', createdAt: '2026-02-05' },
  { id: 'c12', title: 'Startup Secrets Revealed', creator: 'David Chen', creatorAvatar: IMAGES.creators[4], type: 'podcast', thumbnail: IMAGES.thumbnails[0], price: 0, isPaid: false, views: 234000, likes: 45600, category: 'Business', tags: ['business', 'startup', 'free'], description: 'Interviews with top founders', createdAt: '2026-02-01' },
];

// Mock competitions
export const MOCK_COMPETITIONS: Competition[] = [
  { id: 'comp1', name: 'Afrobeats Rising Stars', type: 'weekly', category: 'Music', prizePool: 5000, startDate: '2026-03-17', endDate: '2026-03-24', status: 'active', entries: 234, sponsor: 'Universal Music Africa', banner: IMAGES.thumbnails[0] },
  { id: 'comp2', name: 'Best Short Film March', type: 'monthly', category: 'Video', prizePool: 10000, startDate: '2026-03-01', endDate: '2026-03-31', status: 'active', entries: 89, sponsor: 'Netflix Africa', banner: IMAGES.thumbnails[1] },
  { id: 'comp3', name: 'Poetry Slam Championship', type: 'special', category: 'Book', prizePool: 3000, startDate: '2026-03-25', endDate: '2026-04-01', status: 'upcoming', entries: 0, sponsor: 'Penguin Random House', banner: IMAGES.thumbnails[2] },
  { id: 'comp4', name: 'Producer Battle Royale', type: 'weekly', category: 'Music', prizePool: 7500, startDate: '2026-03-10', endDate: '2026-03-17', status: 'completed', entries: 456, sponsor: 'Splice', banner: IMAGES.thumbnails[3] },
  { id: 'comp5', name: 'Global Voices Challenge', type: 'monthly', category: 'Podcast', prizePool: 4000, startDate: '2026-04-01', endDate: '2026-04-30', status: 'upcoming', entries: 0, sponsor: 'Spotify', banner: IMAGES.thumbnails[0] },
  { id: 'comp6', name: 'Dance Video Showdown', type: 'weekly', category: 'Video', prizePool: 2500, startDate: '2026-03-15', endDate: '2026-03-22', status: 'voting', entries: 178, sponsor: 'TikTok', banner: IMAGES.thumbnails[1] },
];

// Mock transactions
export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'subscription', amount: 49.99, currency: 'USD', status: 'completed', description: 'Monthly subscription revenue', date: '2026-03-20' },
  { id: 't2', type: 'tip', amount: 25.00, currency: 'USD', status: 'completed', description: 'Tip from @musicfan22', date: '2026-03-19' },
  { id: 't3', type: 'royalty', amount: 234.56, currency: 'USD', status: 'completed', description: 'Spotify royalties - March', date: '2026-03-18' },
  { id: 't4', type: 'competition_reward', amount: 500.00, currency: 'USD', status: 'completed', description: 'Weekly competition winner', date: '2026-03-17' },
  { id: 't5', type: 'payout', amount: -350.00, currency: 'USD', status: 'completed', description: 'Withdrawal to M-Pesa', date: '2026-03-16' },
  { id: 't6', type: 'purchase', amount: 12.99, currency: 'USD', status: 'completed', description: 'Content purchase - Nairobi Nights', date: '2026-03-15' },
  { id: 't7', type: 'distribution', amount: 189.00, currency: 'USD', status: 'pending', description: 'Apple Music distribution', date: '2026-03-14' },
  { id: 't8', type: 'tip', amount: 10.00, currency: 'USD', status: 'completed', description: 'Tip from @beatslover', date: '2026-03-13' },
];

// Mock notifications
export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'payment', title: 'Payment Received', message: 'You received $49.99 from a new subscriber', read: false, date: '2026-03-20T10:30:00' },
  { id: 'n2', type: 'competition', title: 'Competition Update', message: 'You are ranked #3 in Afrobeats Rising Stars', read: false, date: '2026-03-20T09:15:00' },
  { id: 'n3', type: 'content', title: 'Content Approved', message: 'Your track "Midnight Vibes" has been approved', read: true, date: '2026-03-19T14:00:00' },
  { id: 'n4', type: 'system', title: 'KYC Verification', message: 'Your identity verification is complete', read: true, date: '2026-03-18T11:00:00' },
  { id: 'n5', type: 'subscription', title: 'New Subscriber', message: '@musicfan22 subscribed to your Gold tier', read: false, date: '2026-03-17T16:45:00' },
];

// Categories
export const CATEGORIES = ['All', 'Music', 'Video', 'Podcast', 'Book', 'Course', 'Article'];
export const COUNTRIES = ['All', 'Nigeria', 'Kenya', 'Ghana', 'South Africa', 'USA', 'UK', 'Japan', 'Mexico', 'Senegal'];

// Stats for dashboard
export const PLATFORM_STATS = {
  totalCreators: 12450,
  totalContent: 89200,
  totalRevenue: 4560000,
  activeCompetitions: 8,
  totalPayouts: 2340000,
  activeSubscriptions: 45600,
  countriesServed: 42,
  monthlyActiveUsers: 890000,
};

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}
