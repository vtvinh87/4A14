import { isLessonUnlocked } from './game/lessonAccess';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_STUDENT_PIN } from './auth/account';
import { ChangePinView, LoginView, ParentPinChangeDialog, ParentPinDialog } from './views/AuthView';
import { AdminView } from './views/AdminView';
import { changeParentPin, changeStudentPin, getAccountProgress, getChallengeRolloutConfig, getCurrentAuthSession, getParentDashboard, getParentExport, getParentProfile, getProgressBoardRolloutConfig, getStudentProfile, importParentProgress, lockParent, loginAdmin, loginStudent, logout, previewParentImport, resetParentProgress, sendLearningEvents, unlockParent, updateParentProfilePreferences, updateStudentProfile, type ClientSession } from './auth/apiClient';
import { BottomDock } from './components/BottomDock';
import { SettingsDialog } from './components/SettingsDialog';
import { TopHud } from './components/TopHud';
import { WorldScene } from './components/WorldScene';
import { AudioManager } from './audio/manager';
import { type ViewId } from './app/navigation';
import { getLessonPackage } from './content/packages';
import { MVP_LESSONS, type MvpLessonId } from './content/catalog';
import { type PetMood } from './motion/pet';
import { grantReward } from './game/rewards';
import { type SessionEvent, transition } from './game/session';
import {
  createDefaultProgress,
  loadProgress,
  readRawProgress,
  saveProgress,
  saveSettings,
  type AppSettings,
} from './progress/storage';
import type { Progress } from './content/types';
import type { LearningEventInput } from '../shared/learning-contracts';
import type { DashboardRange, ParentDashboardData } from '../shared/dashboard-contracts';
import type { ChallengeRolloutConfig } from '../shared/challenge-contracts';
import type { ProgressBoardRolloutConfig } from '../shared/progress-board-contracts';
import { createAccountProgressSnapshot, loadAccountProgressSnapshot, saveAccountProgressSnapshot } from './progress/accountProgress';
import { createAccountBackup, previewUnownedLegacyProgress, type LocalMigrationPreview } from './progress/accountMigration';
import { acknowledgeLearningEvents, enqueueLearningEvent, listQueuedLearningEvents } from './progress/eventQueue';
import { clearProgressBoardCache } from './progress/progressBoardCache';
import { useProgressBoard } from './progress/useProgressBoard';
import { getInitialOfflineStatus, registerOfflineWorker, type OfflineStatus } from './pwa/offline';
import { CollectionView } from './views/CollectionView';
import { JourneyView } from './views/JourneyView';
import { LessonView } from './views/LessonView';
import { LessonsView } from './views/LessonsView';
import { ParentView } from './views/ParentView';
import { PetView } from './views/PetView';
import { RewardView } from './views/RewardView';
import { ProfileDialog } from './components/ProfileDialog';
import { DEFAULT_AVATAR_ID, type StudentProfilePatch, type StudentProfileView } from '../shared/account-contracts';
import { BirthdayCelebration } from './components/BirthdayCelebration';
import { getCalendarDateInTimeZone, hasCelebratedBirthday, isBirthdayToday, markBirthdayCelebrated } from './profile/birthday';
import { useClassroomFriends } from './classroom/useClassroomFriends';
import { FriendListDialog } from './components/FriendListDialog';
import { useParentChallengeReview } from './challenge/useParentChallengeReview';
import { ChallengeDialog } from './components/ChallengeDialog';
import { CHALLENGE_SOURCE_FACTS } from '../shared/challenge-source';
import { ProgressBoardDialog } from './components/progress/ProgressBoardDialog';

export const NAVIGATION_STATE_KEY = 'hoc-vui-navigation-v1';

export type NavigationSnapshot = {
  activeView: ViewId;
  selectedLessonId?: MvpLessonId;
};

const NAVIGATION_VIEW_IDS: ViewId[] = ['journey', 'lessons', 'lesson', 'reward', 'pet', 'collection', 'parent'];

export type SessionRequestToken = {
  accountId: string;
  epoch: number;
};

export function isCurrentSessionRequest(currentAccountId: string | null, currentEpoch: number, request: SessionRequestToken): boolean {
  return currentAccountId === request.accountId && currentEpoch === request.epoch;
}

function createFallbackStudentProfile(session: ClientSession): StudentProfileView {
  return {
    accountId: session.account.id,
    username: session.account.username,
    displayName: session.account.displayName,
    avatarId: DEFAULT_AVATAR_ID,
    birthDate: null,
    birthdayWishesEnabled: false,
  };
}

function getNavigationStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isViewId(value: unknown): value is ViewId {
  return typeof value === 'string' && NAVIGATION_VIEW_IDS.includes(value as ViewId);
}

function isMvpLessonId(value: unknown): value is MvpLessonId {
  return typeof value === 'string' && MVP_LESSONS.some((lesson) => lesson.id === value);
}

const DEVICE_ID_KEY = 'hoc-vui-device-id-v1';

function createUuid(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  const tail = `${Date.now().toString(16)}${Math.floor(Math.random() * 0xffffffff).toString(16)}`.padStart(24, '0').slice(-12);
  return `00000000-0000-4000-8000-${tail}`;
}

function getDeviceId(): string {
  if (typeof window === 'undefined') return createUuid();
  try {
    const existing = window.sessionStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const next = createUuid();
    window.sessionStorage.setItem(DEVICE_ID_KEY, next);
    return next;
  } catch {
    return createUuid();
  }
}

export function readNavigationState(storage: Storage | null = getNavigationStorage()): NavigationSnapshot | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(NAVIGATION_STATE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || !isViewId((value as { activeView?: unknown }).activeView)) return null;
    const activeView = (value as { activeView: ViewId }).activeView;
    const selectedLessonId = (value as { selectedLessonId?: unknown }).selectedLessonId;
    return isMvpLessonId(selectedLessonId) ? { activeView, selectedLessonId } : { activeView };
  } catch {
    return null;
  }
}

export function writeNavigationState(activeView: ViewId, selectedLessonId: MvpLessonId, storage: Storage | null = getNavigationStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(NAVIGATION_STATE_KEY, JSON.stringify({ activeView, selectedLessonId } satisfies NavigationSnapshot));
  } catch {
    // Navigation persistence is best-effort; the current in-memory view remains usable.
  }
}

