import {
  PET_ANCHOR_NAMES,
  type AnchorDefinition,
  type AnchorTransform,
  type FoxPose,
  type FoxRigDefinition,
  type FoxRigVertex,
  type PetAnchorName,
} from './types';

export const FOX_TEXTURE_WIDTH = 1145;
export const FOX_TEXTURE_HEIGHT = 1373;
export const FOX_TEXTURE_ASPECT = FOX_TEXTURE_HEIGHT / FOX_TEXTURE_WIDTH;

const COLUMNS = 20;
const ROWS = 28;

export const FOX_ANCHORS: Record<PetAnchorName, AnchorDefinition> = {
  root: { x: 0.56, y: 0.70, influenceX: 0.42, influenceY: 0.48, maxRotation: 0.18, maxScale: 1.03, depth: 0.012 },
  torso: { x: 0.57, y: 0.62, influenceX: 0.42, influenceY: 0.48, maxRotation: 0.18, maxScale: 1.03, depth: 0.012 },
  head: { x: 0.57, y: 0.25, influenceX: 0.30, influenceY: 0.25, maxRotation: 0.18, maxScale: 1.025, depth: 0.018 },
  'ear-left': { x: 0.28, y: 0.16, influenceX: 0.18, influenceY: 0.14, maxRotation: 0.18, maxScale: 1.02, depth: 0.02 },
  'ear-right': { x: 0.78, y: 0.12, influenceX: 0.18, influenceY: 0.14, maxRotation: 0.18, maxScale: 1.02, depth: 0.02 },
  'wave-arm': { x: 0.86, y: 0.47, influenceX: 0.23, influenceY: 0.25, maxRotation: 0.18, maxScale: 1.025, depth: 0.022 },
  'compass-arm': { x: 0.56, y: 0.62, influenceX: 0.23, influenceY: 0.25, maxRotation: 0.18, maxScale: 1.025, depth: 0.02 },
  'tail-base': { x: 0.27, y: 0.69, influenceX: 0.24, influenceY: 0.22, maxRotation: 0.18, maxScale: 1.025, depth: 0.018 },
  'tail-mid': { x: 0.14, y: 0.80, influenceX: 0.24, influenceY: 0.22, maxRotation: 0.18, maxScale: 1.025, depth: 0.018 },
  'tail-tip': { x: 0.21, y: 0.90, influenceX: 0.24, influenceY: 0.22, maxRotation: 0.18, maxScale: 1.025, depth: 0.018 },
  'leg-left': { x: 0.51, y: 0.92, influenceX: 0.19, influenceY: 0.18, maxRotation: 0.18, maxScale: 1.02, depth: 0.01 },
  'leg-right': { x: 0.76, y: 0.92, influenceX: 0.19, influenceY: 0.18, maxRotation: 0.18, maxScale: 1.02, depth: 0.01 },
};

function cloneAnchors(): Record<PetAnchorName, AnchorDefinition> {
  return Object.fromEntries(PET_ANCHOR_NAMES.map((name) => [name, { ...FOX_ANCHORS[name] }])) as Record<PetAnchorName, AnchorDefinition>;
}

function smoothEllipseFalloff(u: number, v: number, anchor: AnchorDefinition): number {
  const dx = (u - anchor.x) / anchor.influenceX;
  const dy = (v - anchor.y) / anchor.influenceY;
  const distanceSquared = dx * dx + dy * dy;
  if (distanceSquared >= 1) return 0;
  const t = 1 - distanceSquared;
  return t * t * (3 - 2 * t);
}

function calculateWeights(u: number, v: number): Record<PetAnchorName, number> {
  const raw = {} as Record<PetAnchorName, number>;
  let total = 0;
  for (const name of PET_ANCHOR_NAMES) {
    const contribution = smoothEllipseFalloff(u, v, FOX_ANCHORS[name]);
    raw[name] = contribution;
    total += contribution;
  }
  if (total === 0) {
    return Object.fromEntries(PET_ANCHOR_NAMES.map((name) => [name, name === 'root' ? 1 : 0])) as Record<PetAnchorName, number>;
  }
  for (const name of PET_ANCHOR_NAMES) raw[name] /= total;
  return raw;
}

