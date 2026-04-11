import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../lib/supabase';

// Required for expo-auth-session on web
WebBrowser.maybeCompleteAuthSession();

// ── Types ──────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Email + password sign-in */
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** Email + password sign-up */
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** OAuth with Google — opens in-app browser */
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  /** OAuth with Apple — opens in-app browser (iOS only in production) */
  signInWithApple: () => Promise<{ error: Error | null }>;
  /**
   * Phone OTP — structure prepared for future activation.
   * Supabase phone auth must be enabled in project settings before this works.
   */
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  /** Verify phone OTP */
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signIn:           async () => ({ error: null }),
  signUp:           async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signInWithApple:  async () => ({ error: null }),
  signInWithPhone:  async () => ({ error: null }),
  verifyPhoneOtp:   async () => ({ error: null }),
  signOut: async () => {},
});

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hydrate initial session from AsyncStorage
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    // Listen to future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      }
    );

    return () => { subscription.unsubscribe(); };
  }, []);

  // ── Email / password ─────────────────────────────────────────────────────────

  const signIn = async (
    email: string,
    password: string,
  ): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (
    email: string,
    password: string,
  ): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  // ── OAuth helper ─────────────────────────────────────────────────────────────

  async function _oauthSignIn(
    provider: 'google' | 'apple',
  ): Promise<{ error: Error | null }> {
    try {
      // Build a deep-link redirect URI so the OS can hand control back to the app
      const redirectUrl = makeRedirectUri({
        scheme: 'wankong',
        path:   'auth-callback',
      });

      const { data, error: urlError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo:          redirectUrl,
          skipBrowserRedirect: true,   // we open the browser manually below
        },
      });

      if (urlError || !data?.url) {
        return { error: (urlError as Error) ?? new Error('No OAuth URL returned') };
      }

      // Open the Supabase OAuth URL inside an in-app browser
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success' && result.url) {
        // Parse session tokens from the callback URL
        const urlObj = new URL(result.url);
        const accessToken  = urlObj.searchParams.get('access_token');
        const refreshToken = urlObj.searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          });
        }
      }

      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  const signInWithGoogle = () => _oauthSignIn('google');

  const signInWithApple  = () => {
    // Apple sign-in only works on iOS in production (requires Apple Developer Program)
    if (Platform.OS === 'android') {
      return Promise.resolve({
        error: new Error('Apple sign-in is only available on iOS.'),
      });
    }
    return _oauthSignIn('apple');
  };

  // ── Phone OTP ────────────────────────────────────────────────────────────────
  // Requires Supabase Phone Auth enabled in project settings.

  const signInWithPhone = async (
    phone: string,
  ): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return { error: error as Error | null };
  };

  const verifyPhoneOtp = async (
    phone: string,
    token: string,
  ): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    return { error: error as Error | null };
  };

  // ── Sign out ─────────────────────────────────────────────────────────────────

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithApple,
        signInWithPhone,
        verifyPhoneOtp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
