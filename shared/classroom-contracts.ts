import type { AvatarId } from './account-contracts.ts';

export const CLASSROOM_MESSAGE_MAX_LENGTH = 500;

export type FriendSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarId: AvatarId;
  online: boolean;
  unreadCount: number;
};

export type ClassroomMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type FriendsResponse = { friends: FriendSummary[]; unreadCount: number };
export type ClassroomMessagesResponse = { messages: ClassroomMessage[] };
export type ClassroomRealtimeConfig = {
  supabaseUrl: string;
  publishableKey: string;
  topic: string;
};
