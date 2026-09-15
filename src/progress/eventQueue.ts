import type { LearningEventInput } from '../../shared/learning-contracts';

export const EVENT_QUEUE_DB = 'hoc-vui-learning-events-v1';
export const EVENT_QUEUE_STORE = 'events';
const FALLBACK_KEY = 'hoc-vui-learning-events-v1';

export type QueuedLearningEvent = LearningEventInput & { ownerId: string; queuedAt: string };

function localStorageOrNull(): Storage | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

function key(ownerId: string, eventId: string): string {
  return `${ownerId}:${eventId}`;
}

function readFallback(): QueuedLearningEvent[] {
  const storage = localStorageOrNull();
  if (!storage) return [];
  try {
    const raw = storage.getItem(FALLBACK_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is QueuedLearningEvent => Boolean(item && typeof item === 'object' && typeof (item as { ownerId?: unknown }).ownerId === 'string' && typeof (item as { eventId?: unknown }).eventId === 'string')) : [];
  } catch { return []; }
}

function writeFallback(events: QueuedLearningEvent[]): void {
  try { localStorageOrNull()?.setItem(FALLBACK_KEY, JSON.stringify(events)); } catch { /* queue errors are surfaced by the caller */ }
}

function indexedDbOrNull(): IDBFactory | null {
  if (typeof indexedDB === 'undefined') return null;
  return indexedDB;
}

function openDatabase(): Promise<IDBDatabase | null> {
  const factory = indexedDbOrNull();
  if (!factory) return Promise.resolve(null);
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try { request = factory.open(EVENT_QUEUE_DB, 1); } catch { resolve(null); return; }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(EVENT_QUEUE_STORE)) request.result.createObjectStore(EVENT_QUEUE_STORE, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | null> {
  const db = await openDatabase();
  if (!db) return null;
  try {
    const transaction = db.transaction(EVENT_QUEUE_STORE, mode);
    const request = operation(transaction.objectStore(EVENT_QUEUE_STORE));
    if (!request) return null;
    const result = await idbRequest(request);
    await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error); });
    return result;
  } catch {
    return null;
  } finally {
    db.close();
  }
}

export async function enqueueLearningEvent(ownerId: string, event: LearningEventInput, queuedAt = new Date().toISOString()): Promise<boolean> {
  if (!ownerId) return false;
  const queued: QueuedLearningEvent = { ...event, ownerId, queuedAt };
  const result = await withStore('readwrite', (store) => store.put({ ...queued, key: key(ownerId, event.eventId) }));
  if (result !== null) return true;
  const events = readFallback().filter((item) => key(item.ownerId, item.eventId) !== key(ownerId, event.eventId));
  events.push(queued);
  writeFallback(events);
  return true;
}

export async function listQueuedLearningEvents(ownerId: string): Promise<QueuedLearningEvent[]> {
  if (!ownerId) return [];
  const result = await withStore<QueuedLearningEvent[]>('readonly', (store) => store.getAll());
  const events = result === null ? readFallback() : result;
  return events.filter((event) => event.ownerId === ownerId).sort((a, b) => a.queuedAt.localeCompare(b.queuedAt) || a.sequence - b.sequence).map(({ ownerId: _ownerId, ...event }) => event as QueuedLearningEvent);
}

export async function acknowledgeLearningEvents(ownerId: string, eventIds: readonly string[]): Promise<boolean> {
  if (!ownerId || !eventIds.length) return true;
  const keys = eventIds.map((eventId) => key(ownerId, eventId));
  const db = await openDatabase();
  if (db) {
    try {
      const transaction = db.transaction(EVENT_QUEUE_STORE, 'readwrite');
      const store = transaction.objectStore(EVENT_QUEUE_STORE);
      keys.forEach((item) => store.delete(item));
      await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error); });
      db.close();
      return true;
    } catch { db.close(); }
  }
  writeFallback(readFallback().filter((event) => !(event.ownerId === ownerId && eventIds.includes(event.eventId))));
  return true;
}

export async function countQueuedLearningEvents(ownerId: string): Promise<number> {
  return (await listQueuedLearningEvents(ownerId)).length;
}