export function getInitialNavigation(progress: Progress, storage: Storage | null = getNavigationStorage()): Required<NavigationSnapshot> {
  const saved = readNavigationState(storage);
  if (!saved) return { activeView: 'journey', selectedLessonId: 'lesson-01' };
  if (saved.activeView === 'lesson') {
    return {
      activeView: 'lesson',
      selectedLessonId: saved.selectedLessonId ?? progress.session?.lessonId ?? 'lesson-01',
    };
  }
  return { activeView: saved.activeView, selectedLessonId: 'lesson-01' };
}

export function App() {
  const [authSession, setAuthSession] = useState<ClientSession | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfileView | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [progressReady, setProgressReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [parentGateOpen, setParentGateOpen] = useState(false);
  const [parentGateError, setParentGateError] = useState('');
  const [parentPinChange, setParentPinChange] = useState(false);
  const [parentPinChangeDialogOpen, setParentPinChangeDialogOpen] = useState(false);
  const [progress, setProgress] = useState<Progress>(() => createDefaultProgress());
  const [activeView, setActiveView] = useState<ViewId>('journey');
  const [selectedLessonId, setSelectedLessonId] = useState<MvpLessonId>('lesson-01');
  const [settings, setSettings] = useState<AppSettings>(() => createDefaultProgress().settings);
  const [storageRecovery, setStorageRecovery] = useState(false);
  const [storageWriteWarning, setStorageWriteWarning] = useState(false);
  const [legacyMigrationPreview, setLegacyMigrationPreview] = useState<LocalMigrationPreview | null>(null);
  const [parentDashboard, setParentDashboard] = useState<ParentDashboardData | null>(null);
  const [parentProfile, setParentProfile] = useState<StudentProfileView | null>(null);
  const [parentProfileBusy, setParentProfileBusy] = useState(false);
  const [parentProfileError, setParentProfileError] = useState('');
  const [petMood, setPetMood] = useState<PetMood>('idle');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [friendsDialogOpen, setFriendsDialogOpen] = useState(false);
  const [challengeDialogOpen, setChallengeDialogOpen] = useState(false);
  const [challengeRollout, setChallengeRollout] = useState<ChallengeRolloutConfig | null>(null);
  const [progressBoardDialogOpen, setProgressBoardDialogOpen] = useState(false);
  const [progressBoardRollout, setProgressBoardRollout] = useState<ProgressBoardRolloutConfig | null>(null);
  const [progressBoardInvalidationToken, setProgressBoardInvalidationToken] = useState(0);
  const [birthdayCelebration, setBirthdayCelebration] = useState<StudentProfileView | null>(null);
  const [toast, setToast] = useState('');
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>(() => getInitialOfflineStatus(import.meta.env.PROD));
  const [documentHidden, setDocumentHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const [osReducedMotion, setOsReducedMotion] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const audio = useMemo(() => new AudioManager(settings.sound), []);
  const moodTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);
  const effectiveReducedMotion = settings.reducedMotion || osReducedMotion || documentHidden;
  const progressOwnerId = authSession?.account.role === 'student' ? authSession.account.id : null;
  const profileOwnerId = authSession?.account.role === 'student' && authSession.mode === 'full' ? authSession.account.id : null;
  const accountRole = authSession?.account.role;
  const accountMode = authSession?.mode;
  const classroomFriendsEnabled = Boolean(authSession?.account.role === 'student' && authSession.mode === 'full');
  const progressBoardFeatureEnabled = Boolean(authSession?.account.role === 'student' && authSession.mode === 'full' && progressBoardRollout?.enabled);
  const classroomFriends = useClassroomFriends(classroomFriendsEnabled, friendsDialogOpen, profileOwnerId ?? undefined);
  const parentChallengeReviewEnabled = Boolean(
    authSession?.account.role === 'student'
      && authSession.mode === 'full'
      && activeView === 'parent'
      && parentDashboard,
  );
  const parentChallengeReview = useParentChallengeReview(parentChallengeReviewEnabled);
  const authAccountIdRef = useRef<string | null>(null);
  authAccountIdRef.current = authSession?.account.id ?? null;
  const sessionEpochRef = useRef(0);
  const loadedOwnerId = useRef<string | null>(null);
  const deviceId = useRef<string>(getDeviceId()).current;
  const activeRun = useRef<{ runId: string; sequence: number; generation: number; lessonId: MvpLessonId; lessonVersion: number; deviceId: string } | null>(null);
  const serverSnapshot = useRef<ReturnType<typeof createAccountProgressSnapshot> | null>(null);
  const activeOwner = useRef<string | null>(null);
  const syncInFlight = useRef(false);
  const lastInteractionAt = useRef<number>(Date.now());
  const progressBoard = useProgressBoard({ enabled: progressBoardDialogOpen && progressBoardFeatureEnabled, accountId: progressOwnerId, generation: serverSnapshot.current?.generation ?? 0, invalidationToken: progressBoardInvalidationToken });

  const replaceAuthSession = (nextSession: ClientSession | null | ((currentSession: ClientSession | null) => ClientSession | null)) => {
    sessionEpochRef.current += 1;
    setBirthdayCelebration(null);
    setParentProfile(null);
    setParentProfileBusy(false);
    setParentProfileError('');
    setAuthSession(nextSession);
  };

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2600);
  };

  useEffect(() => {
    audio.setEnabled(settings.sound);
    document.documentElement.dataset.motion = effectiveReducedMotion ? 'reduced' : 'full';
  }, [audio, effectiveReducedMotion, settings.sound]);

  useEffect(() => {
    const modalOpen = settingsOpen || profileDialogOpen || friendsDialogOpen || challengeDialogOpen || progressBoardDialogOpen || Boolean(birthdayCelebration) || parentGateOpen || parentPinChangeDialogOpen;
    const previousOverflow = document.body.style.overflow;
    if (modalOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [birthdayCelebration, challengeDialogOpen, friendsDialogOpen, parentGateOpen, parentPinChangeDialogOpen, profileDialogOpen, progressBoardDialogOpen, settingsOpen]);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeView]);

  useEffect(() => {
    writeNavigationState(activeView, selectedLessonId);
  }, [activeView, selectedLessonId]);

  useEffect(() => {
    const syncVisibility = () => {
      const hidden = document.hidden;
      setDocumentHidden(hidden);
      audio.setDocumentHidden(hidden);
    };
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, [audio]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setOsReducedMotion(mediaQuery.matches);
    syncPreference();
    const useEventListener = typeof mediaQuery.addEventListener === 'function';
    if (useEventListener) mediaQuery.addEventListener('change', syncPreference);
    else mediaQuery.addListener?.(syncPreference);
    return () => {
      if (useEventListener) mediaQuery.removeEventListener('change', syncPreference);
      else mediaQuery.removeListener?.(syncPreference);
    };
  }, []);

  useEffect(() => registerOfflineWorker(import.meta.env.PROD, setOfflineStatus), []);

  useEffect(() => () => {
    audio.dispose();
    if (moodTimer.current) window.clearTimeout(moodTimer.current);
  }, [audio]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getCurrentAuthSession().then((result) => {
      if (cancelled) return;
      if (result.ok && result.session) {
        replaceAuthSession(result.session);
        setParentPinChange(result.session.mode === 'change-only' && result.session.changeKind === 'parent');
      }
      else if (!result.ok) setAuthError(result.message);
      setAuthReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const accountId = authSession?.account.role === 'student' && authSession.mode === 'full' ? authSession.account.id : null;
    if (!accountId) {
      setChallengeRollout(null);
      setChallengeDialogOpen(false);
      return undefined;
    }

    let cancelled = false;
    let requestGeneration = 0;
    setChallengeRollout(null);

    const refreshRollout = async () => {
      const generation = ++requestGeneration;
      const result = await getChallengeRolloutConfig();
      if (cancelled || generation !== requestGeneration || authAccountIdRef.current !== accountId) return;
      if (!result.ok) return;
      setChallengeRollout(result.config);
      if (!result.config.enabled) setChallengeDialogOpen(false);
    };

    void refreshRollout();
    const refreshWhenVisible = () => {
      if (!document.hidden) void refreshRollout();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const timer = window.setInterval(() => {
      if (!document.hidden) void refreshRollout();
    }, 60_000);
    return () => {
      cancelled = true;
      requestGeneration += 1;
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(timer);
    };
  }, [authSession?.account.id, authSession?.account.role, authSession?.mode]);

  useEffect(() => {
    const accountId = authSession?.account.role === 'student' && authSession.mode === 'full' ? authSession.account.id : null;
    if (!accountId) {
      setProgressBoardRollout(null);
      setProgressBoardDialogOpen(false);
      return undefined;
    }

    let cancelled = false;
    setProgressBoardRollout(null);
    void getProgressBoardRolloutConfig().then((result) => {
      if (cancelled || authAccountIdRef.current !== accountId) return;
      if (!result.ok || typeof result.config?.enabled !== 'boolean') {
        setProgressBoardRollout({ enabled: false });
        setProgressBoardDialogOpen(false);
        return;
      }
      setProgressBoardRollout(result.config);
      if (!result.config.enabled) setProgressBoardDialogOpen(false);
    });
    return () => { cancelled = true; };
  }, [authSession?.account.id, authSession?.account.role, authSession?.mode]);

  useEffect(() => {
    if (!profileOwnerId) {
      setStudentProfile(null);
      setBirthdayCelebration(null);
      setProfileDialogOpen(false);
      return undefined;
    }
    const ownerId = profileOwnerId;
    const request = { accountId: ownerId, epoch: sessionEpochRef.current } satisfies SessionRequestToken;
    let cancelled = false;
    setStudentProfile((current) => current?.accountId === ownerId ? current : null);
    void getStudentProfile().then((result) => {
      if (cancelled || !isCurrentSessionRequest(authAccountIdRef.current, sessionEpochRef.current, request)) return;
      if (!result.ok || result.profile.accountId !== ownerId) return;
      setStudentProfile(result.profile);
      setAuthSession((current) => current && current.account.id === ownerId
        ? { ...current, account: { ...current.account, displayName: result.profile.displayName } }
        : current);
    });
    return () => { cancelled = true; };
  }, [profileOwnerId]);

  useEffect(() => {
    const accountId = authSession?.account.role === 'student' && authSession.mode === 'full' ? authSession.account.id : null;
    if (!accountId || !progressReady || !studentProfile || studentProfile.accountId !== accountId) {
      setBirthdayCelebration(null);
      return;
    }

    const now = new Date();
    const year = getCalendarDateInTimeZone(now).year;
    if (!studentProfile.birthDate || !isBirthdayToday(studentProfile.birthDate, now) || hasCelebratedBirthday(accountId, year)) {
      setBirthdayCelebration(null);
      return;
    }

    markBirthdayCelebrated(accountId, year);
    setBirthdayCelebration(studentProfile);
  }, [authSession?.account.id, authSession?.account.role, authSession?.mode, progressReady, studentProfile]);

  useEffect(() => {
    if (accountRole !== 'student') {
      loadedOwnerId.current = null;
      activeOwner.current = null;
      activeRun.current = null;
      serverSnapshot.current = null;
      setProgressReady(accountRole == null);
      return;
    }
    if (loadedOwnerId.current === progressOwnerId) return;
    const ownerId = progressOwnerId;
    if (!ownerId) { setProgressReady(true); return; }
    loadedOwnerId.current = ownerId;
    activeOwner.current = ownerId;
    let cancelled = false;
    setProgressReady(false);
    void getAccountProgress().then((remote) => {
      if (cancelled || activeOwner.current !== ownerId) return;
      if (remote.ok) {
        serverSnapshot.current = remote.snapshot;
        saveAccountProgressSnapshot(remote.snapshot);
        setProgress(remote.snapshot.progress);
        setSettings(remote.snapshot.progress.settings);
        activeRun.current = remote.currentRun && remote.currentRun.status === 'active'
          ? { runId: remote.currentRun.runId, sequence: remote.currentRun.lastSequence, generation: remote.currentRun.generation, lessonId: remote.currentRun.lessonId as MvpLessonId, lessonVersion: remote.currentRun.lessonVersion, deviceId: remote.currentRun.deviceId }
          : null;
        setStorageRecovery(false);
        setStorageWriteWarning(false);
        const legacyPreview = previewUnownedLegacyProgress(ownerId);
        setLegacyMigrationPreview(legacyPreview && 'ok' in legacyPreview ? null : legacyPreview);
      } else {
        const cached = loadAccountProgressSnapshot(ownerId);
        const local = loadProgress(ownerId);
        const fallback = cached?.progress ?? local.progress;
        // Keep the last server-known generation alongside the offline progress
        // so the progress-board cache cannot be looked up under generation 0
        // after a temporary account-progress outage.
        serverSnapshot.current = cached;
        setProgress(fallback);
        setSettings(fallback.settings);
        setStorageRecovery(Boolean(local.error && !cached));
        setStorageWriteWarning(false);
        setLegacyMigrationPreview(null);
        showToast('Đang dùng bản tiến độ đã lưu trên máy; các thay đổi sẽ chờ đồng bộ.');
      }
      setSelectedLessonId((remote.ok ? remote.snapshot.progress.session?.lessonId : undefined) ?? 'lesson-01');
      setActiveView('journey');
      setProgressReady(true);
      void syncQueuedProgress(ownerId);
    });
    return () => { cancelled = true; };
  }, [accountMode, accountRole, progressOwnerId]);

  const persistProgress = (candidate: Progress, successMessage = 'Đã lưu tiến độ trên thiết bị này.', allowRecovery = false) => {
    const snapshot = { ...candidate, updatedAt: new Date().toISOString() };
    if (storageRecovery && !allowRecovery) {
      setProgress(snapshot);
      setSettings(snapshot.settings);
      setStorageWriteWarning(true);
      showToast('Đang giữ dữ liệu cũ để phục hồi; thay đổi mới chưa được ghi vào bộ nhớ.');
      return false;
    }
    if (!saveProgress(snapshot, progressOwnerId)) {
      setProgress(snapshot);
      setSettings(snapshot.settings);
      setStorageWriteWarning(true);
      showToast('Chưa thể lưu tiến độ; thay đổi hiện chỉ ở phiên này.');
      return false;
    }
    if (progressOwnerId) {
      const cachedSnapshot = createAccountProgressSnapshot(progressOwnerId, snapshot, serverSnapshot.current?.revision ?? 0, serverSnapshot.current?.generation ?? 0, snapshot.updatedAt);
      saveAccountProgressSnapshot(cachedSnapshot);
    }
    setStorageWriteWarning(false);
    setProgress(snapshot);
    setSettings(snapshot.settings);
    showToast(successMessage);
    return true;
  };

  const setMood = (mood: PetMood, feedback: 'tap' | 'success' | 'hint' = 'tap') => {
    setPetMood(mood);
    audio.play(feedback);
    if (moodTimer.current) window.clearTimeout(moodTimer.current);
    moodTimer.current = window.setTimeout(() => setPetMood('idle'), effectiveReducedMotion ? 650 : 1800);
  };

  const navigate = (view: ViewId) => {
    setActiveView(view);
    audio.play('tap');
  };

  const openLesson = (lessonId: MvpLessonId) => {
    if (!isLessonUnlocked(lessonId, progress.completedMissions)) { setActiveView('lessons'); return; }
    setSelectedLessonId(lessonId);
    setActiveView('lesson');
    audio.play('tap');
  };

  const updateSettings = (key: keyof AppSettings, value: boolean) => {
    const nextSettings = { ...settings, [key]: value };
    const nextProgress = { ...progress, settings: nextSettings };
    audio.setEnabled(nextSettings.sound);
    audio.play(key === 'sound' && value ? 'success' : 'tap');
    const saved = persistProgress(nextProgress, 'Đã lưu cài đặt trên thiết bị này.');
    if (saved && !storageRecovery) saveSettings(nextSettings);
  };

  const syncQueuedProgress = async (ownerId = progressOwnerId): Promise<void> => {
    if (!ownerId || syncInFlight.current) return;
    syncInFlight.current = true;
    let continueSync = false;
    try {
      const queued = await listQueuedLearningEvents(ownerId);
      if (!queued.length || activeOwner.current !== ownerId) return;
      const result = await sendLearningEvents(queued);
      if (activeOwner.current !== ownerId) return;
      if (!result.ok) {
        if (result.code === 'stale' || result.code === 'conflict') showToast('Tiến độ trên máy chủ đã thay đổi; mình giữ hàng đợi để đồng bộ lại an toàn.');
        return;
      }
      const acknowledged = await acknowledgeLearningEvents(ownerId, result.acknowledgements.map((ack) => ack.eventId));
      if (!acknowledged || activeOwner.current !== ownerId) return;
      if (result.acknowledgements.length > 0) setProgressBoardInvalidationToken((current) => current + 1);
      serverSnapshot.current = result.snapshot;
      const remaining = await listQueuedLearningEvents(ownerId);
      if (!remaining.length) {
        setProgress(result.snapshot.progress);
        setSettings(result.snapshot.progress.settings);
        saveProgress(result.snapshot.progress, ownerId);
        saveAccountProgressSnapshot(result.snapshot);
        setStorageWriteWarning(false);
        showToast('Đã đồng bộ tiến độ của con.');
      } else {
        continueSync = true;
      }
    } finally {
      syncInFlight.current = false;
      if (continueSync && activeOwner.current === ownerId) void syncQueuedProgress(ownerId);
    }
  };

  useEffect(() => {
    if (!progressOwnerId || !authSession || authSession.account.role !== 'student' || authSession.mode !== 'full' || activeView !== 'lesson') return undefined;
    const markInteraction = () => { lastInteractionAt.current = Date.now(); };
    window.addEventListener('pointerdown', markInteraction, { passive: true });
    window.addEventListener('keydown', markInteraction, { passive: true });
    const heartbeatTimer = window.setInterval(() => {
      const run = activeRun.current;
      if (!run || document.hidden || Date.now() - lastInteractionAt.current > 60_000) return;
      const event: LearningEventInput = { eventId: createUuid(), runId: run.runId, sequence: run.sequence + 1, type: 'heartbeat', lessonId: run.lessonId, lessonVersion: run.lessonVersion, deviceId: run.deviceId, generation: run.generation, visible: true, interactive: true, clientTime: new Date().toISOString() };
      activeRun.current = { ...run, sequence: event.sequence };
      void enqueueLearningEvent(progressOwnerId, event).then((queued) => { if (queued) void syncQueuedProgress(progressOwnerId); });
    }, 15_000);
    const retryWhenOnline = () => { void syncQueuedProgress(progressOwnerId); };
    window.addEventListener('online', retryWhenOnline);
    return () => {
      window.removeEventListener('pointerdown', markInteraction);
      window.removeEventListener('keydown', markInteraction);
      window.clearInterval(heartbeatTimer);
      window.removeEventListener('online', retryWhenOnline);
    };
  }, [activeView, authSession, progressOwnerId]);

  const handleStudentLogin = async (username: string, pin: string) => {
    setAuthBusy(true);
    setAuthError('');
    const result = await loginStudent(username, pin);
    setAuthBusy(false);
    if (!result.ok) { setAuthError(result.message); return; }
    loadedOwnerId.current = null;
    setStudentProfile(null);
    setBirthdayCelebration(null);
    setProfileDialogOpen(false);
    setParentPinChange(false);
    replaceAuthSession(result.session);
  };

  const handleAdminLogin = async (username: string, password: string) => {
    setAuthBusy(true);
    setAuthError('');
    const result = await loginAdmin(username, password);
    setAuthBusy(false);
    if (!result.ok) { setAuthError(result.message); return; }
    setStudentProfile(null);
    setBirthdayCelebration(null);
    setProfileDialogOpen(false);
    replaceAuthSession(result.session);
  };

  const handleStudentPinChange = async (nextPin: string) => {
    if (!authSession) return;
    setAuthBusy(true);
    setAuthError('');
    const result = await changeStudentPin(DEFAULT_STUDENT_PIN, nextPin);
    setAuthBusy(false);
    if (!result.ok) { setAuthError(result.message); return; }
    replaceAuthSession({ ...result.session, mustChange: false });
  };

  const handleProfileSave = async (patch: StudentProfilePatch): Promise<void> => {
    if (!authSession || authSession.account.role !== 'student') return;
    const ownerId = authSession.account.id;
    const request = { accountId: ownerId, epoch: sessionEpochRef.current } satisfies SessionRequestToken;
    const result = await updateStudentProfile(patch);
    if (!isCurrentSessionRequest(authAccountIdRef.current, sessionEpochRef.current, request)) return;
    if (!result.ok) throw new Error(result.message);
    setStudentProfile(result.profile);
    setAuthSession((current) => current && current.account.id === ownerId
      ? { ...current, account: { ...current.account, displayName: result.profile.displayName } }
      : current);
  };

  const handleProfilePinChange = async (currentPin: string, nextPin: string): Promise<void> => {
    if (!authSession || authSession.account.role !== 'student') return;
    const ownerId = authSession.account.id;
    const request = { accountId: ownerId, epoch: sessionEpochRef.current } satisfies SessionRequestToken;
    const result = await changeStudentPin(currentPin, nextPin);
    if (!isCurrentSessionRequest(authAccountIdRef.current, sessionEpochRef.current, request)) return;
    if (!result.ok) throw new Error(result.message);
    replaceAuthSession({ ...result.session, mustChange: false });
    setParentDashboard(null);
    setParentGateOpen(false);
    setParentGateError('');
    setParentPinChange(false);
    setParentPinChangeDialogOpen(false);
    setActiveView('journey');
  };

  const handleParentOpen = () => {
    if (!authSession || authSession.account.role !== 'student') return;
    setParentGateError('');
    setParentGateOpen(true);
  };

  const loadParentProfile = async (ownerId: string, epoch: number): Promise<void> => {
    setParentProfile(null);
    setParentProfileBusy(true);
    setParentProfileError('');
    const result = await getParentProfile();
    if (!isCurrentSessionRequest(authAccountIdRef.current, sessionEpochRef.current, { accountId: ownerId, epoch })) return;
    setParentProfileBusy(false);
    if (!result.ok) {
      setParentProfileError(result.message);
      return;
    }
    if (result.profile.accountId !== ownerId) {
      setParentProfileError('Hồ sơ phụ huynh không khớp với phiên được cấp quyền. Tùy chọn đang tạm khóa.');
      return;
    }
    setParentProfile(result.profile);
  };

  const handleParentBirthdayWishesEnabledChange = async (enabled: boolean): Promise<void> => {
    if (!authSession || authSession.account.role !== 'student' || !parentProfile) return;
    const ownerId = authSession.account.id;
    const request = { accountId: ownerId, epoch: sessionEpochRef.current } satisfies SessionRequestToken;
    setParentProfileBusy(true);
    setParentProfileError('');
    const result = await updateParentProfilePreferences(enabled);
    if (!isCurrentSessionRequest(authAccountIdRef.current, sessionEpochRef.current, request)) return;
    setParentProfileBusy(false);
    if (!result.ok) {
      setParentProfileError(result.message);
      showToast(result.message);
      throw new Error(result.message);
    }
    if (result.profile.accountId !== ownerId) {
      const message = 'Hồ sơ phụ huynh không khớp với phiên được cấp quyền. Tùy chọn đang tạm khóa.';
      setParentProfileError(message);
      showToast(message);
      throw new Error(message);
    }
    setParentProfile(result.profile);
  };

  const handleParentUnlock = async (pin: string) => {
    if (!authSession) return;
    const unlockRequest = { accountId: authSession.account.id, epoch: sessionEpochRef.current } satisfies SessionRequestToken;
    setAuthBusy(true);
    setParentGateError('');
    const result = await unlockParent(pin);
    setAuthBusy(false);
    if (!isCurrentSessionRequest(authAccountIdRef.current, sessionEpochRef.current, unlockRequest)) return;
    if (!result.ok) {
      setParentProfile(null);
      setParentProfileBusy(false);
      setParentProfileError('');
      setParentGateError(result.message);
      return;
    }
    replaceAuthSession({ ...result.session, mustChange: Boolean(result.mustChange) });
    const parentRequest = { accountId: result.session.account.id, epoch: sessionEpochRef.current } satisfies SessionRequestToken;
    setParentGateOpen(false);
    if (result.mustChange) {
      setParentDashboard(null);
      setParentPinChange(true);
    }
    else {
      const dashboard = await getParentDashboard('all');
      if (!isCurrentSessionRequest(authAccountIdRef.current, sessionEpochRef.current, parentRequest)) return;
      if (!dashboard.ok) {
        await lockParent();
        setParentDashboard(null);
        replaceAuthSession((current) => current ? { ...current, parentGrantUntil: undefined } : null);
        setParentGateError(dashboard.message);
        setParentGateOpen(true);
        return;
      }
      setParentDashboard(dashboard.dashboard);
      setActiveView('parent');
      await loadParentProfile(parentRequest.accountId, parentRequest.epoch);
    }
  };

  const handleParentRangeChange = async (range: DashboardRange): Promise<boolean> => {
    if (!authSession || authSession.account.role !== 'student' || authSession.mode !== 'full') return false;
    const request = { accountId: authSession.account.id, epoch: sessionEpochRef.current } satisfies SessionRequestToken;
    const dashboard = await getParentDashboard(range);
    if (!isCurrentSessionRequest(authAccountIdRef.current, sessionEpochRef.current, request)) return false;
    if (!dashboard.ok) {
      sessionEpochRef.current += 1;
      setParentProfile(null);
      setParentProfileBusy(false);
      setParentProfileError('');
      if (dashboard.code === 'forbidden' || dashboard.code === 'expired') handleParentLock();
      showToast(dashboard.message);
      return false;
    }
    setParentDashboard(dashboard.dashboard);
    return true;
  };

  const handleFirstParentPinChange = async (nextPin: string) => {
    if (!authSession) return;
    setAuthBusy(true);
    setAuthError('');
    const result = await changeParentPin(DEFAULT_STUDENT_PIN, nextPin);
    setAuthBusy(false);
    if (!result.ok) { setAuthError(result.message); return; }
    setParentPinChange(false);
    replaceAuthSession({ ...result.session, mustChange: false });
    setParentGateError('Mã PIN đã đổi. Nhập lại mã mới để mở Dashboard.');
    setParentGateOpen(true);
  };

  const handleParentPinChange = async (currentPin: string, nextPin: string) => {
    if (!authSession) return;
    setAuthBusy(true);
    setAuthError('');
    const result = await changeParentPin(currentPin, nextPin);
    setAuthBusy(false);
    if (!result.ok) { setAuthError(result.message); return; }
    setParentPinChangeDialogOpen(false);
    setParentDashboard(null);
    replaceAuthSession({ ...result.session, mustChange: false });
    setParentGateError('');
    setActiveView('journey');
    showToast('Đã đổi PIN phụ huynh; hãy nhập lại PIN khi mở Dashboard.');
  };

  const handleParentLock = () => {
    void lockParent();
    setProgressBoardDialogOpen(false);
    setChallengeDialogOpen(false);
    setParentDashboard(null);
    setParentProfile(null);
    setParentProfileBusy(false);
    setParentProfileError('');
    replaceAuthSession((current) => current ? { ...current, parentGrantUntil: undefined } : null);
    setActiveView('journey');
  };

  const handleLogout = () => {
    const ownerToClear = progressOwnerId ?? activeOwner.current;
    void logout().catch(() => undefined);
    if (ownerToClear) clearProgressBoardCache(ownerToClear);
    loadedOwnerId.current = null;
    activeOwner.current = null;
    activeRun.current = null;
    serverSnapshot.current = null;
    setProgressReady(false);
    replaceAuthSession(null);
    setStudentProfile(null);
    setProfileDialogOpen(false);
    setFriendsDialogOpen(false);
    setChallengeDialogOpen(false);
    setProgressBoardDialogOpen(false);
    setParentDashboard(null);
    setParentProfile(null);
    setParentProfileBusy(false);
    setParentProfileError('');
    setParentPinChange(false);
    setParentPinChangeDialogOpen(false);
    setParentGateOpen(false);
    setParentGateError('');
    setSettingsOpen(false);
    setAuthBusy(false);
    setAuthError('');
    setProgress(createDefaultProgress());
    setSettings(createDefaultProgress().settings);
    setStorageRecovery(false);
    setStorageWriteWarning(false);
    setLegacyMigrationPreview(null);
    setSelectedLessonId('lesson-01');
    setActiveView('journey');
    setToast('');
  };

  const handleSessionEvent = (event: SessionEvent) => {
    if (!progressOwnerId || !authSession || authSession.mode !== 'full' || !isLessonUnlocked(selectedLessonId, progress.completedMissions)) return;
    lastInteractionAt.current = Date.now();
    const lesson = getLessonPackage(selectedLessonId);
    const currentSession = progress.session?.lessonId === lesson.id ? progress.session : null;
    const run = event.type === 'START'
      ? { runId: createUuid(), sequence: 0, generation: serverSnapshot.current?.generation ?? 0, lessonId: lesson.id, lessonVersion: lesson.version, deviceId }
      : activeRun.current;
    if (!run || run.lessonId !== lesson.id) {
      showToast('Chưa xác định được phiên học trên máy chủ; hãy mở lại bài học.');
      return;
    }
    const learningEvent: LearningEventInput = {
      eventId: createUuid(),
      runId: run.runId,
      sequence: run.sequence + 1,
      type: event.type === 'START' ? 'run_started' : event.type === 'DISCOVERY_DONE' ? 'discovery_done' : event.type === 'ANSWER' ? 'answer_submitted' : event.type === 'HINT' ? 'hint_used' : event.type === 'NEXT' ? 'next' : 'heartbeat',
      lessonId: lesson.id,
      lessonVersion: lesson.version,
      deviceId: run.deviceId,
      generation: run.generation,
      ...(event.type === 'ANSWER' ? { activityId: currentSession?.lessonId === lesson.id ? lesson.missions[currentSession.missionIndex]?.activities[currentSession.activityIndex]?.id : undefined, response: event.response } : {}),
      clientTime: new Date().toISOString(),
    };
    activeRun.current = { ...run, sequence: learningEvent.sequence };
    const localEvent = event.type === 'START' ? { ...event, sessionId: run.runId } : event;
    const nextSession = transition(currentSession, localEvent, lesson);
    let nextProgress: Progress = { ...progress, session: nextSession };

    if (event.type === 'NEXT' && currentSession?.stage === 'feedback' && nextSession.stage === 'missionComplete') {
      const mission = lesson.missions[currentSession.missionIndex];
      if (mission) nextProgress = grantReward(nextProgress, mission.id);
    }

    if (nextSession === currentSession && nextProgress.completedMissions === progress.completedMissions) return;
    const message = event.type === 'ANSWER' ? 'Đã lưu câu trả lời.' : 'Đã lưu tiến độ trên thiết bị này.';
    persistProgress(nextProgress, message);
    void enqueueLearningEvent(progressOwnerId, learningEvent).then((queued) => {
      if (!queued) { showToast('Chưa thể xếp event chờ đồng bộ; dữ liệu hiện chỉ giữ trong phiên này.'); return; }
      void syncQueuedProgress(progressOwnerId);
    });
  };

  const downloadBackup = (backup: string, filename: string, message: string): boolean => {
    try {
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast(message);
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Chưa thể xuất bản sao lưu.');
      return false;
    }
  };

  const handleExport = async (): Promise<boolean> => {
    if (!progressOwnerId) return false;
    const remote = await getParentExport();
    if (remote.ok) return downloadBackup(remote.backup, `hoc-vui-${authSession?.account.username ?? 'con'}-sao-luu.json`, 'Đã xuất bản sao lưu đã xác nhận trên máy chủ.');
    const fallback = serverSnapshot.current ?? createAccountProgressSnapshot(progressOwnerId, progress, 0, 0, progress.updatedAt);
    try {
      return downloadBackup(createAccountBackup(fallback), `hoc-vui-${authSession?.account.username ?? 'con'}-sao-luu-local.json`, 'Máy chủ chưa kết nối; đã xuất bản sao lưu cục bộ hiện có.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : remote.message);
      return false;
    }
  };

  const handleImport = async (file: Pick<File, 'size' | 'text'>) => {
    try {
      if (!progressOwnerId) return;
      const raw = await file.text();
      const previewResult = await previewParentImport(raw);
      if (!previewResult.ok) { showToast(previewResult.message); return; }
      const preview = previewResult.preview;
      if (preview.alreadyImported) { showToast('Tệp này đã được nhập trước đó; dữ liệu không bị ghi thêm.'); return; }
      const before = await getParentExport();
      if (!before.ok) { showToast(`Chưa thể tạo bản sao lưu trước khi nhập: ${before.message}`); return; }
      if (!downloadBackup(before.backup, `hoc-vui-${authSession?.account.username ?? 'con'}-truoc-khi-nhap.json`, 'Đã xuất bản sao lưu trước khi nhập; hãy kiểm tra tệp trước khi tiếp tục.')) return;
      const confirmed = window.confirm(`Nhập dữ liệu vào tài khoản ${authSession?.account.displayName ?? 'của con'}?\n\nTệp có ${preview.completedMissions} nhiệm vụ, ${preview.stamps} dấu${preview.legacyImported ? ' và sẽ được đánh dấu là dữ liệu chuyển từ bản cũ' : ''}. Bản sao lưu trước khi nhập đã được xuất.`);
      if (!confirmed) return;
      const result = await importParentProgress(raw, preview.fingerprint, preview.currentRevision);
      if (!result.ok) { showToast(result.message); return; }
      clearProgressBoardCache(progressOwnerId);
      setProgressBoardDialogOpen(false);
      setProgressBoardInvalidationToken((current) => current + 1);
      serverSnapshot.current = result.snapshot;
      activeRun.current = null;
      saveAccountProgressSnapshot(result.snapshot);
      setParentDashboard(null);
      setProgress(result.snapshot.progress);
      setSettings(result.snapshot.progress.settings);
      setSelectedLessonId(result.snapshot.progress.session?.lessonId ?? 'lesson-01');
      setStorageRecovery(false);
      setStorageWriteWarning(!saveProgress(result.snapshot.progress, progressOwnerId));
      setLegacyMigrationPreview(null);
      setActiveView('journey');
      showToast(result.duplicate ? 'Tệp đã được nhập trước đó; tiến độ hiện tại không thay đổi.' : 'Đã nhập và lưu bản sao lưu sau khi máy chủ xác nhận.');
    } catch {
      showToast('Không thể nhập tệp sao lưu; dữ liệu cũ vẫn được giữ nguyên.');
    }
  };

  const handleLegacyImport = async () => {
    const raw = readRawProgress();
    if (!raw) { setLegacyMigrationPreview(null); showToast('Không còn dữ liệu cũ để xem trước.'); return; }
    await handleImport({ size: new TextEncoder().encode(raw).byteLength, text: async () => raw });
  };

  const handleReset = async () => {
    if (!progressOwnerId) return;
    if (!window.confirm(`Đặt lại toàn bộ tiến độ của ${authSession?.account.displayName ?? 'con'}? Bản sao lưu sẽ được xuất trước; các event cũ sẽ không thể khôi phục dấu sau lần đặt lại.`)) return;
    const before = await getParentExport();
    if (!before.ok) { showToast(`Chưa thể tạo bản sao lưu trước khi đặt lại: ${before.message}`); return; }
    if (!downloadBackup(before.backup, `hoc-vui-${authSession?.account.username ?? 'con'}-truoc-khi-reset.json`, 'Đã xuất bản sao lưu trước khi đặt lại.')) return;
    const result = await resetParentProgress();
    if (!result.ok) { showToast(result.message); return; }
    clearProgressBoardCache(progressOwnerId);
    setProgressBoardDialogOpen(false);
    setProgressBoardInvalidationToken((current) => current + 1);
    serverSnapshot.current = result.snapshot;
    activeRun.current = null;
    saveAccountProgressSnapshot(result.snapshot);
    setParentDashboard(null);
    setProgress(result.snapshot.progress);
    setSettings(result.snapshot.progress.settings);
    setSelectedLessonId('lesson-01');
    setStorageRecovery(false);
    setStorageWriteWarning(!saveProgress(result.snapshot.progress, progressOwnerId));
    setActiveView('journey');
    showToast('Đã đặt lại tiến độ trên máy chủ; event cũ đã trở thành stale.');
  };

  const openSettings = () => {
    setSettingsOpen(true);
    audio.play('tap');
  };

  const openProgressLesson = (lessonId: string) => {
    setProgressBoardDialogOpen(false);
    if (isMvpLessonId(lessonId)) openLesson(lessonId);
  };

  const visibleStudentProfile = authSession?.account.role === 'student'
    ? studentProfile ?? createFallbackStudentProfile(authSession)
    : null;

  const renderView = () => {
    switch (activeView) {
      case 'journey':
        return <JourneyView petMood={petMood} reducedMotion={effectiveReducedMotion} onPetTap={() => setMood('greet')} onOpenLessons={() => navigate('lessons')} onOpenFriends={() => setFriendsDialogOpen(true)} onOpenChallenge={challengeRollout?.enabled ? () => setChallengeDialogOpen(true) : undefined} onOpenProgress={() => setProgressBoardDialogOpen(true)} progressBoardEnabled={progressBoardFeatureEnabled} friendsUnreadCount={classroomFriends.unreadCount} />;
      case 'lessons':
        return <LessonsView progress={progress} onOpenLesson={openLesson} onBack={() => navigate('journey')} />;
      case 'lesson':
        if (!isLessonUnlocked(selectedLessonId, progress.completedMissions)) return <LessonsView progress={progress} onOpenLesson={openLesson} onBack={() => navigate('journey')} />;
        return <LessonView lessonId={selectedLessonId} session={progress.session?.lessonId === selectedLessonId ? progress.session : null} completedMissions={progress.completedMissions} reducedMotion={effectiveReducedMotion} onSessionEvent={handleSessionEvent} onBack={() => navigate('lessons')} onPetThink={() => setMood('think', 'hint')} onPetCelebrate={() => setMood('celebrate', 'success')} />;
      case 'reward':
        return <RewardView progress={progress} reducedMotion={effectiveReducedMotion} onPetTap={() => setMood('greet')} onOpenLessons={() => navigate('lessons')} />;
      case 'pet':
        return <PetView petMood={petMood} reducedMotion={effectiveReducedMotion} stamps={progress.stamps} onPetTap={() => setMood('greet')} onOpenSettings={openSettings} />;
      case 'collection':
        return <CollectionView progress={progress} />;
      case 'parent':
        return <ParentView progress={progress} settings={settings} dashboard={parentDashboard} parentProfile={parentProfile} parentProfileBusy={parentProfileBusy} parentProfileError={parentProfileError} onBirthdayWishesEnabledChange={handleParentBirthdayWishesEnabledChange} onRangeChange={handleParentRangeChange} childName={authSession?.account.displayName} storageRecovery={storageRecovery} storageWriteWarning={storageWriteWarning} legacyMigrationPreview={legacyMigrationPreview} onOpenSettings={openSettings} onOpenLessons={() => navigate('lessons')} onChangeParentPin={() => { setAuthError(''); setParentPinChangeDialogOpen(true); }} onImportLegacy={handleLegacyImport} onLockParent={handleParentLock} challengeReview={parentChallengeReviewEnabled ? parentChallengeReview : undefined} />;
      case 'settings':
        return null;
      default:
        return null;
    }
  };

  if (!authReady) {
    return <div className="app-shell"><WorldScene /><main className="auth-screen"><section className="auth-card auth-card-compact"><p className="eyebrow">HÀNH TRÌNH 4A14</p><h1>Đang kiểm tra phiên…</h1><p className="auth-lead">Một lát nhé, mình đang bảo vệ dữ liệu của từng tài khoản.</p></section></main></div>;
  }
  if (!authSession) {
    return <div className="app-shell"><WorldScene /><LoginView onStudentLogin={handleStudentLogin} onAdminLogin={handleAdminLogin} error={authError} busy={authBusy} /></div>;
  }
  if (authSession.account.role === 'admin') return <div className="app-shell"><WorldScene /><AdminView onLogout={handleLogout} /></div>;
  if (authSession.mode === 'change-only' && authSession.changeKind === 'student') return <div className="app-shell"><WorldScene /><ChangePinView title="Đặt mã PIN riêng cho con" kind="student" onChange={handleStudentPinChange} onLogout={handleLogout} error={authError} busy={authBusy} /></div>;
  if (parentPinChange || (authSession.mode === 'change-only' && authSession.changeKind === 'parent')) return <div className="app-shell"><WorldScene /><ChangePinView title="Đặt mã PIN phụ huynh" kind="parent" onChange={handleFirstParentPinChange} onLogout={handleLogout} error={authError} busy={authBusy} /></div>;
  if (!progressReady) return <div className="app-shell"><WorldScene /><main className="auth-screen"><section className="auth-card auth-card-compact"><p className="eyebrow">ĐANG MỞ HÀNH TRÌNH</p><h1>Đang tải tiến độ của con…</h1><p className="auth-lead">Dữ liệu chưa được hiển thị cho tới khi xác định đúng tài khoản.</p></section></main></div>;

  return (
    <div className={`app-shell${effectiveReducedMotion ? ' is-reduced-motion' : ''}`}>
      <WorldScene />
      <div className="world-overlay">
        <TopHud progress={progress} settings={settings} onToggleSound={() => updateSettings('sound', !settings.sound)} onOpenSettings={openSettings} onOpenReward={() => navigate('reward')} onOpenParent={handleParentOpen} onOpenProfile={() => setProfileDialogOpen(true)} onLogout={handleLogout} displayName={authSession.account.displayName} avatarId={visibleStudentProfile?.avatarId ?? DEFAULT_AVATAR_ID} />
        <main className={`screen-content screen-${activeView}`} key={activeView}>
          {renderView()}
        </main>
        <BottomDock activeView={activeView} onNavigate={navigate} />
      </div>
      {settingsOpen && <SettingsDialog settings={settings} saveStatus={storageRecovery ? 'recovery' : storageWriteWarning ? 'warning' : 'saved'} onChange={updateSettings} onClose={() => setSettingsOpen(false)} onLogout={handleLogout} />}
      {profileDialogOpen && visibleStudentProfile && <ProfileDialog profile={visibleStudentProfile} onSave={handleProfileSave} onChangePin={handleProfilePinChange} onClose={() => setProfileDialogOpen(false)} onLogout={handleLogout} />}
      {friendsDialogOpen && <FriendListDialog friends={classroomFriends.friends} loading={classroomFriends.loading} error={classroomFriends.error ?? ''} messageRevision={classroomFriends.messageRevision} onRefresh={classroomFriends.refresh} onFriendsChanged={classroomFriends.markFriendRead} onClose={() => setFriendsDialogOpen(false)} />}
      {challengeDialogOpen && challengeRollout?.enabled && authSession.account.role === 'student' && authSession.mode === 'full' && <ChallengeDialog sourceFacts={CHALLENGE_SOURCE_FACTS} studentId={authSession.account.id} canCreate onClose={() => setChallengeDialogOpen(false)} />}
      {progressBoardDialogOpen && progressBoardFeatureEnabled && <ProgressBoardDialog status={progressBoard.status} data={progressBoard.data} error={progressBoard.error} reducedMotion={effectiveReducedMotion} onRefresh={progressBoard.refresh} onClose={() => setProgressBoardDialogOpen(false)} onOpenLesson={openProgressLesson} lockBodyScroll={false} />}
      {birthdayCelebration && <BirthdayCelebration displayName={birthdayCelebration.displayName} avatarId={birthdayCelebration.avatarId} reducedMotion={effectiveReducedMotion} soundEnabled={settings.sound} onPlaySound={() => audio.play('success')} onClose={() => setBirthdayCelebration(null)} />}
      {parentGateOpen && <ParentPinDialog childName={authSession.account.displayName} onSubmit={handleParentUnlock} onCancel={() => setParentGateOpen(false)} error={parentGateError} busy={authBusy} />}
      {parentPinChangeDialogOpen && <ParentPinChangeDialog childName={authSession.account.displayName} onSubmit={handleParentPinChange} onCancel={() => { setParentPinChangeDialogOpen(false); setAuthError(''); }} error={authError} busy={authBusy} />}
      <div className={`app-toast${toast ? ' is-visible' : ''}`} role="status" aria-live="polite">{toast || ' '}</div>
    </div>
  );
}

export function resetSettingsForDevelopment(): AppSettings {
  return createDefaultProgress().settings;
}
