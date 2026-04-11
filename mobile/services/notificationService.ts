import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Configure how notifications are handled while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let activeChannels: ReturnType<typeof supabase.channel>[] = [];

/**
 * Request notification permissions and return the Expo push token.
 * Returns null if permissions are denied or the platform doesn't support it.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Physical devices only — simulators cannot receive push notifications
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'WANKONG',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00D9FF',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    // Simulators and some environments won't have a token
    return null;
  }
}

/**
 * Persist a push token to the user's profile row in Supabase.
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, push_token: token }, { onConflict: 'id' });

  if (error) {
    // Fallback: try users table
    await supabase
      .from('users')
      .update({ push_token: token })
      .eq('id', userId);
  }
}

/**
 * Subscribe to relevant realtime channels and fire local notifications on events.
 */
export async function subscribeToNotifications(userId: string): Promise<void> {
  // Unsubscribe any existing subscriptions first
  await unsubscribeAll();

  // ── Competition Votes ────────────────────────────────────────────────────────
  const votesChannel = supabase
    .channel(`votes-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'competition_votes',
        filter: `entry_user_id=eq.${userId}`,
      },
      (payload) => {
        const entryTitle = (payload.new as Record<string, unknown>)?.entry_title as string | undefined;
        scheduleLocalNotification(
          'New Vote Received!',
          `Someone voted on "${entryTitle ?? 'your entry'}"!`
        );
      }
    )
    .subscribe();

  activeChannels.push(votesChannel);

  // ── Creator Earnings ─────────────────────────────────────────────────────────
  const earningsChannel = supabase
    .channel(`earnings-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'creator_earnings',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        const amount = typeof row.amount === 'number' ? row.amount.toFixed(2) : '0.00';
        const category = (row.category as string | undefined) ?? 'content';
        scheduleLocalNotification(
          'You Earned Money!',
          `You earned $${amount} from ${category.replace(/_/g, ' ')}.`
        );
      }
    )
    .subscribe();

  activeChannels.push(earningsChannel);

  // ── Distribution Releases ────────────────────────────────────────────────────
  const releasesChannel = supabase
    .channel(`releases-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'distribution_releases',
        filter: `artist_id=eq.${userId}`,
      },
      (payload) => {
        const status = (payload.new as Record<string, unknown>)?.status as string | undefined;
        scheduleLocalNotification(
          'Release Update',
          `Your release is now ${status ?? 'updated'}!`
        );
      }
    )
    .subscribe();

  activeChannels.push(releasesChannel);
}

/**
 * Unsubscribe from all active realtime channels.
 */
export async function unsubscribeAll(): Promise<void> {
  for (const channel of activeChannels) {
    await supabase.removeChannel(channel);
  }
  activeChannels = [];
}

/**
 * Schedule an immediate local notification with the given title and body.
 */
export async function scheduleLocalNotification(
  title: string,
  body: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // fire immediately
  });
}