export function createFoxRig(): FoxRigDefinition {
  const vertices: FoxRigVertex[] = [];
  for (let row = 0; row <= ROWS; row += 1) {
    const v = row / ROWS;
    for (let column = 0; column <= COLUMNS; column += 1) {
      const u = column / COLUMNS;
      vertices.push({
        u,
        v,
        baseX: (u - 0.5) * 2,
        baseY: (0.5 - v) * 2 * FOX_TEXTURE_ASPECT,
        baseZ: 0,
        weights: calculateWeights(u, v),
      });
    }
  }

  const indices: number[] = [];
  const stride = COLUMNS + 1;
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const topLeft = row * stride + column;
      const topRight = topLeft + 1;
      const bottomLeft = (row + 1) * stride + column;
      const bottomRight = bottomLeft + 1;
      indices.push(topLeft, topRight, bottomRight, topLeft, bottomRight, bottomLeft);
    }
  }

  return { columns: COLUMNS, rows: ROWS, vertices, indices, anchors: cloneAnchors() };
}

function restTransform(): AnchorTransform {
  return { x: 0, y: 0, rotation: 0, scale: 1, z: 0 };
}

export function createRestPose(_rig: FoxRigDefinition): FoxPose {
  return Object.fromEntries(PET_ANCHOR_NAMES.map((name) => [name, restTransform()])) as FoxPose;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function anchorPosition(anchor: AnchorDefinition): { x: number; y: number } {
  return {
    x: (anchor.x - 0.5) * 2,
    y: (0.5 - anchor.y) * 2 * FOX_TEXTURE_ASPECT,
  };
}

function transformedVertex(vertex: FoxRigVertex, anchor: AnchorDefinition, transform: AnchorTransform): [number, number, number] {
  const pivot = anchorPosition(anchor);
  const rotation = clamp(transform.rotation, -anchor.maxRotation, anchor.maxRotation);
  const scale = clamp(transform.scale, 2 - anchor.maxScale, anchor.maxScale);
  const translationX = clamp(transform.x, -0.08, 0.08);
  const translationY = clamp(transform.y, -0.08, 0.08);
  const depth = clamp(transform.z, -anchor.depth, anchor.depth);
  const localX = (vertex.baseX - pivot.x) * scale;
  const localY = (vertex.baseY - pivot.y) * scale;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return [
    pivot.x + localX * cos - localY * sin + translationX,
    pivot.y + localX * sin + localY * cos + translationY,
    vertex.baseZ + depth,
  ];
}

export function deformFoxVertices(rig: FoxRigDefinition, pose: FoxPose): Float32Array {
  const positions = new Float32Array(rig.vertices.length * 3);
  rig.vertices.forEach((vertex, vertexIndex) => {
    let x = 0;
    let y = 0;
    let z = 0;
    for (const name of PET_ANCHOR_NAMES) {
      const weight = vertex.weights[name];
      if (weight <= 0) continue;
      const transformed = transformedVertex(vertex, rig.anchors[name], pose[name] ?? restTransform());
      x += transformed[0] * weight;
      y += transformed[1] * weight;
      z += transformed[2] * weight;
    }
    const offset = vertexIndex * 3;
    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;
  });
  return positions;
}

export function weightsAreNormalized(rig: FoxRigDefinition, epsilon = 0.000001): boolean {
  return rig.vertices.every((vertex) => {
    const weights = PET_ANCHOR_NAMES.map((name) => vertex.weights[name]);
    return weights.every((weight) => Number.isFinite(weight) && weight >= 0) && Math.abs(weights.reduce((sum, weight) => sum + weight, 0) - 1) <= epsilon;
  });
}
