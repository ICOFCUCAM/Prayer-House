import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

function buildChannel(
  table: string,
  event: PostgresEvent,
  filter: string | null,
  callback: (payload: any) => void
): RealtimeChannel {
  const channelName = `${table}-changes-${Date.now()}`;

  return supabase
    .channel(channelName)
    .on(
      'postgres_changes' as any,
      {
        event,
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      },
      callback
    )
    .subscribe();
}

/**
 * Subscribe to INSERT events on a table.
 */
export function subscribeToInserts(
  table: string,
  filter: string | null,
  callback: (payload: any) => void
): RealtimeChannel {
  return buildChannel(table, 'INSERT', filter, callback);
}

/**
 * Subscribe to UPDATE events on a table.
 */
export function subscribeToUpdates(
  table: string,
  filter: string | null,
  callback: (payload: any) => void
): RealtimeChannel {
  return buildChannel(table, 'UPDATE', filter, callback);
}

/**
 * Subscribe to INSERT and UPDATE events on a table.
 * Uses the wildcard '*' event which covers all change types.
 */
export function subscribeToChanges(
  table: string,
  filter: string | null,
  callback: (payload: any) => void
): RealtimeChannel {
  return buildChannel(table, '*', filter, callback);
}

/**
 * Unsubscribe and remove a realtime channel.
 */
export function unsubscribe(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
