import { describe, expect, it, vi } from 'vitest';
import { CLASSROOM_MESSAGE_MAX_LENGTH } from '../../shared/classroom-contracts';
import { MemoryClassroomRepository } from './memoryRepository';
import { createClassroomService } from './service';

function fixtureRepository() {
  return new MemoryClassroomRepository([
    { id: 'student-a', username: 'an', displayName: 'An', avatarId: 'fox-scout', role: 'student', active: true },
    { id: 'peer-online', username: 'binh', displayName: 'Bình', avatarId: 'fox-leaf', role: 'student', active: true },
    { id: 'peer-offline', username: 'chi', displayName: 'Chi', avatarId: 'fox-night', role: 'student', active: true },
    { id: 'peer-inactive', username: 'dung', displayName: 'Dũng', avatarId: 'fox-sunny', role: 'student', active: false },
    { id: 'admin', username: 'admin', displayName: 'Admin', avatarId: 'fox-scout', role: 'admin', active: true },
  ]);
}

async function seedThirtyMessages(repository: MemoryClassroomRepository, senderId: string, recipientId: string, now: Date): Promise<void> {
  for (let index = 0; index < 30; index += 1) {
    await repository.insertMessage({
      senderId,
      recipientId,
      body: `Tin ${index + 1}`,
      createdAt: new Date(now.getTime() - index * 1000).toISOString(),
    });
  }
}

