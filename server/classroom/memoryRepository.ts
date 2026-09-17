import { randomUUID } from 'node:crypto';
import type { FriendSummary } from '../../shared/classroom-contracts';
import type { ClassroomMessageRecord, ClassroomPeerRecord, ClassroomRepository } from './types';

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class MemoryClassroomRepository implements ClassroomRepository {
  readonly peers = new Map<string, ClassroomPeerRecord>();
  readonly presence = new Map<string, string>();
  readonly messages: ClassroomMessageRecord[] = [];

  constructor(peers: readonly ClassroomPeerRecord[] = []) {
    for (const peer of peers) this.peers.set(peer.id, clone(peer));
  }

  async listActivePeers(actorId: string): Promise<ClassroomPeerRecord[]> {
    return [...this.peers.values()]
      .filter((peer) => peer.role === 'student' && peer.active && peer.id !== actorId)
      .map(clone);
  }

  async listFriendSummaries(actorId: string, now: string): Promise<FriendSummary[]> {
    const peers = await this.listActivePeers(actorId);
    const [presence, unreadCounts] = await Promise.all([
      this.listPresence(peers.map((peer) => peer.id)),
      this.listUnreadCounts(actorId),
    ]);
    const nowMs = Date.parse(now);
    return peers.map((peer) => ({
      id: peer.id,
      username: peer.username,
      displayName: peer.displayName,
      avatarId: peer.avatarId,
      online: Date.parse(presence.get(peer.id) ?? '') >= nowMs - 120_000,
      unreadCount: unreadCounts.get(peer.id) ?? 0,
    })).sort((left, right) => Number(right.online) - Number(left.online)
      || left.displayName.localeCompare(right.displayName)
      || left.username.localeCompare(right.username));
  }

  async upsertPresence(accountId: string, lastSeen: string): Promise<void> {
    this.presence.set(accountId, lastSeen);
  }

  async listPresence(accountIds: readonly string[]): Promise<ReadonlyMap<string, string>> {
    return new Map(accountIds.flatMap((accountId) => {
      const lastSeen = this.presence.get(accountId);
      return lastSeen ? [[accountId, lastSeen] as const] : [];
    }));
  }

  async listUnreadCounts(recipientId: string): Promise<ReadonlyMap<string, number>> {
    const counts = new Map<string, number>();
    for (const message of this.messages) {
      if (message.recipientId === recipientId && message.readAt === null) {
        counts.set(message.senderId, (counts.get(message.senderId) ?? 0) + 1);
      }
    }
    return counts;
  }

  async listMessages(actorId: string, peerId: string, limit: number): Promise<ClassroomMessageRecord[]> {
    const boundedLimit = Math.min(Math.max(Math.floor(limit), 0), 50);
    return this.messages
      .filter((message) => (message.senderId === actorId && message.recipientId === peerId) || (message.senderId === peerId && message.recipientId === actorId))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, boundedLimit)
      .map(clone);
  }

  async findActivePeer(peerId: string): Promise<ClassroomPeerRecord | null> {
    const peer = this.peers.get(peerId);
    return peer && peer.role === 'student' && peer.active ? clone(peer) : null;
  }

  async countRecentSentMessages(senderId: string, since: string): Promise<number> {
    return this.messages.filter((message) => message.senderId === senderId && message.createdAt >= since).length;
  }

  async insertMessage(input: { senderId: string; recipientId: string; body: string; createdAt: string }): Promise<ClassroomMessageRecord> {
    const message: ClassroomMessageRecord = {
      id: randomUUID(),
      senderId: input.senderId,
      recipientId: input.recipientId,
      body: input.body,
      createdAt: input.createdAt,
      readAt: null,
    };
    this.messages.push(clone(message));
    return clone(message);
  }

  async markMessagesRead(recipientId: string, senderId: string, readAt: string): Promise<number> {
    let updated = 0;
    for (const message of this.messages) {
      if (message.recipientId === recipientId && message.senderId === senderId && message.readAt === null) {
        message.readAt = readAt;
        updated += 1;
      }
    }
    return updated;
  }
}
