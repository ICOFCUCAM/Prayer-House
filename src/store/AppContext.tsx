import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { MOCK_NOTIFICATIONS, ViewPage, Notification } from '@/lib/constants';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface WalletState {
  available: number;
  pending: number;
  subscriptions: number;
  distributions: number;
  tips: number;
  competitions: number;
  currency: string;
}

interface AppUser {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatar: string;
  country: string;
  role: string;
}

interface AppContextType {
  user: AppUser | null;
  wallet: WalletState;
  isAuthenticated: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
  authMode: 'login' | 'register';
  setAuthMode: (m: 'login' | 'register') => void;
  currentPage: ViewPage;
  setCurrentPage: (p: ViewPage) => void;
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentPage, setCurrentPage] = useState<ViewPage>('dashboard');
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSupabaseUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const user: AppUser | null = supabaseUser ? {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    displayName: supabaseUser.user_metadata?.display_name ?? supabaseUser.user_metadata?.full_name ?? supabaseUser.email?.split('@')[0] ?? 'Creator',
    username: supabaseUser.user_metadata?.username ?? supabaseUser.email?.split('@')[0] ?? 'creator',
    avatar: supabaseUser.user_metadata?.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${supabaseUser.email}`,
    country: supabaseUser.user_metadata?.country ?? 'US',
    role: supabaseUser.user_metadata?.role ?? 'creator',
  } : null;

  const wallet: WalletState = {
    available: 2847.50,
    pending: 1234.00,
    subscriptions: 4560.00,
    distributions: 892.30,
    tips: 345.00,
    competitions: 500.00,
    currency: 'USD',
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <AppContext.Provider value={{
      user,
      wallet,
      isAuthenticated: !!supabaseUser,
      showAuthModal,
      setShowAuthModal,
      authMode,
      setAuthMode,
      currentPage,
      setCurrentPage,
      notifications,
      markNotificationRead,
      searchQuery,
      setSearchQuery,
      sidebarOpen,
      toggleSidebar: () => setSidebarOpen(p => !p),
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
