import { describe, expect, it, vi } from 'vitest';
import { getLessonPackage } from '../../src/content/packages';
import type { LearningEventInput } from '../../shared/learning-contracts';
import { PROGRESS_BOARD_CONTENT_INDEX } from '../analytics/progressBoardContent';
import { createEmptySnapshot } from './engine';
import type { LearningRepository } from './types';
import { MemoryLearningRepository } from './memoryRepository';
import { createLearningService } from './service';

const studentId = '11111111-1111-4111-8111-111111111111';
const runId = '22222222-2222-4222-8222-222222222222';

function event(sequence: number, type: LearningEventInput['type'], extra: Partial<LearningEventInput> = {}): LearningEventInput {
  return { eventId: `33333333-3333-4333-8333-${String(sequence).padStart(12, '0')}`, runId, sequence, type, lessonId: 'lesson-01', lessonVersion: 1, deviceId: 'tablet-a', generation: 0, ...extra };
}

describe('server learning replay', () => {
  it('recomputes answers, deduplicates retries, and grants a mission once', async () => {
    const repository = new MemoryLearningRepository();
    const service = createLearningService(repository, () => new Date('2026-09-13T02:00:00.000Z'));
    const lesson = getLessonPackage('lesson-01');
    const first = lesson.missions[0].activities[0];
    const second = lesson.missions[0].activities[1];
    if (first.type !== 'choice' || second.type !== 'match') throw new Error('fixture activity types changed');

    expect((await service.appendEvents(studentId, [event(1, 'run_started')])).ok).toBe(true);
    const discovery = await service.appendEvents(studentId, [event(2, 'discovery_done')]);
    expect(discovery.ok).toBe(true);
    const answered = await service.appendEvents(studentId, [event(3, 'answer_submitted', { activityId: first.id, response: { type: 'choice', optionId: first.correctId } })]);
    expect(answered.ok).toBe(true);
    if (!answered.ok) return;
    const duplicate = await service.appendEvents(studentId, [event(3, 'answer_submitted', { activityId: first.id, response: { type: 'choice', optionId: 'forged' } })]);
    expect(duplicate.ok).toBe(true);
    if (!duplicate.ok) return;
    expect(duplicate.acknowledgements[0]?.status).toBe('duplicate');
    expect(duplicate.snapshot.revision).toBe(answered.snapshot.revision);

    expect((await service.appendEvents(studentId, [event(4, 'next')])).ok).toBe(true);
    expect((await service.appendEvents(studentId, [event(5, 'answer_submitted', { activityId: second.id, response: { type: 'match', pairs: second.pairs.map((pair) => [pair.leftId, pair.rightId]) } })])).ok).toBe(true);
    const completedMission = await service.appendEvents(studentId, [event(6, 'next')]);
    expect(completedMission.ok).toBe(true);
    if (!completedMission.ok) return;
    expect(completedMission.snapshot.progress.completedMissions).toContain('b1-m1');

    const invalidStep = await service.appendEvents(studentId, [event(7, 'answer_submitted', { activityId: 'not-current', response: { type: 'choice', optionId: first.correctId } })]);
    expect(invalidStep.ok).toBe(false);
    expect((await service.appendEvents(studentId, [event(7, 'next')])).ok).toBe(true);
    expect((await service.appendEvents(studentId, [event(8, 'discovery_done')])).ok).toBe(true);
  });

  it('rejects out-of-order and stale post-reset events without changing the snapshot', async () => {
    const repository = new MemoryLearningRepository();
    const service = createLearningService(repository);
    expect((await service.appendEvents(studentId, [event(1, 'run_started')])).ok).toBe(true);
    const before = await service.getProgress(studentId);
    const outOfOrder = await service.appendEvents(studentId, [event(3, 'discovery_done')]);
    expect(outOfOrder).toMatchObject({ ok: false, code: 'conflict' });
    expect((await service.getProgress(studentId)).snapshot.revision).toBe(before.snapshot.revision);
    const reset = await service.resetProgress(studentId);
    expect(reset.snapshot.generation).toBe(1);
    const stale = await service.appendEvents(studentId, [event(2, 'discovery_done')]);
    expect(stale).toMatchObject({ ok: false, code: 'stale' });
    expect((await service.getProgress(studentId)).snapshot.progress.completedMissions).toHaveLength(0);
  });

  it('isolates devices while retaining independent replay runs for one student', async () => {
    const repository = new MemoryLearningRepository();
    const service = createLearningService(repository);
    expect((await service.appendEvents(studentId, [event(1, 'run_started')])).ok).toBe(true);

    const otherDevice = event(2, 'discovery_done', { deviceId: 'tablet-b' });
    expect(await service.appendEvents(studentId, [otherDevice])).toMatchObject({ ok: false, code: 'conflict' });
    expect((await service.getProgress(studentId)).snapshot.revision).toBe(1);
    expect((await service.appendEvents(studentId, [event(2, 'discovery_done')])).ok).toBe(true);

    const secondRun = event(1, 'run_started', {
      runId: '66666666-6666-4666-8666-666666666666',
      eventId: '77777777-7777-4777-8777-777777777777',
      deviceId: 'tablet-b',
    });
    expect((await service.appendEvents(studentId, [secondRun])).ok).toBe(true);
    expect(repository.runs.size).toBe(2);
    expect((await service.listEvents(studentId))).toHaveLength(3);
  });

  it('does not partially commit a batch when a later event is invalid', async () => {
    const repository = new MemoryLearningRepository();
    const service = createLearningService(repository);
    const batch = await service.appendEvents(studentId, [event(1, 'run_started'), event(3, 'discovery_done')]);
    expect(batch).toMatchObject({ ok: false, code: 'conflict' });
    expect((await service.getProgress(studentId)).snapshot.revision).toBe(0);
    expect(repository.runs.size).toBe(0);
    expect(await service.listEvents(studentId)).toHaveLength(0);
  });

  it('returns a cloned progress-board source scoped to one student', async () => {
    const repository = new MemoryLearningRepository();
    const service = createLearningService(repository);
    const otherStudentId = '22222222-2222-4222-8222-222222222222';
    expect((await service.appendEvents(studentId, [event(1, 'run_started'), event(2, 'discovery_done')])).ok).toBe(true);
    expect((await service.appendEvents(otherStudentId, [event(1, 'run_started', {
      eventId: '88888888-8888-4888-8888-888888888888',
      runId: '99999999-9999-4999-8999-999999999999',
    })])).ok).toBe(true);

    const source = await repository.getProgressBoardSource(studentId);
    expect(source.snapshot.studentId).toBe(studentId);
    expect(source.events).toHaveLength(2);
    expect(source.events.every((item) => item.studentId === studentId)).toBe(true);
    source.snapshot.progress.completedMissions.push('mutated');
    source.events.pop();

    const reread = await repository.getProgressBoardSource(studentId);
    expect(reread.snapshot.progress.completedMissions).not.toContain('mutated');
    expect(reread.events).toHaveLength(2);
  });

  it('builds the personal board through one repository read boundary', async () => {
    const source = { snapshot: createEmptySnapshot(studentId, '2026-09-17T09:00:00.000Z'), events: [] };
    const getProgressBoardSource = vi.fn().mockResolvedValue(source);
    const repository = { getProgressBoardSource } as unknown as LearningRepository;
    const service = createLearningService(repository, () => new Date('2026-09-17T10:00:00.000Z'), PROGRESS_BOARD_CONTENT_INDEX);

    const data = await service.getProgressBoard(studentId);

    expect(getProgressBoardSource).toHaveBeenCalledOnce();
    expect(getProgressBoardSource).toHaveBeenCalledWith(studentId);
    expect(data).toMatchObject({ generation: '0', generatedAt: '2026-09-17T10:00:00.000Z', stale: false });
  });
});
