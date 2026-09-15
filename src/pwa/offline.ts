export type OfflineStatus = 'development' | 'checking' | 'ready' | 'needs-download' | 'unsupported' | 'error';

export type OfflineStatusCopy = {
  label: string;
  detail: string;
};

const STATUS_COPY: Record<OfflineStatus, OfflineStatusCopy> = {
  development: {
    label: 'Bản local',
    detail: 'Bản dev không đăng ký Service Worker. Dùng preview production để kiểm tra offline.',
  },
  checking: {
    label: 'Đang kiểm tra',
    detail: 'Đang xác nhận đủ shell, JavaScript, CSS, ảnh, font, artwork pet và 29 gói bài học trước khi báo sẵn sàng.',
  },
  ready: {
    label: 'Đã sẵn sàng offline',
    detail: 'Đã xác nhận đủ shell, JavaScript, CSS, ảnh, font, artwork pet và 29 gói bài học trong cache phiên bản này.',
  },
  'needs-download': {
    label: 'Cần tải gói offline',
    detail: 'Hãy mở app khi có mạng để tải đủ gói trước khi chuyển sang offline.',
  },
  unsupported: {
    label: 'Chưa hỗ trợ offline',
    detail: 'Trình duyệt này chưa cung cấp Service Worker; nội dung vẫn dùng được khi online.',
  },
  error: {
    label: 'Chưa xác nhận offline',
    detail: 'Chưa thể xác nhận đủ gói offline. App không tự tải lại giữa một hoạt động đang học.',
  },
};

export function offlineStatusCopy(status: OfflineStatus): OfflineStatusCopy {
  return STATUS_COPY[status];
}

export function getInitialOfflineStatus(production: boolean): OfflineStatus {
  if (!production) return 'development';
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || typeof navigator.serviceWorker.register !== 'function') return 'unsupported';
  return navigator.onLine === false ? 'needs-download' : 'checking';
}

type OfflineStatusListener = (status: OfflineStatus) => void;

type WorkerStatusMessage = {
  type?: string;
  cacheName?: string;
};

type OfflineManifest = {
  schemaVersion?: unknown;
  cacheName?: unknown;
};

function isServiceWorkerUnsupported(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { name?: unknown; message?: unknown };
  const name = typeof candidate.name === 'string' ? candidate.name : '';
  const message = typeof candidate.message === 'string' ? candidate.message : '';
  return ['NotSupportedError', 'SecurityError'].includes(name) || /not supported|unsupported|not a function/i.test(message);
}

function statusAfterRegistrationFailure(error: unknown): OfflineStatus {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'needs-download';
  if (typeof navigator !== 'undefined' && (!('controller' in navigator.serviceWorker) || navigator.serviceWorker.controller === undefined)) return 'unsupported';
  return isServiceWorkerUnsupported(error) ? 'unsupported' : 'error';
}

export function registerOfflineWorker(production: boolean, onStatus: OfflineStatusListener): () => void {
  if (!production || typeof window === 'undefined' || typeof navigator === 'undefined' || !('serviceWorker' in navigator) || typeof navigator.serviceWorker.register !== 'function') {
    return () => undefined;
  }

  let currentStatus = getInitialOfflineStatus(true);
  let expectedCacheName: string | null = null;
  let activeRegistration: ServiceWorkerRegistration | null = null;
  const setStatus = (status: OfflineStatus) => {
    currentStatus = status;
    onStatus(status);
  };

  const postStatusCheck = (registration: ServiceWorkerRegistration) => {
    registration.active?.postMessage({ type: 'CHECK_STATUS' });
  };

  const manifestPromise = fetch('/offline-manifest.json')
    .then(async (response) => {
      if (!response.ok) throw new Error('offline manifest');
      const manifest = await response.json() as OfflineManifest;
      if (manifest.schemaVersion !== 1 || typeof manifest.cacheName !== 'string' || !manifest.cacheName.startsWith('hoc-vui-offline-')) throw new Error('offline manifest schema');
      expectedCacheName = manifest.cacheName;
      if (activeRegistration) postStatusCheck(activeRegistration);
      return true;
    })
    .catch((error: unknown) => {
      setStatus(statusAfterRegistrationFailure(error));
      return false;
    });

  const handleMessage = (event: MessageEvent<WorkerStatusMessage>) => {
    if (!expectedCacheName || event.data?.cacheName !== expectedCacheName) return;
    if (event.data?.type === 'OFFLINE_READY' && navigator.serviceWorker.controller) setStatus('ready');
    if (event.data?.type === 'OFFLINE_ERROR') setStatus(navigator.serviceWorker.controller ? 'error' : 'unsupported');
  };

  const handleControllerChange = () => {
    setStatus('checking');
    void Promise.all([navigator.serviceWorker.ready, manifestPromise])
      .then(([registration, manifestLoaded]) => {
        if (manifestLoaded) postStatusCheck(registration);
      })
      .catch((error: unknown) => setStatus(statusAfterRegistrationFailure(error)));
  };

  const handleOffline = () => {
    if (currentStatus !== 'ready') setStatus('needs-download');
  };

  const handleOnline = () => {
    if (currentStatus === 'ready') return;
    setStatus('checking');
    void Promise.all([navigator.serviceWorker.ready, manifestPromise])
      .then(([registration, manifestLoaded]) => {
        if (manifestLoaded) postStatusCheck(registration);
      })
      .catch((error: unknown) => setStatus(statusAfterRegistrationFailure(error)));
  };

  navigator.serviceWorker.addEventListener('message', handleMessage);
  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);

  void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      activeRegistration = registration;
      postStatusCheck(registration);
      return Promise.all([navigator.serviceWorker.ready, manifestPromise]).then(([readyRegistration, manifestLoaded]) => {
        activeRegistration = readyRegistration;
        if (registration.waiting && registration.active && manifestLoaded) setStatus('needs-download');
        if (manifestLoaded) postStatusCheck(readyRegistration);
      });
    })
    .catch((error: unknown) => setStatus(statusAfterRegistrationFailure(error)));

  return () => {
    navigator.serviceWorker.removeEventListener('message', handleMessage);
    navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('online', handleOnline);
  };
}

export function createServiceWorkerSource(cacheName: string, urls: string[]): string {
  const serializedCacheName = JSON.stringify(cacheName);
  const serializedUrls = JSON.stringify([...new Set(urls)]);
  return `const CACHE_NAME = ${serializedCacheName};
const PRECACHE_URLS = ${serializedUrls};

async function notifyClients() {
  const cache = await caches.open(CACHE_NAME);
  const missing = [];
  for (const url of PRECACHE_URLS) {
    if (!(await cache.match(url))) missing.push(url);
  }
  const type = missing.length ? 'OFFLINE_ERROR' : 'OFFLINE_READY';
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) client.postMessage({ type, cacheName: CACHE_NAME, missing });
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.filter((key) => key.startsWith('hoc-vui-offline-') && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
    await notifyClients();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CHECK_STATUS') event.waitUntil(notifyClients());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (!PRECACHE_URLS.includes(new URL(request.url).pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && PRECACHE_URLS.includes(new URL(request.url).pathname)) void cache.put(request, response.clone());
      return response;
    } catch {
      if (request.mode === 'navigate') {
        const fallback = await cache.match('/index.html') || await cache.match('/');
        if (fallback) return fallback;
      }
      return new Response('Offline resource unavailable', { status: 503, statusText: 'Offline' });
    }
  })());
});`;
}