describe('ClassroomService', () => {
  it('returns online friends first and computes unread badges without exact presence', async () => {
    const now = new Date('2026-09-16T08:00:00.000Z');
    const repository = fixtureRepository();
    await repository.upsertPresence('peer-online', new Date(now.getTime() - 60_000).toISOString());
    await repository.upsertPresence('peer-offline', new Date(now.getTime() - 120_001).toISOString());
    await repository.insertMessage({ senderId: 'peer-online', recipientId: 'student-a', body: 'Chào bạn', createdAt: now.toISOString() });
    await repository.insertMessage({ senderId: 'peer-offline', recipientId: 'student-a', body: 'Chào An', createdAt: now.toISOString() });
    await repository.insertMessage({ senderId: 'peer-online', recipientId: 'someone-else', body: 'Không tính', createdAt: now.toISOString() });

    const service = createClassroomService(repository, () => now);

    await expect(service.listFriends('student-a')).resolves.toEqual({
      friends: [
        { id: 'peer-online', username: 'binh', displayName: 'Bình', avatarId: 'fox-leaf', online: true, unreadCount: 1 },
        { id: 'peer-offline', username: 'chi', displayName: 'Chi', avatarId: 'fox-night', online: false, unreadCount: 1 },
      ],
      unreadCount: 2,
    });
  });

  it('uses the roster read boundary once and preserves online sorting', async () => {
    const now = new Date('2026-09-16T08:00:00.000Z');
    const repository = fixtureRepository();
    const listRoster = vi.fn(async () => [
      { id: 'peer-offline', username: 'chi', displayName: 'Chi', avatarId: 'fox-night' as const, role: 'student' as const, active: true, lastSeen: null, unreadCount: 1 },
      { id: 'peer-online', username: 'binh', displayName: 'Bình', avatarId: 'fox-leaf' as const, role: 'student' as const, active: true, lastSeen: '2026-09-16T07:59:00.000Z', unreadCount: 2 },
    ]);
    Object.assign(repository, { listRoster });
    const listActivePeers = vi.spyOn(repository, 'listActivePeers').mockRejectedValue(new Error('legacy roster path used'));
    const service = createClassroomService(repository, () => now);

    await expect(service.listFriends('student-a')).resolves.toEqual({
      friends: [
        { id: 'peer-online', username: 'binh', displayName: 'Bình', avatarId: 'fox-leaf', online: true, unreadCount: 2 },
        { id: 'peer-offline', username: 'chi', displayName: 'Chi', avatarId: 'fox-night', online: false, unreadCount: 1 },
      ],
      unreadCount: 3,
    });
    expect(listRoster).toHaveBeenCalledOnce();
    expect(listRoster).toHaveBeenCalledWith('student-a');
    expect(listActivePeers).not.toHaveBeenCalled();
  });

  it('normalizes a message body before storing it', async () => {
    const now = new Date('2026-09-16T08:00:00.000Z');
    const repository = fixtureRepository();
    const service = createClassroomService(repository, () => now);

    await expect(service.sendMessage('student-a', 'peer-online', '  Xin chào  ')).resolves.toMatchObject({
      message: { senderId: 'student-a', recipientId: 'peer-online', body: 'Xin chào', createdAt: now.toISOString(), readAt: null },
    });
    await expect(service.sendMessage('student-a', 'peer-online', '   ')).resolves.toEqual({ ok: false, code: 'invalid', message: 'Tin nhắn không được để trống.' });
    await expect(service.sendMessage('student-a', 'peer-online', 'a'.repeat(CLASSROOM_MESSAGE_MAX_LENGTH + 1))).resolves.toEqual({ ok: false, code: 'invalid', message: 'Tin nhắn dài tối đa 500 ký tự.' });
  });

  it('rejects self, missing, and inactive peers', async () => {
    const service = createClassroomService(fixtureRepository(), () => new Date('2026-09-16T08:00:00.000Z'));

    await expect(service.sendMessage('student-a', 'student-a', 'Chào')).resolves.toEqual({ ok: false, code: 'invalid', message: 'Không thể gửi tin nhắn cho chính mình.' });
    await expect(service.listMessages('student-a', 'missing', 50)).resolves.toEqual({ ok: false, code: 'not-found', message: 'Không tìm thấy bạn học này.' });
    await expect(service.markRead('student-a', 'peer-inactive')).resolves.toEqual({ ok: false, code: 'not-found', message: 'Không tìm thấy bạn học này.' });
  });

  it('marks only incoming messages from the selected peer as read', async () => {
    const now = new Date('2026-09-16T08:00:00.000Z');
    const repository = fixtureRepository();
    const incoming = await repository.insertMessage({ senderId: 'peer-online', recipientId: 'student-a', body: 'Đến', createdAt: now.toISOString() });
    const outgoing = await repository.insertMessage({ senderId: 'student-a', recipientId: 'peer-online', body: 'Đi', createdAt: now.toISOString() });
    const service = createClassroomService(repository, () => now);

    await expect(service.markRead('student-a', 'peer-online')).resolves.toEqual({ marked: 1 });
    await expect(service.listMessages('student-a', 'peer-online', 50)).resolves.toEqual({
      messages: [
        expect.objectContaining({ id: incoming.id, readAt: now.toISOString() }),
        expect.objectContaining({ id: outgoing.id, readAt: null }),
      ],
    });
  });

  it('rejects the 31st message in an inclusive rolling 60-second window', async () => {
    const now = new Date('2026-09-16T08:00:00.000Z');
    const repository = fixtureRepository();
    await seedThirtyMessages(repository, 'student-a', 'peer-online', now);
    const service = createClassroomService(repository, () => now);

    await expect(service.sendMessage('student-a', 'peer-online', 'Tin thứ 31')).resolves.toEqual({
      ok: false,
      code: 'rate-limited',
      message: 'Bạn đã gửi quá nhanh; hãy thử lại sau một lát.',
    });
  });

  it('maps the repository atomic rate limit to the public failure', async () => {
    const now = new Date('2026-09-16T08:00:00.000Z');
    const repository = fixtureRepository();
    const insertMessage = repository.insertMessage.bind(repository);
    repository.insertMessage = async (input) => {
      if (input.senderId === 'student-a') throw new Error('rate_limited');
      return insertMessage(input);
    };
    const service = createClassroomService(repository, () => now);

    await expect(service.sendMessage('student-a', 'peer-online', 'Tin bị chặn nguyên tử')).resolves.toEqual({
      ok: false,
      code: 'rate-limited',
      message: 'Bạn đã gửi quá nhanh; hãy thử lại sau một lát.',
    });
  });

  it('persists first, then notifies the recipient without making realtime a delivery dependency', async () => {
    const now = new Date('2026-09-16T08:00:00.000Z');
    const repository = fixtureRepository();
    const realtime = {
      configForStudent: async () => ({ supabaseUrl: 'https://example.supabase.co', publishableKey: 'public-key', topic: 'classroom:student:opaque' }),
      notifyMessage: async () => { throw new Error('broadcast unavailable'); },
    };
    const service = createClassroomService(repository, () => now, realtime);

    const result = await service.sendMessage('student-a', 'peer-online', 'Tin vẫn phải lưu');

    expect(result).toMatchObject({ message: { senderId: 'student-a', recipientId: 'peer-online', body: 'Tin vẫn phải lưu' } });
    await expect(service.realtimeConfig('student-a')).resolves.toEqual({ supabaseUrl: 'https://example.supabase.co', publishableKey: 'public-key', topic: 'classroom:student:opaque' });
  });
});
