import { describe, expect, it } from 'vitest';
import {
  createFoxRig,
  createRestPose,
  deformFoxVertices,
  weightsAreNormalized,
} from './rig';
import { PET_ANCHOR_NAMES } from './types';

describe('fox 2D5D rig', () => {
  it('builds the deterministic 20 by 28 grid contract', () => {
    const rig = createFoxRig();

    expect(rig.columns).toBe(20);
    expect(rig.rows).toBe(28);
    expect(rig.vertices).toHaveLength(609);
    expect(rig.indices).toHaveLength(3360);
    expect(rig.indices.every((index) => index >= 0 && index < rig.vertices.length)).toBe(true);
    expect(rig.vertices.every((vertex) => vertex.u >= 0 && vertex.u <= 1 && vertex.v >= 0 && vertex.v <= 1)).toBe(true);
    expect(createFoxRig()).toEqual(rig);
  });

  it('normalizes every vertex weight and exposes every required anchor', () => {
    const rig = createFoxRig();

    expect(Object.keys(rig.anchors)).toEqual([...PET_ANCHOR_NAMES]);
    expect(weightsAreNormalized(rig)).toBe(true);
    for (const vertex of rig.vertices) {
      const weights = Object.values(vertex.weights);
      expect(weights.every((weight) => weight >= 0)).toBe(true);
      expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 6);
    }
  });

  it('creates an identity rest pose and finite undeformed positions', () => {
    const rig = createFoxRig();
    const restPose = createRestPose(rig);

    for (const name of PET_ANCHOR_NAMES) {
      expect(restPose[name]).toEqual({ x: 0, y: 0, rotation: 0, scale: 1, z: 0 });
    }

    const positions = deformFoxVertices(rig, restPose);
    expect(positions).toHaveLength(rig.vertices.length * 3);
    expect(Array.from(positions).every(Number.isFinite)).toBe(true);
    rig.vertices.forEach((vertex, index) => {
      expect(positions[index * 3]).toBeCloseTo(vertex.baseX, 5);
      expect(positions[index * 3 + 1]).toBeCloseTo(vertex.baseY, 5);
      expect(positions[index * 3 + 2]).toBeCloseTo(vertex.baseZ, 5);
    });
  });
});
