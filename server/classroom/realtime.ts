import type { ClassroomRealtimeConfig } from '../../shared/classroom-contracts.ts';
import { getEnv } from '../runtime/env.ts';

export type ClassroomRealtimeBridge = {
  configForStudent(studentId: string): Promise<ClassroomRealtimeConfig>;
  notifyMessage(input: { messageId: string; recipientId: string }): Promise<void>;
};

type EnvReader = (name: string) => string | undefined;
type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function configuredKey(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed === 'string' && parsed.trim()) return parsed.trim();
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      if (typeof record.default === 'string' && record.default.trim()) return record.default.trim();
      const first = Object.values(record).find((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0);
      if (first) return first.trim();
    }
  } catch {
    // Legacy single-value environment variables are not JSON.
  }
  return value;
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function topicForStudent(studentId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(studentId));
  return `classroom:student:${base64Url(new Uint8Array(signature))}`;
}

export function createSupabaseClassroomRealtimeBridge(
  readEnv: EnvReader = getEnv,
  fetchImpl: FetchLike = fetch,
): ClassroomRealtimeBridge | null {
  const supabaseUrl = readEnv('SUPABASE_URL')?.trim().replace(/\/+$/, '');
  const publishableKey = configuredKey(readEnv('SUPABASE_PUBLISHABLE_KEYS')) ?? configuredKey(readEnv('SUPABASE_ANON_KEY'));
  const serverKey = configuredKey(readEnv('SUPABASE_SECRET_KEYS')) ?? configuredKey(readEnv('SUPABASE_SERVICE_ROLE_KEY'));
  const topicSecret = readEnv('HOC_VUI_REALTIME_TOPIC_SECRET')?.trim();
  if (!supabaseUrl || !publishableKey || !serverKey || !topicSecret) return null;

  const configForStudent = async (studentId: string): Promise<ClassroomRealtimeConfig> => ({
    supabaseUrl,
    publishableKey,
    topic: await topicForStudent(studentId, topicSecret),
  });

  return {
    configForStudent,
    async notifyMessage({ messageId, recipientId }) {
      const config = await configForStudent(recipientId);
      const response = await fetchImpl(
        `${supabaseUrl}/realtime/v1/api/broadcast/${encodeURIComponent(config.topic)}/events/classroom-message`,
        {
          method: 'POST',
          headers: {
            apikey: serverKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messageId }),
        },
      );
      if (!response.ok) throw new Error(`Realtime broadcast failed with status ${response.status}.`);
    },
  };
}
