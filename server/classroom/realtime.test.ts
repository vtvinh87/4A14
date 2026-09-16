import { describe, expect, it, vi } from 'vitest';
import { createSupabaseClassroomRealtimeBridge } from './realtime';

function env(values: Record<string, string | undefined>): (name: string) => string | undefined {
  return (name) => values[name];
}

describe('Supabase classroom realtime bridge', () => {
  it('derives an opaque student topic and broadcasts only the message id', async () => {
    const secret = 'topic-secret-used-only-on-the-edge';
    const serverKey = 'server-key-never-sent-to-the-browser';
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    const bridge = createSupabaseClassroomRealtimeBridge(env({
      SUPABASE_URL: 'https://tvlpabqkternfvsxqovi.supabase.co/',
      SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: 'publishable-key' }),
      SUPABASE_SECRET_KEYS: JSON.stringify({ default: serverKey }),
      HOC_VUI_REALTIME_TOPIC_SECRET: secret,
    }), fetchMock);

    expect(bridge).not.toBeNull();
    const config = await bridge!.configForStudent('student/a');

    expect(config).toMatchObject({
      supabaseUrl: 'https://tvlpabqkternfvsxqovi.supabase.co',
      publishableKey: 'publishable-key',
    });
    expect(config.topic).toMatch(/^classroom:student:[A-Za-z0-9_-]+$/);
    expect(config.topic).not.toContain(secret);

    await bridge!.notifyMessage({ messageId: 'message-123', recipientId: 'student/a' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/realtime/v1/api/broadcast/${encodeURIComponent(config.topic)}/events/classroom-message`),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ apikey: serverKey }),
        body: JSON.stringify({ messageId: 'message-123' }),
      }),
    );
    const request = (fetchMock.mock.calls[0] as unknown[] | undefined)?.[1] as RequestInit;
    expect(String(request.body)).not.toContain('student/a');
    expect(String(request.body)).not.toContain('server-key');
  });

  it('returns null when the edge is not configured and surfaces failed broadcast responses', async () => {
    expect(createSupabaseClassroomRealtimeBridge(env({}), vi.fn())).toBeNull();

    const bridge = createSupabaseClassroomRealtimeBridge(env({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'server-key',
      HOC_VUI_REALTIME_TOPIC_SECRET: 'secret',
    }), vi.fn(async () => new Response('bad gateway', { status: 502 })))!;

    await expect(bridge.notifyMessage({ messageId: 'message-123', recipientId: 'student-a' })).rejects.toThrow(/broadcast/i);
  });
});
