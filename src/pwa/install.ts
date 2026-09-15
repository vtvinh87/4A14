export type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export type InstallNavigator = {
  userAgent?: string;
  standalone?: boolean;
  platform?: string;
  maxTouchPoints?: number;
};

export function isStandaloneDisplay(windowLike?: Pick<Window, 'matchMedia'>, navigatorLike?: InstallNavigator): boolean {
  const currentWindow = windowLike ?? (typeof window === 'undefined' ? undefined : window);
  const currentNavigator: InstallNavigator | undefined = navigatorLike ?? (typeof navigator === 'undefined' ? undefined : navigator as unknown as InstallNavigator);
  const mediaQueryMatches = currentWindow?.matchMedia?.('(display-mode: standalone)').matches ?? false;
  return mediaQueryMatches || currentNavigator?.standalone === true;
}

export function isIosDevice(navigatorLike?: InstallNavigator): boolean {
  const currentNavigator: InstallNavigator | undefined = navigatorLike ?? (typeof navigator === 'undefined' ? undefined : navigator as unknown as InstallNavigator);
  const userAgent = currentNavigator?.userAgent ?? '';
  const platform = currentNavigator?.platform ?? '';
  const isTouchIpadDesktopMode = platform === 'MacIntel' && (currentNavigator?.maxTouchPoints ?? 0) > 1;
  return /iPhone|iPad|iPod/i.test(userAgent) || isTouchIpadDesktopMode;
}
