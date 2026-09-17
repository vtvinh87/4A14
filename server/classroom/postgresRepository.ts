import type postgres from 'postgres';
import { withTransaction, type DatabaseClient, type DatabaseTransaction } from '../db/client.ts';
import type { FriendSummary } from '../../shared/classroom-contracts.ts';
import type { ClassroomMessageRecord, ClassroomPeerRecord, ClassroomRepository } from './types.ts';

type QueryClient = DatabaseClient | DatabaseTransaction;
type PeerRow = { id: string; username: string; display_name: string; avatar_id: ClassroomPeerRecord['avatarId'] };
type FriendSummaryRow = { id: string; username: string; display_name: string; avatar_id: FriendSummary['avatarId']; online: boolean; unread_count: number };
type MessageRow = { id: string; sender_id: string; recipient_id: string; body: string; created_at: Date | string; read_at: Date | string | null };
type CountRow = { message_count: number };

function iso(value: Date | string | null): string | null {
  return value === null ? null : value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapPeer(row: PeerRow): ClassroomPeerRecord {
  return { id: row.id, username: row.username, displayName: row.display_name, avatarId: row.avatar_id, role: 'student', active: true };
}

function mapMessage(row: MessageRow): ClassroomMessageRecord {
  return { id: row.id, senderId: row.sender_id, recipientId: row.recipient_id, body: row.body, createdAt: iso(row.created_at)!, readAt: iso(row.read_at) };
}

export class PostgresClassroomRepository implements ClassroomRepository {
  constructor(private readonly db: DatabaseClient) {}

  async listActivePeers(actorId: string): Promise<ClassroomPeerRecord[]> {
    const rows = await this.db<PeerRow[]>`
      select id, username, display_name, avatar_id
      from hoc_vui_private.accounts
      where role = 'student' and active = true and id <> ${actorId}::uuid
      order by lower(display_name), username
    `;
    return rows.map(mapPeer);
  }

  async listFriendSummaries(actorId: string, now: string): Promise<FriendSummary[]> {
    const rows = await this.db<FriendSummaryRow[]>`
      select
        a.id,
        a.username,
        a.display_name,
        a.avatar_id,
        (p.last_seen >= (${now}::timestamptz - interval '120 seconds')) as online,
        coalesce(unread.unread_count, 0)::int as unread_count
      from hoc_vui_private.accounts a
      left join hoc_vui_private.classroom_presence p on p.account_id = a.id
      left join (
        select sender_id, count(*)::int as unread_count
        from hoc_vui_private.classroom_messages
        where recipient_id = ${actorId}::uuid and read_at is null
        group by sender_id
      ) unread on unread.sender_id = a.id
      where a.role = 'student' and a.active = true and a.id <> ${actorId}::uuid
      order by online desc, lower(a.display_name), a.username
    ` as FriendSummaryRow[];
    return rows.map((row) => ({ id: row.id, username: row.username, displayName: row.display_name, avatarId: row.avatar_id, online: Boolean(row.online), unreadCount: Number(row.unread_count) }));
  }

  async upsertPresence(accountId: string, lastSeen: string): Promise<void> {
    await this.db`
      insert into hoc_vui_private.classroom_presence (account_id, last_seen)
      values (${accountId}::uuid, ${lastSeen})
      on conflict (account_id) do update set last_seen = excluded.last_seen, updated_at = now()
    `;
  }

  async listPresence(accountIds: readonly string[]): Promise<ReadonlyMap<string, string>> {
    if (accountIds.length === 0) return new Map();
    const rows = await this.db<{ account_id: string; last_seen: Date | string }[]>`
      select account_id, last_seen
      from hoc_vui_private.classroom_presence
      where account_id = any(${this.db.array([...accountIds])}::uuid[])
    `;
    return new Map(rows.map((row) => [row.account_id, iso(row.last_seen)!]));
  }

  async listUnreadCounts(recipientId: string): Promise<ReadonlyMap<string, number>> {
    const rows = await this.db<{ sender_id: string; unread_count: number }[]>`
      select sender_id, count(*)::int as unread_count
      from hoc_vui_private.classroom_messages
      where recipient_id = ${recipientId}::uuid and read_at is null
      group by sender_id
    `;
    return new Map(rows.map((row) => [row.sender_id, Number(row.unread_count)]));
  }

  async listMessages(actorId: string, peerId: string, limit: number): Promise<ClassroomMessageRecord[]> {
    const boundedLimit = Math.min(Math.max(Math.floor(limit), 0), 50);
    const rows = await this.db<MessageRow[]>`
      select id, sender_id, recipient_id, body, created_at, read_at
      from hoc_vui_private.classroom_messages
      where (sender_id = ${actorId}::uuid and recipient_id = ${peerId}::uuid)
         or (sender_id = ${peerId}::uuid and recipient_id = ${actorId}::uuid)
      order by created_at asc
      limit ${boundedLimit}
    `;
    return rows.map(mapMessage);
  }

  async findActivePeer(peerId: string): Promise<ClassroomPeerRecord | null> {
    const rows = await this.db<PeerRow[]>`
      select id, username, display_name, avatar_id
      from hoc_vui_private.accounts
      where id = ${peerId}::uuid and role = 'student' and active = true
      limit 1
    `;
    return rows[0] ? mapPeer(rows[0]) : null;
  }

  async countRecentSentMessages(senderId: string, since: string): Promise<number> {
    const rows = await this.db<{ message_count: number }[]>`
      select count(*)::int as message_count
      from hoc_vui_private.classroom_messages
      where sender_id = ${senderId}::uuid and created_at >= ${since}
    `;
    return Number(rows[0]?.message_count ?? 0);
  }

  async insertMessage(input: { senderId: string; recipientId: string; body: string; createdAt: string }): Promise<ClassroomMessageRecord> {
    return withTransaction(this.db, async (tx) => {
      await tx`
        select pg_advisory_xact_lock(hashtextextended(${input.senderId}, 0::bigint))
      `;
      const countRows = await tx<CountRow[]>`
        select count(*)::int as message_count
        from hoc_vui_private.classroom_messages
        where sender_id = ${input.senderId}::uuid
          and created_at >= (${input.createdAt}::timestamptz - interval '60 seconds')
          and created_at <= ${input.createdAt}::timestamptz
      `;
      if (Number(countRows[0]?.message_count ?? 0) >= 30) throw new Error('rate_limited');

      const rows = await tx<MessageRow[]>`
        insert into hoc_vui_private.classroom_messages (sender_id, recipient_id, body, created_at)
        values (${input.senderId}::uuid, ${input.recipientId}::uuid, ${input.body}, ${input.createdAt})
        returning id, sender_id, recipient_id, body, created_at, read_at
      `;
      return mapMessage(rows[0]);
    });
  }

  async markMessagesRead(recipientId: string, senderId: string, readAt: string): Promise<number> {
    const rows = await this.db<{ id: string }[]>`
      update hoc_vui_private.classroom_messages
      set read_at = ${readAt}
      where recipient_id = ${recipientId}::uuid and sender_id = ${senderId}::uuid and read_at is null
      returning id
    `;
    return rows.length;
  }
}
