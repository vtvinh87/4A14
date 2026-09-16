import { createClient } from '@supabase/supabase-js';
import type { ClassroomRealtimeConfig } from '../../shared/classroom-contracts';

type ClassroomRealtimeChannel = {
  on(event: 'broadcast', filter: { event: string }, callback: (payload: unknown) => void): ClassroomRealtimeChannel;
  subscribe(callback: (status: string) => void): ClassroomRealtimeChannel;
};

type ClassroomRealtimeClient = {
  channel(topic: string): ClassroomRealtimeChannel;
  removeChannel(channel: ClassroomRealtimeChannel): Promise<string>;
};

export type ClassroomRealtimeClientFactory = (
  supabaseUrl: string,
  publishableKey: string,
  options: { auth: { persistSession: boolean; autoRefreshToken: boolean; detectSessionInUrl: boolean } },
) => ClassroomRealtimeClient;

export type ClassroomRealtimeSubscription = { close: () => void };
export type ClassroomRealtimeState = 'connected' | 'degraded';

const defaultClientFactory: ClassroomRealtimeClientFactory = (supabaseUrl, publishableKey, options) => createClient(supabaseUrl, publishableKey, options) as unknown as ClassroomRealtimeClient;

function messageIdFromPayload(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const payload = (value as { payload?: unknown }).payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const messageId = (payload as { messageId?: unknown }).messageId;
  if (typeof messageId !== 'string' || !messageId.trim()) return null;
  return messageId.trim();
}

export function subscribeToClassroomRealtime(
  config: ClassroomRealtimeConfig,
  onMessage: (messageId: string) => void,
  onStateChange?: (state: ClassroomRealtimeState) => void,
  clientFactory: ClassroomRealtimeClientFactory = defaultClientFactory,
): ClassroomRealtimeSubscription {
  const client = clientFactory(config.supabaseUrl, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const channel = client.channel(config.topic);
  channel
    .on('broadcast', { event: 'classroom-message' }, (event) => {
      const messageId = messageIdFromPayload(event);
      if (messageId) onMessage(messageId);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') onStateChange?.('connected');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') onStateChange?.('degraded');
    });

  let closed = false;
  return {
    close() {
      if (closed) return;
      closed = true;
      void client.removeChannel(channel);
    },
  };
}
