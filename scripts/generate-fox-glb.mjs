#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.resolve(process.argv[2] ?? path.join(projectRoot, 'public/art/fox-pet.glb'));

const TAU = Math.PI * 2;

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(vector, amount) {
  return [vector[0] * amount, vector[1] * amount, vector[2] * amount];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function length(vector) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function normalize(vector) {
  const magnitude = length(vector) || 1;
  return scale(vector, 1 / magnitude);
}

function quaternionFromEuler(x, y, z) {
  const cx = Math.cos(x / 2);
  const sx = Math.sin(x / 2);
  const cy = Math.cos(y / 2);
  const sy = Math.sin(y / 2);
  const cz = Math.cos(z / 2);
  const sz = Math.sin(z / 2);
  return [
    sx * cy * cz + cx * sy * sz,
    cx * sy * cz - sx * cy * sz,
    cx * cy * sz + sx * sy * cz,
    cx * cy * cz - sx * sy * sz,
  ];
}

function ellipsoid(center, radii, segments = 12, rings = 8) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let ring = 0; ring <= rings; ring += 1) {
    const phi = -Math.PI / 2 + (Math.PI * ring) / rings;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    for (let segment = 0; segment <= segments; segment += 1) {
      const theta = (TAU * segment) / segments;
      const nx = cosPhi * Math.cos(theta);
      const ny = sinPhi;
      const nz = cosPhi * Math.sin(theta);
      positions.push(
        center[0] + nx * radii[0],
        center[1] + ny * radii[1],
        center[2] + nz * radii[2],
      );
      normals.push(...normalize([nx / radii[0], ny / radii[1], nz / radii[2]]));
    }
  }

  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = ring * (segments + 1) + segment;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  return { positions, normals, indices };
}

function box(center, dimensions) {
  const [width, height, depth] = dimensions.map((value) => value / 2);
  const corners = [
    [-width, -height, depth],
    [width, -height, depth],
    [width, height, depth],
    [-width, height, depth],
    [-width, -height, -depth],
    [-width, height, -depth],
    [width, height, -depth],
    [width, -height, -depth],
  ];
  const faces = [
    { vertices: [0, 1, 2, 3], normal: [0, 0, 1] },
    { vertices: [4, 7, 6, 5], normal: [0, 0, -1] },
    { vertices: [0, 4, 5, 3], normal: [-1, 0, 0] },
    { vertices: [1, 7, 6, 2], normal: [1, 0, 0] },
    { vertices: [3, 2, 6, 5], normal: [0, 1, 0] },
    { vertices: [0, 4, 7, 1], normal: [0, -1, 0] },
  ];
  const positions = [];
  const normals = [];
  const indices = [];
  for (const face of faces) {
    const offset = positions.length / 3;
    for (const cornerIndex of face.vertices) {
      positions.push(...add(center, corners[cornerIndex]));
      normals.push(...face.normal);
    }
    indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
  }
  return { positions, normals, indices };
}

