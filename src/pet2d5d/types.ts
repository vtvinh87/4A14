import type { PetMood } from '../motion/pet';

export const PET_ANCHOR_NAMES = [
  'root',
  'torso',
  'head',
  'ear-left',
  'ear-right',
  'wave-arm',
  'compass-arm',
  'tail-base',
  'tail-mid',
  'tail-tip',
  'leg-left',
  'leg-right',
] as const;

export type PetAnchorName = typeof PET_ANCHOR_NAMES[number];

export type AnchorDefinition = {
  x: number;
  y: number;
  influenceX: number;
  influenceY: number;
  maxRotation: number;
  maxScale: number;
  depth: number;
};

export type FoxRigVertex = {
  u: number;
  v: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  weights: Record<PetAnchorName, number>;
};

export type FoxRigDefinition = {
  columns: number;
  rows: number;
  vertices: FoxRigVertex[];
  indices: number[];
  anchors: Record<PetAnchorName, AnchorDefinition>;
};

export type AnchorTransform = {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  z: number;
};

export type FoxPose = Record<PetAnchorName, AnchorTransform>;

export type PetMotionController = {
  setMood: (mood: PetMood) => void;
  setReducedMotion: (value: boolean) => void;
  setVisible: (value: boolean) => void;
  advance: (deltaSeconds: number) => FoxPose;
  getPose: () => FoxPose;
  isAnimating: () => boolean;
};
