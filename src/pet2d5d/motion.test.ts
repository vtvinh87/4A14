import { describe, expect, it } from 'vitest';
import { createFoxRig, createRestPose } from './rig';
import { createPetMotionController } from './motion';

function advanceFrames(controller: ReturnType<typeof createPetMotionController>, count: number, delta = 1 / 60) {
  for (let frame = 0; frame < count; frame += 1) controller.advance(delta);
}

function poseValues(pose: ReturnType<ReturnType<typeof createPetMotionController>['getPose']>) {
  return Object.values(pose).flatMap((transform) => [transform.x, transform.y, transform.rotation, transform.scale, transform.z]);
}

function expectSafePose(pose: ReturnType<ReturnType<typeof createPetMotionController>['getPose']>) {
  expect(poseValues(pose).every(Number.isFinite)).toBe(true);
  for (const transform of Object.values(pose)) {
    expect(Math.abs(transform.rotation)).toBeLessThanOrEqual(0.18);
    expect(Math.abs(transform.scale - 1)).toBeLessThanOrEqual(0.03);
  }
  expect(Math.abs(pose.root.y)).toBeLessThanOrEqual(0.06);
}

describe('fox 2D5D motion controller', () => {
  it('starts in idle with a finite pose and moves on greet', () => {
    const rig = createFoxRig();
    const controller = createPetMotionController(rig, 'idle');
    const rest = createRestPose(rig);

    expect(poseValues(controller.getPose()).every(Number.isFinite)).toBe(true);
    controller.setMood('greet');
    const pose = controller.advance(1 / 60);
    expect(pose['wave-arm'].rotation).not.toBe(rest['wave-arm'].rotation);
    expect(Object.values(pose).every((transform) => transform.z === 0)).toBe(true);
    expect(poseValues(pose).every(Number.isFinite)).toBe(true);
  });

  it('settles a greet one-shot back toward idle after its duration', () => {
    const controller = createPetMotionController(createFoxRig(), 'idle');

    controller.setMood('greet');
    advanceFrames(controller, 90);
    const pose = controller.getPose();

    expect(Math.abs(pose['wave-arm'].rotation)).toBeLessThan(0.03);
    expect(Math.abs(pose.head.rotation)).toBeLessThan(0.03);
  });

  it('keeps celebrate within the specified lift and scale profile', () => {
    const controller = createPetMotionController(createFoxRig(), 'idle');

    controller.setMood('celebrate');
    advanceFrames(controller, 35);
    const pose = controller.getPose();

    expect(pose.root.y).toBeGreaterThanOrEqual(-0.045 - 0.002);
    expect(pose.root.y).toBeLessThanOrEqual(0.002);
    expect(pose.root.scale).toBeLessThanOrEqual(1.018 + 0.002);
    expect(pose.root.scale).toBeGreaterThanOrEqual(0.998);
  });

  it('loops think with a changing pose rather than a fixed offset', () => {
    const controller = createPetMotionController(createFoxRig(), 'idle');

    controller.setMood('think');
    advanceFrames(controller, 18);
    const first = controller.getPose();
    advanceFrames(controller, 42);
    const second = controller.getPose();

    expect(Math.abs(first.head.rotation - second.head.rotation) + Math.abs(first['tail-mid'].rotation - second['tail-mid'].rotation)).toBeGreaterThan(0.0001);
  });

  it('freezes at rest when reduced motion is enabled', () => {
    const controller = createPetMotionController(createFoxRig(), 'greet');

    controller.setReducedMotion(true);
    const first = controller.advance(0.05);
    advanceFrames(controller, 30);
    const second = controller.getPose();

    expect(controller.isAnimating()).toBe(false);
    expect(second).toEqual(first);
    expect(second.root).toEqual({ x: 0, y: 0, rotation: 0, scale: 1, z: 0 });
  });

  it('pauses without accumulating hidden-tab time and clamps invalid deltas', () => {
    const hidden = createPetMotionController(createFoxRig(), 'idle');
    const visible = createPetMotionController(createFoxRig(), 'idle');

    const before = hidden.getPose();
    hidden.setVisible(false);
    hidden.advance(0.05);
    expect(hidden.isAnimating()).toBe(false);
    expect(hidden.getPose()).toEqual(before);
    hidden.setVisible(true);
    hidden.advance(0.2);

    visible.advance(0.05);
    expect(hidden.getPose()).toEqual(visible.getPose());

    const negative = createPetMotionController(createFoxRig(), 'idle');
    const clamped = createPetMotionController(createFoxRig(), 'idle');
    negative.advance(-1);
    clamped.advance(0);
    expect(negative.getPose()).toEqual(clamped.getPose());
  });

  it('keeps a ten-second idle simulation inside the safe motion bounds', () => {
    const controller = createPetMotionController(createFoxRig(), 'idle');

    for (let frame = 0; frame < 10 * 60; frame += 1) {
      expectSafePose(controller.advance(1 / 60));
    }
  });

  it('keeps two greet and celebrate runs inside the safe motion bounds', () => {
    const controller = createPetMotionController(createFoxRig(), 'idle');

    for (const mood of ['greet', 'celebrate'] as const) {
      for (let run = 0; run < 2; run += 1) {
        controller.setMood(mood);
        for (let frame = 0; frame < 2 * 60; frame += 1) {
          expectSafePose(controller.advance(1 / 60));
        }
      }
    }
  });

  it('keeps reduced motion fixed over a ten-second simulation', () => {
    const controller = createPetMotionController(createFoxRig(), 'idle');

    controller.setReducedMotion(true);
    const initial = controller.getPose();
    for (let frame = 0; frame < 10 * 60; frame += 1) {
      expect(controller.advance(1 / 60)).toEqual(initial);
    }
    expect(controller.isAnimating()).toBe(false);
  });

  it('keeps depth constant while preserving in-plane mood motion', () => {
    const controller = createPetMotionController(createFoxRig(), 'idle');
    const rest = createRestPose(createFoxRig());
    let inPlaneMotionDetected = false;

    for (const mood of ['idle', 'greet', 'think', 'celebrate', 'rest'] as const) {
      controller.setMood(mood);
      for (let frame = 0; frame < 120; frame += 1) {
        const pose = controller.advance(1 / 60);
        expect(Object.values(pose).every((transform) => transform.z === 0)).toBe(true);
        if (Object.entries(pose).some(([name, transform]) => {
          const baseline = rest[name as keyof typeof rest];
          return Math.abs(transform.x - baseline.x) + Math.abs(transform.y - baseline.y) + Math.abs(transform.rotation - baseline.rotation) + Math.abs(transform.scale - baseline.scale) > 0.0001;
        })) {
          inPlaneMotionDetected = true;
        }
      }
    }

    expect(inPlaneMotionDetected).toBe(true);
  });
});
