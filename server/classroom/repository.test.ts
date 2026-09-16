import { describe, expect, it } from 'vitest';
import type { AvatarId } from '../../shared/account-contracts';
import type { FriendSummary } from '../../shared/classroom-contracts';
import { MemoryClassroomRepository } from './memoryRepository';
import { PostgresClassroomRepository } from './postgresRepository';
import type { ClassroomPeerRecord } from './types';

function peer(id: string, displayName: string, active: boolean, avatarId: AvatarId): ClassroomPeerRecord {
  return { id, username: id, displayName, avatarId, role: 'student', active };
}

function adminPeer(id: string, displayName: string): ClassroomPeerRecord {
  return { id, username: id, displayName, avatarId: 'fox-scout', role: 'admin', active: true };
}

function queryText(strings: TemplateStringsArray): string {
  return strings.join('¦').replace(/\s+/g, ' ').trim().toLowerCase();
}

function mockedDatabase(options: {
  onQuery?: (query: string) => unknown[];
} = {}) {
  const queries: string[] = [];
  let transactionCount = 0;
  const query = ((strings: TemplateStringsArray, ..._values: unknown[]) => {
    const text = queryText(strings);
    queries.push(text);
    return Promise.resolve(options.onQuery?.(text) ?? []);
  }) as unknown as {
    (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>;
    begin: (work: (transaction: unknown) => Promise<unknown>) => Promise<unknown>;
    array: (values: unknown[]) => unknown;
  };
  query.begin = async (work) => {
    transactionCount += 1;
    return work(query);
  };
  query.array = (values) => values;
  return { db: query, queries, get transactionCount() { return transactionCount; } };
}

const messageRow = {
  id: 'message-id',
  sender_id: 'self',
  recipient_id: 'peer-a',
  body: 'Hello',
  created_at: '2026-09-16T09:00:00.000Z',
  read_at: null,
};

describe('MemoryClassroomRepository', () => {
  it('keeps FriendSummary to the exact public key set', () => {
    const summary: FriendSummary = {
      id: 'peer-a',
      username: 'lan',
      displayName: 'Lan',
      avatarId: 'fox-leaf',
      online: true,
      unreadCount: 2,
    };

    expect(Object.keys(summary).sort()).toEqual(['avatarId', 'displayName', 'id', 'online', 'unreadCount', 'username'].sort());
  });

  it('lists only active student peers and excludes the actor', async () => {
    const repository = new MemoryClassroomRepository([
      peer('self', 'Minh', true, 'fox-scout'),
      peer('active-peer', 'Lan', true, 'fox-leaf'),
      peer('inactive-peer', 'Bao', false, 'fox-night'),
      adminPeer('admin', 'Admin'),
    ]);

    await expect(repository.listActivePeers('self')).resolves.toEqual([
      expect.objectContaining({ id: 'active-peer', role: 'student', active: true }),
    ]);
  });

  it('isolates mutable peer and message records returned to callers', async () => {
    const repository = new MemoryClassroomRepository([
      peer('self', 'Minh', true, 'fox-scout'),
      peer('peer-a', 'Lan', true, 'fox-leaf'),
    ]);
    await repository.insertMessage({ senderId: 'peer-a', recipientId: 'self', body: 'Original', createdAt: '2026-09-16T09:00:00.000Z' });

    const peers = await repository.listActivePeers('self');
    peers[0].displayName = 'Mutated';
    const messages = await repository.listMessages('self', 'peer-a', 50);
    messages[0].body = 'Mutated';

    await expect(repository.listActivePeers('self')).resolves.toEqual([
      expect.objectContaining({ displayName: 'Lan' }),
    ]);
    await expect(repository.listMessages('self', 'peer-a', 50)).resolves.toEqual([
      expect.objectContaining({ body: 'Original' }),
    ]);
  });

  it('keeps unread counts scoped to recipient and sender', async () => {
    const repository = new MemoryClassroomRepository([
      peer('self', 'Minh', true, 'fox-scout'),
      peer('peer-a', 'Lan', true, 'fox-leaf'),
    ]);

    await repository.insertMessage({ senderId: 'peer-a', recipientId: 'self', body: 'Chào Minh', createdAt: '2026-09-16T09:00:00.000Z' });
    await expect(repository.listUnreadCounts('self')).resolves.toEqual(new Map([['peer-a', 1]]));
    await expect(repository.listUnreadCounts('peer-a')).resolves.toEqual(new Map());
  });

  it('stores presence, returns bounded chronological conversations and marks only incoming messages read', async () => {
    const repository = new MemoryClassroomRepository([
      peer('self', 'Minh', true, 'fox-scout'),
      peer('peer-a', 'Lan', true, 'fox-leaf'),
      peer('peer-b', 'Bao', true, 'fox-night'),
    ]);
    const first = await repository.insertMessage({ senderId: 'peer-a', recipientId: 'self', body: 'Một', createdAt: '2026-09-16T08:00:00.000Z' });
    const second = await repository.insertMessage({ senderId: 'self', recipientId: 'peer-a', body: 'Hai', createdAt: '2026-09-16T08:01:00.000Z' });
    await repository.insertMessage({ senderId: 'peer-b', recipientId: 'self', body: 'Ngoài cuộc trò chuyện', createdAt: '2026-09-16T08:02:00.000Z' });

    await repository.upsertPresence('peer-a', '2026-09-16T08:00:00.000Z');
    await expect(repository.listPresence(['peer-a', 'missing'])).resolves.toEqual(new Map([['peer-a', '2026-09-16T08:00:00.000Z']]));
    await expect(repository.listMessages('self', 'peer-a', 1)).resolves.toEqual([expect.objectContaining({ id: first.id })]);

    await expect(repository.markMessagesRead('self', 'peer-a', '2026-09-16T09:00:00.000Z')).resolves.toBe(1);
    await expect(repository.listMessages('self', 'peer-a', 50)).resolves.toEqual([
      expect.objectContaining({ id: first.id, readAt: '2026-09-16T09:00:00.000Z' }),
      expect.objectContaining({ id: second.id, readAt: null }),
    ]);
  });

  it('bounds a conversation to 50 chronological messages', async () => {
    const repository = new MemoryClassroomRepository([
      peer('self', 'Minh', true, 'fox-scout'),
      peer('peer-a', 'Lan', true, 'fox-leaf'),
    ]);
    for (let index = 0; index < 51; index += 1) {
      await repository.insertMessage({
        senderId: index % 2 === 0 ? 'self' : 'peer-a',
        recipientId: index % 2 === 0 ? 'peer-a' : 'self',
        body: `Message ${index}`,
        createdAt: `2026-09-16T09:${String(index).padStart(2, '0')}:00.000Z`,
      });
    }

    const messages = await repository.listMessages('self', 'peer-a', 100);
    expect(messages).toHaveLength(50);
    expect(messages[0].body).toBe('Message 0');
    expect(messages[49].body).toBe('Message 49');
  });

  it('counts recent sent messages using the supplied cutoff', async () => {
    const repository = new MemoryClassroomRepository([
      peer('self', 'Minh', true, 'fox-scout'),
      peer('peer-a', 'Lan', true, 'fox-leaf'),
    ]);

    await repository.insertMessage({ senderId: 'self', recipientId: 'peer-a', body: 'Gần đây', createdAt: '2026-09-16T09:00:00.000Z' });
    await repository.insertMessage({ senderId: 'self', recipientId: 'peer-a', body: 'Cũ', createdAt: '2026-09-16T08:00:00.000Z' });
    await expect(repository.countRecentSentMessages('self', '2026-09-16T08:30:00.000Z')).resolves.toBe(1);
  });
});

describe('PostgresClassroomRepository', () => {
  it('projects only the four public account columns for both roster queries', async () => {
    const { db, queries } = mockedDatabase({
      onQuery: (query) => query.includes('from hoc_vui_private.accounts')
        ? [{ id: 'peer-a', username: 'lan', display_name: 'Lan', avatar_id: 'fox-leaf' }]
        : [],
    });
    const repository = new PostgresClassroomRepository(db as never);

    await expect(repository.listActivePeers('self')).resolves.toEqual([
      { id: 'peer-a', username: 'lan', displayName: 'Lan', avatarId: 'fox-leaf', role: 'student', active: true },
    ]);
    await expect(repository.findActivePeer('peer-a')).resolves.toEqual({
      id: 'peer-a', username: 'lan', displayName: 'Lan', avatarId: 'fox-leaf', role: 'student', active: true,
    });

    const rosterQueries = queries.filter((query) => query.includes('from hoc_vui_private.accounts'));
    expect(rosterQueries).toHaveLength(2);
    for (const query of rosterQueries) {
      expect(query).toContain('select id, username, display_name, avatar_id');
      expect(query).not.toMatch(/select id, username, display_name, avatar_id, (role|active)/);
    }
  });

  it('counts under the sender lock before inserting within one transaction', async () => {
    const mock = mockedDatabase({
      onQuery: (query) => {
        if (query.includes('pg_advisory_xact_lock')) return [];
        if (query.includes('count(*)')) return [{ message_count: 29 }];
        if (query.includes('insert into hoc_vui_private.classroom_messages')) return [messageRow];
        return [];
      },
    });
    const repository = new PostgresClassroomRepository(mock.db as never);

    await expect(repository.insertMessage({
      senderId: 'self',
      recipientId: 'peer-a',
      body: 'Hello',
      createdAt: '2026-09-16T09:00:00.000Z',
    })).resolves.toEqual({
      id: 'message-id',
      senderId: 'self',
      recipientId: 'peer-a',
      body: 'Hello',
      createdAt: '2026-09-16T09:00:00.000Z',
      readAt: null,
    });

    expect(mock.transactionCount).toBe(1);
    expect(mock.queries.map((query) => query.split('¦')[0])).toEqual([
      expect.stringContaining('select pg_advisory_xact_lock'),
      expect.stringContaining('select count(*)'),
      expect.stringContaining('insert into hoc_vui_private.classroom_messages'),
    ]);
    expect(mock.queries[1]).toContain("interval '60 seconds'");
    expect(mock.queries[1]).toContain('created_at >=');
    expect(mock.queries[1]).toContain('created_at <=');
  });

  it('rejects the atomic insert when the sender already has 30 messages in the rolling window', async () => {
    const mock = mockedDatabase({
      onQuery: (query) => query.includes('count(*)') ? [{ message_count: 30 }] : [],
    });
    const repository = new PostgresClassroomRepository(mock.db as never);

    await expect(repository.insertMessage({
      senderId: 'self',
      recipientId: 'peer-a',
      body: 'Blocked',
      createdAt: '2026-09-16T09:00:00.000Z',
    })).rejects.toThrow('rate_limited');
    expect(mock.transactionCount).toBe(1);
    expect(mock.queries.some((query) => query.includes('insert into hoc_vui_private.classroom_messages'))).toBe(false);
  });
});
