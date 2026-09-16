import { describe, expect, it, vi } from 'vitest';
import { subscribeToClassroomRealtime } from './realtime';

describe('classroom realtime browser adapter', () => {
  it('subscribes to the opaque public topic, forwards valid ids, reports state, and closes once', async () => {
    let broadcastHandler: ((payload: unknown) => void) | undefined;
    let statusHandler: ((status: string) => void) | undefined;
    const channel = {
      on: vi.fn((_type: string, _filter: unknown, handler: (payload: unknown) => void) => {
        broadcastHandler = handler;
        return channel;
      }),
      subscribe: vi.fn((handler: (status: string) => void) => {
        statusHandler = handler;
        return channel;
      }),
    };
    const client = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(async () => 'ok'),
    };
    const clientFactory = vi.fn(() => client);
    const onMessage = vi.fn();
    const onStateChange = vi.fn();

    const subscription = subscribeToClassroomRealtime(
      { supabaseUrl: 'https://example.supabase.co', publishableKey: 'publishable-key', topic: 'classroom:student:opaque' },
      onMessage,
      onStateChange,
      clientFactory,
    );

    expect(clientFactory).toHaveBeenCalledWith('https://example.supabase.co', 'publishable-key', expect.objectContaining({ auth: expect.objectContaining({ persistSession: false }) }));
    expect(client.channel).toHaveBeenCalledWith('classroom:student:opaque');
    expect(channel.on).toHaveBeenCalledWith('broadcast', { event: 'classroom-message' }, expect.any(Function));

    statusHandler?.('SUBSCRIBED');
    broadcastHandler?.({ payload: { messageId: 'message-123' } });
    broadcastHandler?.({ payload: { messageId: '   ' } });
    broadcastHandler?.({ payload: { messageId: 123 } });
    statusHandler?.('CHANNEL_ERROR');

    expect(onStateChange).toHaveBeenNthCalledWith(1, 'connected');
    expect(onStateChange).toHaveBeenNthCalledWith(2, 'degraded');
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith('message-123');

    subscription.close();
    subscription.close();
    await Promise.resolve();
    expect(client.removeChannel).toHaveBeenCalledTimes(1);
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
  });
});
