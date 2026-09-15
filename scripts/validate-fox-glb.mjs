#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = path.resolve(process.argv[2] ?? path.join(projectRoot, 'public/art/fox-pet.glb'));
const buffer = fs.readFileSync(inputPath);

function fail(message) {
  throw new Error(`FoxPet GLB validation failed: ${message}`);
}

if (buffer.readUInt32LE(0) !== 0x46546c67) fail('invalid glTF magic');
if (buffer.readUInt32LE(4) !== 2) fail('expected GLB version 2');
if (buffer.readUInt32LE(8) !== buffer.byteLength) fail('header length does not match file length');

let offset = 12;
let json = null;
let binaryChunk = null;
while (offset < buffer.byteLength) {
  const chunkLength = buffer.readUInt32LE(offset);
  const chunkType = buffer.readUInt32LE(offset + 4);
  const chunk = buffer.subarray(offset + 8, offset + 8 + chunkLength);
  if (chunkType === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8').trim());
  if (chunkType === 0x004e4942) binaryChunk = chunk;
  offset += 8 + chunkLength;
}
if (!json) fail('JSON chunk missing');
if (!binaryChunk) fail('BIN chunk missing');
if (json.asset?.version !== '2.0') fail('asset.version must be 2.0');

const meshNode = json.nodes?.find((node) => node.name === 'FoxPet');
if (!meshNode || meshNode.mesh !== 0 || meshNode.skin !== 0) fail('FoxPet node must reference mesh 0 and skin 0');
const mesh = json.meshes?.[meshNode.mesh];
const skin = json.skins?.[meshNode.skin];
if (!mesh || !skin) fail('mesh or skin missing');
if (mesh.primitives.length < 10) fail('expected a multi-part mesh, not a flat placeholder');
if (!skin.inverseBindMatrices || skin.joints.length < 10) fail('expected a real skeleton with inverse bind matrices');
if (json.images?.length || json.textures?.length) fail('procedural asset must not depend on an unreviewed texture');
const materialNames = new Set((json.materials ?? []).map((material) => material.name));
for (const material of ['fox-orange', 'fox-cream', 'teal', 'teal-dark', 'compass-gold', 'compass-face']) {
  if (!materialNames.has(material)) fail(`missing identity material ${material}`);
}

const expectedBones = ['root', 'body', 'head', 'ear_l', 'ear_r', 'tail_base', 'tail_mid', 'tail_tip', 'scarf', 'backpack', 'arm_l', 'arm_r', 'leg_fl', 'leg_fr', 'leg_bl', 'leg_br', 'compass'];
const nodeNames = new Set(json.nodes.map((node) => node.name));
for (const bone of expectedBones) if (!nodeNames.has(bone)) fail(`missing named joint ${bone}`);
for (const joint of skin.joints) if (!json.nodes[joint]) fail(`skin joint node ${joint} is missing`);

const accessors = json.accessors ?? [];
function accessorStart(accessor) {
  const view = json.bufferViews[accessor.bufferView];
  if (!view) fail('accessor references missing bufferView');
  return (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
}

let vertexCount = 0;
let triangleCount = 0;
for (const [primitiveIndex, primitive] of mesh.primitives.entries()) {
  const position = accessors[primitive.attributes.POSITION];
  const normal = accessors[primitive.attributes.NORMAL];
  const joints = accessors[primitive.attributes.JOINTS_0];
  const weights = accessors[primitive.attributes.WEIGHTS_0];
  const indices = accessors[primitive.indices];
  if (!position || !normal || !joints || !weights || !indices) fail(`primitive ${primitiveIndex} is missing skin attributes`);
  if (position.type !== 'VEC3' || position.componentType !== 5126) fail(`primitive ${primitiveIndex} position must be FLOAT VEC3`);
  if (normal.type !== 'VEC3' || normal.componentType !== 5126) fail(`primitive ${primitiveIndex} normal must be FLOAT VEC3`);
  if (joints.type !== 'VEC4' || joints.componentType !== 5121) fail(`primitive ${primitiveIndex} joints must be UNSIGNED_BYTE VEC4`);
  if (weights.type !== 'VEC4' || weights.componentType !== 5126) fail(`primitive ${primitiveIndex} weights must be FLOAT VEC4`);
  if (position.count !== normal.count || position.count !== joints.count || position.count !== weights.count) fail(`primitive ${primitiveIndex} attribute counts differ`);
  if (indices.type !== 'SCALAR' || ![5121, 5123, 5125].includes(indices.componentType)) fail(`primitive ${primitiveIndex} indices are invalid`);
  const jointStart = accessorStart(joints);
  const weightStart = accessorStart(weights);
  for (let vertex = 0; vertex < joints.count; vertex += 1) {
    const jointOffset = jointStart + vertex * 4;
    const weightOffset = weightStart + vertex * 16;
    const weightSum = binaryChunk.readFloatLE(weightOffset) + binaryChunk.readFloatLE(weightOffset + 4) + binaryChunk.readFloatLE(weightOffset + 8) + binaryChunk.readFloatLE(weightOffset + 12);
    for (let influence = 0; influence < 4; influence += 1) {
      if (binaryChunk[jointOffset + influence] >= skin.joints.length) fail(`primitive ${primitiveIndex} has an out-of-range joint index`);
    }
    if (!Number.isFinite(weightSum) || Math.abs(weightSum - 1) > 0.001) fail(`primitive ${primitiveIndex} has invalid skin weights`);
  }
  vertexCount += position.count;
  triangleCount += indices.count / 3;
}

const clipNames = (json.animations ?? []).map((animation) => animation.name);
const requiredClips = ['idle', 'greet', 'think', 'celebrate', 'rest'];
for (const clip of requiredClips) {
  if (!clipNames.includes(clip)) fail(`missing animation clip ${clip}`);
  const animation = json.animations.find((item) => item.name === clip);
  if (!animation.channels.length) fail(`animation ${clip} has no channels`);
  for (const channel of animation.channels) {
    if (!json.nodes[channel.target.node]) fail(`animation ${clip} targets missing node`);
    if (!['translation', 'rotation'].includes(channel.target.path)) fail(`animation ${clip} has unsupported path`);
  }
}

const requiredMotionNodes = { idle: ['body', 'head', 'tail_base'], greet: ['arm_r', 'head', 'tail_mid'], celebrate: ['arm_l', 'arm_r', 'tail_tip'] };
for (const [clip, nodeList] of Object.entries(requiredMotionNodes)) {
  const animation = json.animations.find((item) => item.name === clip);
  const targeted = new Set(animation.channels.map((channel) => json.nodes[channel.target.node]?.name));
  for (const node of nodeList) if (!targeted.has(node)) fail(`${clip} must animate ${node}`);
}

const report = {
  file: path.relative(projectRoot, inputPath),
  bytes: buffer.byteLength,
  binaryBytes: binaryChunk.byteLength,
  vertices: vertexCount,
  triangles: triangleCount,
  primitives: mesh.primitives.length,
  bones: skin.joints.length,
  clips: clipNames,
  skinAttributes: ['POSITION', 'NORMAL', 'JOINTS_0', 'WEIGHTS_0'],
};
console.log(JSON.stringify(report, null, 2));
