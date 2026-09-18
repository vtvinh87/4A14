import { CLASSROOM_MESSAGE_MAX_LENGTH, type ClassroomMessage, type ClassroomMessagesResponse, type ClassroomRealtimeConfig, type FriendSummary, type FriendsResponse } from '../../shared/classroom-contracts.ts';
import type { ClassroomMessageRecord, ClassroomRepository } from './types.ts';
import type { ClassroomRealtimeBridge } from './realtime.ts';

export type ClassroomFailureCode = 'invalid' | 'forbidden' | 'not-found' | 'rate-limited' | 'unavailable';
export type ClassroomFailure = { ok: false; code: ClassroomFailureCode; message: string };

export type ClassroomService = {
  listFriends(studentId: string): Promise<FriendsResponse>;
  heartbeat(studentId: string): Promise<void>;
  listMessages(studentId: string, peerId: string, limit: number): Promise<ClassroomMessagesResponse | ClassroomFailure>;
  sendMessage(studentId: string, peerId: string, body: string): Promise<{ message: ClassroomMessage } | ClassroomFailure>;
  markRead(studentId: string, peerId: string): Promise<{ marked: number } | ClassroomFailure>;
  realtimeConfig(studentId: string): Promise<ClassroomRealtimeConfig | null>;
};

const ONLINE_WINDOW_MS = 120_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_MESSAGES = 30;

function messageView(message: ClassroomMessageRecord): ClassroomMessage {
  return {
    id: message.id,
    senderId: message.senderId,
    recipientId: message.recipientId,
    body: message.body,
    createdAt: message.createdAt,
    readAt: message.readAt,
  };
}

function failure(code: ClassroomFailureCode, message: string): ClassroomFailure {
  return { ok: false, code, message };
}

async function activePeerOrFailure(repository: ClassroomRepository, studentId: string, peerId: string): Promise<ClassroomFailure | true> {
  if (peerId === studentId) return failure('invalid', 'Không thể gửi tin nhắn cho chính mình.');
  if (!await repository.findActivePeer(peerId)) return failure('not-found', 'Không tìm thấy bạn học này.');
  return true;
}

export function createClassroomService(repository: ClassroomRepository, clock: () => Date = () => new Date(), realtimeBridge?: ClassroomRealtimeBridge | null): ClassroomService {
  return {
    async listFriends(studentId) {
      const now = clock();
      const roster = await repository.listRoster(studentId);
      const friends: FriendSummary[] = roster.map((peer) => ({
        id: peer.id,
        username: peer.username,
        displayName: peer.displayName,
        avatarId: peer.avatarId,
        online: Date.parse(peer.lastSeen ?? '') >= now.getTime() - ONLINE_WINDOW_MS,
        unreadCount: peer.unreadCount,
      })).sort((left, right) => Number(right.online) - Number(left.online)
        || left.displayName.localeCompare(right.displayName)
        || left.username.localeCompare(right.username));
      return { friends, unreadCount: friends.reduce((total, friend) => total + friend.unreadCount, 0) };
    },

    async heartbeat(studentId) {
      await repository.upsertPresence(studentId, clock().toISOString());
    },

    async listMessages(studentId, peerId, limit) {
      const peer = await activePeerOrFailure(repository, studentId, peerId);
      if (peer !== true) return peer;
      return { messages: (await repository.listMessages(studentId, peerId, limit)).map(messageView) };
    },

    async sendMessage(studentId, peerId, body) {
      const normalizedBody = body.trim();
      if (!normalizedBody) return failure('invalid', 'Tin nhắn không được để trống.');
      if (normalizedBody.length > CLASSROOM_MESSAGE_MAX_LENGTH) return failure('invalid', `Tin nhắn dài tối đa ${CLASSROOM_MESSAGE_MAX_LENGTH} ký tự.`);
      const peer = await activePeerOrFailure(repository, studentId, peerId);
      if (peer !== true) return peer;
      const now = clock();
      const recentCount = await repository.countRecentSentMessages(studentId, new Date(now.getTime() - RATE_LIMIT_WINDOW_MS).toISOString());
      if (recentCount >= RATE_LIMIT_MAX_MESSAGES) return failure('rate-limited', 'Bạn đã gửi quá nhanh; hãy thử lại sau một lát.');
      try {
        const message = messageView(await repository.insertMessage({ senderId: studentId, recipientId: peerId, body: normalizedBody, createdAt: now.toISOString() }));
        if (realtimeBridge) {
          try {
            await realtimeBridge.notifyMessage({ messageId: message.id, recipientId: message.recipientId });
          } catch {
            // Durable chat delivery must remain available when the best-effort notification path is down.
          }
        }
        return { message };
      } catch (error) {
        if (error instanceof Error && error.message === 'rate_limited') return failure('rate-limited', 'Bạn đã gửi quá nhanh; hãy thử lại sau một lát.');
        throw error;
      }
    },

    async markRead(studentId, peerId) {
      const peer = await activePeerOrFailure(repository, studentId, peerId);
      if (peer !== true) return peer;
      return { marked: await repository.markMessagesRead(studentId, peerId, clock().toISOString()) };
    },

    async realtimeConfig(studentId) {
      return realtimeBridge ? realtimeBridge.configForStudent(studentId) : null;
    },
  };
}
