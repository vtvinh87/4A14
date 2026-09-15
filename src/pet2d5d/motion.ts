import type { PetMood } from '../motion/pet';
import {
  PET_ANCHOR_NAMES,
  type AnchorTransform,
  type FoxPose,
  type FoxRigDefinition,
  type PetAnchorName,
  type PetMotionController,
} from './types';

const GREET_DURATION = 0.84;
const CELEBRATE_DURATION = 0.95;
const THINK_PERIOD = 1.6;
const MAX_DELTA = 0.05;
const MAX_TRANSLATION = 0.08;
const MAX_ROOT_LIFT = 0.06;
const MAX_ROTATION = 0.18;
const MIN_SCALE = 0.97;
const MAX_SCALE = 1.03;
const MAX_DEPTH = 0.03;

type SpringState = {
  value: AnchorTransform;
  velocity: AnchorTransform;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function cloneTransform(transform: AnchorTransform): AnchorTransform {
  return { ...transform };
}

function clonePose(pose: FoxPose): FoxPose {
  return Object.fromEntries(PET_ANCHOR_NAMES.map((name) => [name, cloneTransform(pose[name])])) as FoxPose;
}

function createVelocity(): AnchorTransform {
  return { x: 0, y: 0, rotation: 0, scale: 0, z: 0 };
}

function emptyTarget(): FoxPose {
  return Object.fromEntries(PET_ANCHOR_NAMES.map((name) => [name, { x: 0, y: 0, rotation: 0, scale: 1, z: 0 }])) as FoxPose;
}

function createNeutralPose(): FoxPose {
  return emptyTarget();
}

function setTarget(target: FoxPose, name: PetAnchorName, partial: Partial<AnchorTransform>): void {
  Object.assign(target[name], partial);
}

function waveTarget(progress: number): number {
  if (progress < 0.3) return -0.14 * (progress / 0.3);
  if (progress < 0.68) return -0.14 + 0.26 * ((progress - 0.3) / 0.38);
  return 0.12 * (1 - (progress - 0.68) / 0.32);
}

function moodTarget(mood: PetMood, clockSeconds: number, oneShotElapsed: number): FoxPose {
  const target = emptyTarget();
  const phase = (clockSeconds % THINK_PERIOD) / THINK_PERIOD;
  const wave = Math.sin(phase * Math.PI * 2);

  if (mood === 'idle') {
    const breath = Math.sin(clockSeconds * Math.PI * 2 / 2.4);
    setTarget(target, 'torso', { y: -0.012 * breath });
    setTarget(target, 'root', { scale: 1 + 0.006 * breath });
    setTarget(target, 'tail-base', { rotation: 0.035 * wave });
    setTarget(target, 'tail-mid', { rotation: 0.055 * wave });
    setTarget(target, 'tail-tip', { rotation: 0.075 * wave });
  } else if (mood === 'greet') {
    const progress = clamp(oneShotElapsed / GREET_DURATION, 0, 1);
    const settle = Math.sin(progress * Math.PI);
    setTarget(target, 'wave-arm', { rotation: waveTarget(progress) });
    setTarget(target, 'head', { rotation: -0.045 * settle });
    setTarget(target, 'tail-tip', { rotation: 0.10 * settle });
    setTarget(target, 'tail-mid', { rotation: 0.04 * settle });
  } else if (mood === 'think') {
    setTarget(target, 'head', { rotation: 0.055 * wave });
    setTarget(target, 'ear-left', { rotation: -0.025 * wave });
    setTarget(target, 'ear-right', { rotation: 0.025 * wave });
    setTarget(target, 'tail-mid', { rotation: 0.035 * wave });
  } else if (mood === 'celebrate') {
    const progress = clamp(oneShotElapsed / CELEBRATE_DURATION, 0, 1);
    const lift = Math.sin(progress * Math.PI);
    setTarget(target, 'root', { y: -0.045 * lift, scale: 1 + 0.018 * lift });
    setTarget(target, 'wave-arm', { rotation: -0.08 * lift });
    setTarget(target, 'compass-arm', { rotation: 0.04 * lift });
    setTarget(target, 'tail-base', { rotation: 0.06 * lift });
    setTarget(target, 'tail-mid', { rotation: 0.08 * lift });
    setTarget(target, 'tail-tip', { rotation: 0.10 * lift });
  }

  return target;
}

function clampTransform(transform: AnchorTransform): void {
  transform.x = clamp(transform.x, -MAX_TRANSLATION, MAX_TRANSLATION);
  transform.y = clamp(transform.y, -MAX_ROOT_LIFT, MAX_ROOT_LIFT);
  transform.rotation = clamp(transform.rotation, -MAX_ROTATION, MAX_ROTATION);
  transform.scale = clamp(transform.scale, MIN_SCALE, MAX_SCALE);
  transform.z = clamp(transform.z, -MAX_DEPTH, MAX_DEPTH);
}

export function createPetMotionController(rig: FoxRigDefinition, initialMood: PetMood): PetMotionController {
  void rig;
  const rest = createNeutralPose();
  const springs = Object.fromEntries(PET_ANCHOR_NAMES.map((name) => [name, { value: cloneTransform(rest[name]), velocity: createVelocity() }])) as Record<PetAnchorName, SpringState>;
  let mood = initialMood;
  let reducedMotion = false;
  let visible = true;
  let clockSeconds = 0;
  let oneShotElapsed = initialMood === 'greet' || initialMood === 'celebrate' ? 0 : -1;

  const resetToRest = () => {
    for (const name of PET_ANCHOR_NAMES) {
      springs[name].value = cloneTransform(rest[name]);
      springs[name].velocity = createVelocity();
    }
  };

  const effectiveMood = (): PetMood => (reducedMotion ? 'rest' : mood);

  const controller: PetMotionController = {
    setMood(nextMood) {
      mood = nextMood;
      oneShotElapsed = nextMood === 'greet' || nextMood === 'celebrate' ? 0 : -1;
      if (reducedMotion || nextMood === 'rest') resetToRest();
    },
    setReducedMotion(value) {
      reducedMotion = value;
      if (value) resetToRest();
    },
    setVisible(value) {
      visible = value;
    },
    advance(deltaSeconds) {
      if (!visible) return clonePose(Object.fromEntries(PET_ANCHOR_NAMES.map((name) => [name, springs[name].value])) as FoxPose);
      if (reducedMotion || effectiveMood() === 'rest') {
        resetToRest();
        return clonePose(rest);
      }

      const delta = Number.isFinite(deltaSeconds) ? clamp(deltaSeconds, 0, MAX_DELTA) : 0;
      clockSeconds += delta;
      if (oneShotElapsed >= 0) {
        oneShotElapsed += delta;
        const duration = mood === 'greet' ? GREET_DURATION : CELEBRATE_DURATION;
        if (oneShotElapsed >= duration) {
          mood = 'idle';
          oneShotElapsed = -1;
        }
      }

      const target = moodTarget(effectiveMood(), clockSeconds, Math.max(0, oneShotElapsed));
      for (const name of PET_ANCHOR_NAMES) {
        const spring = springs[name];
        const nextTarget = target[name];
        const stiffness = name.startsWith('tail-') ? 110 : 170;
        const damping = name.startsWith('tail-') ? 16 : 22;
        for (const property of ['x', 'y', 'rotation', 'scale', 'z'] as const) {
          const acceleration = (nextTarget[property] - spring.value[property]) * stiffness - spring.velocity[property] * damping;
          spring.velocity[property] += acceleration * delta;
          spring.value[property] += spring.velocity[property] * delta;
        }
        clampTransform(spring.value);
      }
      return clonePose(Object.fromEntries(PET_ANCHOR_NAMES.map((name) => [name, springs[name].value])) as FoxPose);
    },
    getPose() {
      return clonePose(Object.fromEntries(PET_ANCHOR_NAMES.map((name) => [name, springs[name].value])) as FoxPose);
    },
    isAnimating() {
      return visible && !reducedMotion && effectiveMood() !== 'rest';
    },
  };

  return controller;
}
