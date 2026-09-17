import type { AvatarId } from '../../shared/account-contracts.ts';
import type { FriendSummary } from '../../shared/classroom-contracts.ts';

export type ClassroomPeerRecord = {
  id: string;
  username: string;
  displayName: string;
  avatarId: AvatarId;
  role: 'student' | 'admin';
  active: boolean;
};

export type ClassroomMessageRecord = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type ClassroomRepository = {
  listActivePeers(actorId: string): Promise<ClassroomPeerRecord[]>;
  listFriendSummaries(actorId: string, now: string): Promise<FriendSummary[]>;
  upsertPresence(accountId: string, lastSeen: string): Promise<void>;
  listPresence(accountIds: readonly string[]): Promise<ReadonlyMap<string, string>>;
  listUnreadCounts(recipientId: string): Promise<ReadonlyMap<string, number>>;
  listMessages(actorId: string, peerId: string, limit: number): Promise<ClassroomMessageRecord[]>;
  findActivePeer(peerId: string): Promise<ClassroomPeerRecord | null>;
  countRecentSentMessages(senderId: string, since: string): Promise<number>;
  insertMessage(input: { senderId: string; recipientId: string; body: string; createdAt: string }): Promise<ClassroomMessageRecord>;
  markMessagesRead(recipientId: string, senderId: string, readAt: string): Promise<number>;
};
