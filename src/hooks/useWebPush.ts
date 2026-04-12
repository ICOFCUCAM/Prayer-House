import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── VAPID public key must be set in env ───────────────────────────────────────
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData  = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

type PushState = 'unsupported' | 'denied' | 'prompt' | 'granted' | 'loading';

export function useWebPush() {
  const { user } = useAuth();
  const [state,  setState]  = useState<PushState>('loading');
  const [subbed, setSubbed] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }
    const perm = Notification.permission;
    setState(perm === 'denied' ? 'denied' : perm === 'granted' ? 'granted' : 'prompt');
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!VAPID_PUBLIC_KEY) {
      console.warn('[useWebPush] VITE_VAPID_PUBLIC_KEY not set');
      return false;
    }
    if (!user) return false;

    try {
      setState('loading');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState('denied'); return false; }
      setState('granted');

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Store subscription in Supabase
      const { endpoint, keys } = sub.toJSON() as {
        endpoint: string;
        keys:     { p256dh: string; auth: string };
      };

      await supabase.from('push_subscriptions').upsert({
        user_id:  user.id,
        endpoint,
        p256dh:   keys.p256dh,
        auth:     keys.auth,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' });

      setSubbed(true);
      return true;
    } catch (err) {
      console.error('[useWebPush] subscribe error', err);
      setState('prompt');
      return false;
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const { endpoint } = sub.toJSON() as { endpoint: string };
        await sub.unsubscribe();
        if (user) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
        }
      }
      setSubbed(false);
    } catch (err) {
      console.error('[useWebPush] unsubscribe error', err);
    }
  }, [user]);

  return { state, subbed, subscribe, unsubscribe };
}

// ── Service worker registration helper ────────────────────────────────────────
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('[SW] Registration failed:', err);
      });
    });
  }
}