function torus(center, majorRadius, tubeRadius, segments = 16, sides = 6) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (let segment = 0; segment <= segments; segment += 1) {
    const u = (TAU * segment) / segments;
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);
    for (let side = 0; side <= sides; side += 1) {
      const v = (TAU * side) / sides;
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);
      const radial = majorRadius + tubeRadius * cosV;
      positions.push(
        center[0] + radial * cosU,
        center[1] + tubeRadius * sinV,
        center[2] + radial * sinU,
      );
      normals.push(cosV * cosU, sinV, cosV * sinU);
    }
  }
  for (let segment = 0; segment < segments; segment += 1) {
    for (let side = 0; side < sides; side += 1) {
      const a = segment * (sides + 1) + side;
      const b = a + sides + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return { positions, normals, indices };
}

function cone(baseCenter, tip, baseRadius, tipRadius = 0.03, segments = 8) {
  const direction = normalize(subtract(tip, baseCenter));
  const helper = Math.abs(direction[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const basisA = normalize(cross(helper, direction));
  const basisB = normalize(cross(direction, basisA));
  const positions = [];
  const normals = [];
  const indices = [];
  for (let ring = 0; ring <= 1; ring += 1) {
    const center = ring === 0 ? baseCenter : tip;
    const radius = ring === 0 ? baseRadius : tipRadius;
    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (TAU * segment) / segments;
      const radial = add(scale(basisA, Math.cos(angle)), scale(basisB, Math.sin(angle)));
      positions.push(...add(center, scale(radial, radius)));
      normals.push(...normalize(add(radial, scale(direction, (baseRadius - tipRadius) / Math.max(length(subtract(tip, baseCenter)), 0.01)))));
    }
  }
  for (let segment = 0; segment < segments; segment += 1) {
    const a = segment;
    const b = a + segments + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  return { positions, normals, indices };
}

class BinaryBuilder {
  constructor() {
    this.chunks = [];
    this.byteLength = 0;
    this.bufferViews = [];
    this.accessors = [];
  }

  addBufferView(bytes, target) {
    const padding = (4 - (this.byteLength % 4)) % 4;
    if (padding) {
      this.chunks.push(Buffer.alloc(padding));
      this.byteLength += padding;
    }
    const offset = this.byteLength;
    const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.chunks.push(buffer);
    this.byteLength += buffer.byteLength;
    const view = { buffer: 0, byteOffset: offset, byteLength: buffer.byteLength };
    if (target) view.target = target;
    this.bufferViews.push(view);
    return this.bufferViews.length - 1;
  }

  addAccessor(values, componentType, type, target, min, max, normalized = false) {
    const view = this.addBufferView(values, target);
    const accessor = { bufferView: view, componentType, count: values.length / componentCount(type), type };
    if (normalized) accessor.normalized = true;
    if (min) accessor.min = min;
    if (max) accessor.max = max;
    this.accessors.push(accessor);
    return this.accessors.length - 1;
  }

  toBuffer() {
    return Buffer.concat(this.chunks, this.byteLength);
  }
}

function componentCount(type) {
  return { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[type];
}

function minMax(values, stride) {
  const min = Array.from({ length: stride }, () => Infinity);
  const max = Array.from({ length: stride }, () => -Infinity);
  for (let offset = 0; offset < values.length; offset += stride) {
    for (let index = 0; index < stride; index += 1) {
      min[index] = Math.min(min[index], values[offset + index]);
      max[index] = Math.max(max[index], values[offset + index]);
    }
  }
  return { min, max };
}

function translationMatrix(position) {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    position[0], position[1], position[2], 1,
  ]);
}

const materials = [
  { name: 'fox-orange', baseColorFactor: [0.95, 0.27, 0.08, 1], roughnessFactor: 0.82, metallicFactor: 0.02 },
  { name: 'fox-cream', baseColorFactor: [1, 0.76, 0.48, 1], roughnessFactor: 0.86, metallicFactor: 0.01 },
  { name: 'ink', baseColorFactor: [0.035, 0.018, 0.012, 1], roughnessFactor: 0.65, metallicFactor: 0.01 },
  { name: 'eye-highlight', baseColorFactor: [1, 0.98, 0.84, 1], roughnessFactor: 0.5, metallicFactor: 0 },
  { name: 'teal', baseColorFactor: [0.035, 0.58, 0.59, 1], roughnessFactor: 0.72, metallicFactor: 0.04 },
  { name: 'teal-dark', baseColorFactor: [0.018, 0.24, 0.3, 1], roughnessFactor: 0.78, metallicFactor: 0.04 },
  { name: 'compass-gold', baseColorFactor: [1, 0.67, 0.08, 1], roughnessFactor: 0.45, metallicFactor: 0.32 },
  { name: 'compass-face', baseColorFactor: [1, 0.93, 0.64, 1], roughnessFactor: 0.62, metallicFactor: 0.08 },
  { name: 'compass-needle', baseColorFactor: [0.78, 0.12, 0.08, 1], roughnessFactor: 0.52, metallicFactor: 0.1 },
];

const joints = [
  { name: 'root', parent: null, translation: [0, 0, 0] },
  { name: 'body', parent: 'root', translation: [0, 1.35, 0] },
  { name: 'head', parent: 'body', translation: [0, 1, 0] },
  { name: 'ear_l', parent: 'head', translation: [-0.35, 0.45, 0] },
  { name: 'ear_r', parent: 'head', translation: [0.35, 0.45, 0] },
  { name: 'tail_base', parent: 'body', translation: [0.52, -0.2, -0.18] },
  { name: 'tail_mid', parent: 'tail_base', translation: [0.38, 0.1, -0.02] },
  { name: 'tail_tip', parent: 'tail_mid', translation: [0.32, 0.14, -0.01] },
  { name: 'scarf', parent: 'body', translation: [0, 0.55, 0] },
  { name: 'backpack', parent: 'body', translation: [0, 0.08, -0.5] },
  { name: 'arm_l', parent: 'body', translation: [-0.62, 0.45, 0.18] },
  { name: 'arm_r', parent: 'body', translation: [0.62, 0.45, 0.18] },
  { name: 'leg_fl', parent: 'body', translation: [-0.38, -0.55, 0.13] },
  { name: 'leg_fr', parent: 'body', translation: [0.38, -0.55, 0.13] },
  { name: 'leg_bl', parent: 'body', translation: [-0.38, -0.55, -0.13] },
  { name: 'leg_br', parent: 'body', translation: [0.38, -0.55, -0.13] },
  { name: 'compass', parent: 'arm_r', translation: [0.1, -0.55, 0.1] },
];

const jointIndex = new Map(joints.map((joint, index) => [joint.name, index]));
const globalJointPositions = new Map();

function globalJointPosition(name) {
  if (globalJointPositions.has(name)) return globalJointPositions.get(name);
  const joint = joints.find((item) => item.name === name);
  const position = joint.parent ? add(globalJointPosition(joint.parent), joint.translation) : joint.translation;
  globalJointPositions.set(name, position);
  return position;
}

for (const joint of joints) globalJointPosition(joint.name);

const parts = [];

function addPart(name, geometry, material, joint) {
  parts.push({ name, ...geometry, material, joint });
}

const bodyPosition = globalJointPosition('body');
const headPosition = globalJointPosition('head');
const armLPosition = globalJointPosition('arm_l');
const armRPosition = globalJointPosition('arm_r');

addPart('body', ellipsoid(bodyPosition, [0.62, 0.78, 0.48], 12, 8), 0, 'body');
addPart('belly', ellipsoid([0, 1.35, 0.43], [0.42, 0.54, 0.1], 12, 6), 1, 'body');
addPart('head', ellipsoid(add(headPosition, [0, 0, 0.08]), [0.58, 0.52, 0.49], 12, 8), 0, 'head');
addPart('muzzle', ellipsoid(add(headPosition, [0, -0.16, 0.5]), [0.34, 0.22, 0.22], 10, 6), 1, 'head');
addPart('nose', ellipsoid(add(headPosition, [0, -0.15, 0.69]), [0.12, 0.09, 0.08], 8, 5), 2, 'head');

for (const side of [-1, 1]) {
  addPart(`eye-${side < 0 ? 'l' : 'r'}`, ellipsoid(add(headPosition, [side * 0.23, 0.1, 0.47]), [0.075, 0.09, 0.045], 8, 5), 2, 'head');
  addPart(`eye-highlight-${side < 0 ? 'l' : 'r'}`, ellipsoid(add(headPosition, [side * 0.25, 0.13, 0.51]), [0.022, 0.025, 0.012], 6, 4), 3, 'head');
  const ear = globalJointPosition(side < 0 ? 'ear_l' : 'ear_r');
  addPart(`ear-${side < 0 ? 'l' : 'r'}`, cone(add(ear, [0, -0.16, 0.03]), add(ear, [0, 0.52, 0]), 0.25, 0.035, 8), 0, side < 0 ? 'ear_l' : 'ear_r');
  addPart(`ear-inner-${side < 0 ? 'l' : 'r'}`, cone(add(ear, [0, -0.12, 0.12]), add(ear, [0, 0.39, 0.06]), 0.13, 0.025, 8), 1, side < 0 ? 'ear_l' : 'ear_r');
}

addPart('scarf-band', torus(globalJointPosition('scarf'), 0.53, 0.095, 16, 6), 4, 'scarf');
addPart('scarf-tail', box([0.36, 1.68, 0.43], [0.18, 0.55, 0.12]), 4, 'scarf');
addPart('backpack', box([0, 1.42, -0.5], [0.72, 0.68, 0.3]), 5, 'backpack');
addPart('backpack-strap-l', box([-0.39, 1.68, 0.37], [0.11, 0.66, 0.08]), 4, 'backpack');
addPart('backpack-strap-r', box([0.39, 1.68, 0.37], [0.11, 0.66, 0.08]), 4, 'backpack');

for (const [name, position, side] of [
  ['arm_l', armLPosition, -1],
  ['arm_r', armRPosition, 1],
]) {
  addPart(name, ellipsoid(add(position, [0, -0.48, 0.04]), [0.17, 0.48, 0.18], 10, 6), 0, name);
  addPart(`${name}-paw`, ellipsoid(add(position, [0, -0.94, 0.1]), [0.2, 0.15, 0.2], 8, 5), 1, name);
  if (side > 0) {
    const compass = globalJointPosition('compass');
    addPart('compass-rim', ellipsoid(add(compass, [0, 0, 0.08]), [0.2, 0.2, 0.06], 10, 5), 6, 'compass');
    addPart('compass-face', ellipsoid(add(compass, [0, 0, 0.14]), [0.15, 0.15, 0.035], 10, 5), 7, 'compass');
    addPart('compass-needle', box(add(compass, [0, 0.01, 0.18]), [0.035, 0.16, 0.025]), 8, 'compass');
  }
}

for (const [name, side, depth] of [
  ['leg_fl', -1, 1],
  ['leg_fr', 1, 1],
  ['leg_bl', -1, -1],
  ['leg_br', 1, -1],
]) {
  const position = globalJointPosition(name);
  addPart(name, ellipsoid(add(position, [0, -0.27, 0]), [0.22, 0.5, 0.22], 10, 6), 0, name);
  addPart(`${name}-paw`, ellipsoid(add(position, [0, -0.68, depth * 0.02]), [0.24, 0.15, 0.26], 8, 5), 1, name);
  void side;
}

for (const name of ['tail_base', 'tail_mid', 'tail_tip']) {
  const position = globalJointPosition(name);
  const radii = name === 'tail_base' ? [0.36, 0.31, 0.29] : name === 'tail_mid' ? [0.37, 0.28, 0.26] : [0.32, 0.25, 0.22];
  addPart(name, ellipsoid(position, radii, 10, 6), 0, name);
}
addPart('tail-tip-light', ellipsoid(add(globalJointPosition('tail_tip'), [0.22, 0.08, 0]), [0.2, 0.17, 0.16], 8, 5), 1, 'tail_tip');

const builder = new BinaryBuilder();
const primitives = [];

for (const part of parts) {
  const vertexCount = part.positions.length / 3;
  const positions = new Float32Array(part.positions);
  const normals = new Float32Array(part.normals);
  const jointsAttribute = new Uint8Array(vertexCount * 4);
  const weights = new Float32Array(vertexCount * 4);
  const skinJoint = jointIndex.get(part.joint);
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    jointsAttribute[vertex * 4] = skinJoint;
    weights[vertex * 4] = 1;
  }
  const positionBounds = minMax(part.positions, 3);
  const positionAccessor = builder.addAccessor(positions, 5126, 'VEC3', 34962, positionBounds.min, positionBounds.max);
  const normalAccessor = builder.addAccessor(normals, 5126, 'VEC3', 34962);
  const jointsAccessor = builder.addAccessor(jointsAttribute, 5121, 'VEC4', 34962);
  const weightsAccessor = builder.addAccessor(weights, 5126, 'VEC4', 34962);
  const indexAccessor = builder.addAccessor(new Uint16Array(part.indices), 5123, 'SCALAR', 34963, [0], [vertexCount - 1]);
  primitives.push({
    name: part.name,
    attributes: { POSITION: positionAccessor, NORMAL: normalAccessor, JOINTS_0: jointsAccessor, WEIGHTS_0: weightsAccessor },
    indices: indexAccessor,
    material: part.material,
  });
}

const inverseBindMatrices = new Float32Array(joints.length * 16);
for (let index = 0; index < joints.length; index += 1) {
  inverseBindMatrices.set(translationMatrix(scale(globalJointPosition(joints[index].name), -1)), index * 16);
}
const inverseBindAccessor = builder.addAccessor(inverseBindMatrices, 5126, 'MAT4');

const nodes = [{ name: 'FoxPet', mesh: 0, skin: 0 }];
const nodeIndex = new Map();
for (const joint of joints) {
  nodeIndex.set(joint.name, nodes.length);
  nodes.push({ name: joint.name, translation: joint.translation });
}
for (const joint of joints) {
  if (joint.parent) {
    const parent = nodes[nodeIndex.get(joint.parent)];
    parent.children = [...(parent.children ?? []), nodeIndex.get(joint.name)];
  }
}

function translationTrack(joint, times, values) {
  return { joint, path: 'translation', times, values: values.flat() };
}

function rotationTrack(joint, times, eulers) {
  return { joint, path: 'rotation', times, values: eulers.flatMap(([x, y, z]) => quaternionFromEuler(x, y, z)) };
}

const animations = [
  {
    name: 'idle',
    tracks: [
      translationTrack('root', [0, 1.2, 2.4], [[0, 0, 0], [0, 0.035, 0], [0, 0, 0]]),
      rotationTrack('body', [0, 1.2, 2.4], [[0, 0, -0.025], [0, 0, 0.025], [0, 0, -0.025]]),
      rotationTrack('head', [0, 1.2, 2.4], [[0, 0.025, 0], [0, -0.025, 0], [0, 0.025, 0]]),
      rotationTrack('tail_base', [0, 1.2, 2.4], [[0, 0.18, 0.05], [0, -0.14, -0.05], [0, 0.18, 0.05]]),
      rotationTrack('tail_mid', [0, 1.2, 2.4], [[0, -0.25, -0.08], [0, 0.2, 0.06], [0, -0.25, -0.08]]),
      rotationTrack('tail_tip', [0, 1.2, 2.4], [[0, 0.28, 0.08], [0, -0.22, -0.06], [0, 0.28, 0.08]]),
    ],
  },
  {
    name: 'greet',
    tracks: [
      translationTrack('root', [0, 0.35, 0.7, 1.05, 1.4], [[0, 0, 0], [0, 0.06, 0], [0, 0, 0], [0, 0.05, 0], [0, 0, 0]]),
      rotationTrack('body', [0, 0.35, 0.7, 1.05, 1.4], [[0, 0, 0], [0, 0, -0.04], [0, 0, 0.04], [0, 0, -0.03], [0, 0, 0]]),
      rotationTrack('head', [0, 0.35, 0.7, 1.05, 1.4], [[0, 0, 0], [0, -0.08, -0.08], [0, 0.08, 0.08], [0, -0.04, -0.04], [0, 0, 0]]),
      rotationTrack('arm_r', [0, 0.35, 0.7, 1.05, 1.4], [[0, 0, 0], [0, 0, -0.85], [0, 0, 0.35], [0, 0, -0.75], [0, 0, 0]]),
      rotationTrack('tail_base', [0, 0.35, 0.7, 1.05, 1.4], [[0, 0, 0], [0, 0.25, 0.08], [0, -0.2, -0.06], [0, 0.18, 0.05], [0, 0, 0]]),
      rotationTrack('tail_mid', [0, 0.35, 0.7, 1.05, 1.4], [[0, 0, 0], [0, -0.32, -0.1], [0, 0.25, 0.08], [0, -0.25, -0.08], [0, 0, 0]]),
    ],
  },
  {
    name: 'think',
    tracks: [
      rotationTrack('head', [0, 0.8, 1.6, 2.4], [[0, 0, 0], [0, 0, -0.13], [0, 0, 0.1], [0, 0, 0]]),
      rotationTrack('ear_l', [0, 0.8, 1.6, 2.4], [[0, 0, 0], [0, 0, 0.12], [0, 0, -0.06], [0, 0, 0]]),
      rotationTrack('ear_r', [0, 0.8, 1.6, 2.4], [[0, 0, 0], [0, 0, -0.09], [0, 0, 0.06], [0, 0, 0]]),
      rotationTrack('tail_base', [0, 0.8, 1.6, 2.4], [[0, 0.12, 0], [0, -0.16, 0], [0, 0.14, 0], [0, 0.12, 0]]),
      rotationTrack('tail_mid', [0, 0.8, 1.6, 2.4], [[0, -0.18, 0], [0, 0.22, 0], [0, -0.2, 0], [0, -0.18, 0]]),
    ],
  },
  {
    name: 'celebrate',
    tracks: [
      translationTrack('root', [0, 0.3, 0.6, 0.9, 1.2], [[0, 0, 0], [0, 0.16, 0], [0, 0, 0], [0, 0.1, 0], [0, 0, 0]]),
      rotationTrack('body', [0, 0.3, 0.6, 0.9, 1.2], [[0, 0, 0], [0, 0, -0.06], [0, 0, 0.06], [0, 0, -0.04], [0, 0, 0]]),
      rotationTrack('head', [0, 0.3, 0.6, 0.9, 1.2], [[0, 0, 0], [-0.1, 0, -0.06], [0.06, 0, 0.06], [-0.04, 0, -0.03], [0, 0, 0]]),
      rotationTrack('arm_l', [0, 0.3, 0.6, 0.9, 1.2], [[0, 0, 0], [0, 0, 0.75], [0, 0, 1], [0, 0, 0.65], [0, 0, 0]]),
      rotationTrack('arm_r', [0, 0.3, 0.6, 0.9, 1.2], [[0, 0, 0], [0, 0, -0.75], [0, 0, -1], [0, 0, -0.65], [0, 0, 0]]),
      rotationTrack('tail_base', [0, 0.3, 0.6, 0.9, 1.2], [[0, 0, 0], [0, 0.3, 0.1], [0, -0.25, -0.08], [0, 0.22, 0.08], [0, 0, 0]]),
      rotationTrack('tail_mid', [0, 0.3, 0.6, 0.9, 1.2], [[0, 0, 0], [0, -0.38, -0.12], [0, 0.32, 0.1], [0, -0.3, -0.1], [0, 0, 0]]),
      rotationTrack('tail_tip', [0, 0.3, 0.6, 0.9, 1.2], [[0, 0, 0], [0, 0.45, 0.14], [0, -0.38, -0.12], [0, 0.32, 0.1], [0, 0, 0]]),
    ],
  },
  {
    name: 'rest',
    tracks: [
      translationTrack('root', [0, 1.5, 3], [[0, -0.06, 0], [0, -0.02, 0], [0, -0.06, 0]]),
      rotationTrack('body', [0, 1.5, 3], [[0, 0, 0.02], [0, 0, -0.015], [0, 0, 0.02]]),
      rotationTrack('head', [0, 1.5, 3], [[0, 0, 0.04], [0, 0, -0.02], [0, 0, 0.04]]),
      rotationTrack('ear_l', [0, 1.5, 3], [[0, 0, 0], [0, 0, 0.035], [0, 0, 0]]),
      rotationTrack('ear_r', [0, 1.5, 3], [[0, 0, 0], [0, 0, -0.035], [0, 0, 0]]),
    ],
  },
];

const gltfAnimations = animations.map((animation) => {
  const samplers = [];
  const channels = [];
  for (const track of animation.tracks) {
    const inputValues = new Float32Array(track.times);
    const outputValues = new Float32Array(track.values);
    const inputBounds = minMax(track.times, 1);
    const input = builder.addAccessor(inputValues, 5126, 'SCALAR', undefined, inputBounds.min, inputBounds.max);
    const outputType = track.path === 'rotation' ? 'VEC4' : 'VEC3';
    const output = builder.addAccessor(outputValues, 5126, outputType);
    samplers.push({ input, output, interpolation: 'LINEAR' });
    channels.push({ sampler: samplers.length - 1, target: { node: nodeIndex.get(track.joint), path: track.path } });
  }
  return { name: animation.name, samplers, channels };
});

const gltf = {
  asset: { version: '2.0', generator: 'Học Vui procedural FoxPet GLB generator' },
  scene: 0,
  scenes: [{ name: 'FoxPetScene', nodes: [0, nodeIndex.get('root')] }],
  nodes,
  meshes: [{ name: 'FoxPetMesh', primitives }],
  materials: materials.map((material) => ({
    name: material.name,
    pbrMetallicRoughness: {
      baseColorFactor: material.baseColorFactor,
      metallicFactor: material.metallicFactor,
      roughnessFactor: material.roughnessFactor,
    },
    doubleSided: true,
  })),
  skins: [{ name: 'FoxPetSkin', inverseBindMatrices: inverseBindAccessor, joints: joints.map((joint) => nodeIndex.get(joint.name)), skeleton: nodeIndex.get('root') }],
  animations: gltfAnimations,
  buffers: [{ byteLength: builder.byteLength }],
  bufferViews: builder.bufferViews,
  accessors: builder.accessors,
};

const jsonBytes = Buffer.from(JSON.stringify(gltf));
const jsonPadding = (4 - (jsonBytes.byteLength % 4)) % 4;
const paddedJson = Buffer.concat([jsonBytes, Buffer.alloc(jsonPadding, 0x20)]);
const binary = builder.toBuffer();
const binaryPadding = (4 - (binary.byteLength % 4)) % 4;
const paddedBinary = Buffer.concat([binary, Buffer.alloc(binaryPadding)]);
const totalLength = 12 + 8 + paddedJson.byteLength + 8 + paddedBinary.byteLength;
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(totalLength, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(paddedJson.byteLength, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binaryHeader = Buffer.alloc(8);
binaryHeader.writeUInt32LE(paddedBinary.byteLength, 0);
binaryHeader.writeUInt32LE(0x004e4942, 4);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, Buffer.concat([header, jsonHeader, paddedJson, binaryHeader, paddedBinary]));

const vertexCount = parts.reduce((total, part) => total + part.positions.length / 3, 0);
const triangleCount = parts.reduce((total, part) => total + part.indices.length / 3, 0);
console.log(JSON.stringify({
  output: path.relative(projectRoot, outputPath),
  bytes: fs.statSync(outputPath).size,
  vertices: vertexCount,
  triangles: triangleCount,
  bones: joints.length,
  clips: animations.map((animation) => animation.name),
}, null, 2));
