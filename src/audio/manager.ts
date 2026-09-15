export type FeedbackKind = 'tap' | 'success' | 'hint';

const TONES: Record<FeedbackKind, { frequency: number; duration: number; gain: number }> = {
  tap: { frequency: 440, duration: 0.07, gain: 0.035 },
  success: { frequency: 660, duration: 0.15, gain: 0.045 },
  hint: { frequency: 320, duration: 0.11, gain: 0.03 },
};

export class AudioManager {
  private context: AudioContext | null = null;
  private enabled: boolean;
  private documentHidden = false;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setDocumentHidden(hidden: boolean): void {
    this.documentHidden = hidden;
    if (!this.context) return;
    if (hidden && this.context.state === 'running') void this.context.suspend();
    if (!hidden && this.enabled && this.context.state === 'suspended') void this.context.resume();
  }

  isDocumentHidden(): boolean {
    return this.documentHidden;
  }

  play(kind: FeedbackKind): void {
    if (this.documentHidden || !this.enabled || typeof window === 'undefined' || !('AudioContext' in window)) return;

    try {
      const context = this.context ?? new AudioContext();
      this.context = context;
      if (context.state === 'suspended' && !this.documentHidden) void context.resume();

      const tone = TONES[kind];
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime;
      oscillator.type = kind === 'success' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(tone.frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.gain, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + tone.duration + 0.02);
    } catch {
      // Sound is a progressive enhancement; a blocked AudioContext must not break play.
    }
  }

  dispose(): void {
    if (this.context) void this.context.close();
    this.context = null;
  }
}
