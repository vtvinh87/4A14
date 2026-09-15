const SALSA_BLOCK_BYTES = 64;

export type ScryptOptions = {
  cost: number;
  blockSize: number;
  parallelization: number;
  keyLength: number;
};

type SalsaWorkspace = {
  state: Uint32Array;
  initial: Uint32Array;
  output: Uint8Array;
};

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]
    | (bytes[offset + 1] << 8)
    | (bytes[offset + 2] << 16)
    | (bytes[offset + 3] << 24)
  ) >>> 0;
}

function writeUint32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function rotateLeft(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function salsa208Xor(input: Uint8Array, inputOffset: number, xorBlock: Uint8Array, output: Uint8Array, workspace: SalsaWorkspace): void {
  const { state, initial } = workspace;
  for (let index = 0; index < 16; index += 1) {
    const value = (readUint32(input, inputOffset + index * 4) ^ readUint32(xorBlock, index * 4)) >>> 0;
    state[index] = value;
    initial[index] = value;
  }

  for (let round = 0; round < 8; round += 2) {
    state[4] ^= rotateLeft((state[0] + state[12]) >>> 0, 7);
    state[8] ^= rotateLeft((state[4] + state[0]) >>> 0, 9);
    state[12] ^= rotateLeft((state[8] + state[4]) >>> 0, 13);
    state[0] ^= rotateLeft((state[12] + state[8]) >>> 0, 18);
    state[9] ^= rotateLeft((state[5] + state[1]) >>> 0, 7);
    state[13] ^= rotateLeft((state[9] + state[5]) >>> 0, 9);
    state[1] ^= rotateLeft((state[13] + state[9]) >>> 0, 13);
    state[5] ^= rotateLeft((state[1] + state[13]) >>> 0, 18);
    state[14] ^= rotateLeft((state[10] + state[6]) >>> 0, 7);
    state[2] ^= rotateLeft((state[14] + state[10]) >>> 0, 9);
    state[6] ^= rotateLeft((state[2] + state[14]) >>> 0, 13);
    state[10] ^= rotateLeft((state[6] + state[2]) >>> 0, 18);
    state[3] ^= rotateLeft((state[15] + state[11]) >>> 0, 7);
    state[7] ^= rotateLeft((state[3] + state[15]) >>> 0, 9);
    state[11] ^= rotateLeft((state[7] + state[3]) >>> 0, 13);
    state[15] ^= rotateLeft((state[11] + state[7]) >>> 0, 18);

    state[1] ^= rotateLeft((state[0] + state[3]) >>> 0, 7);
    state[2] ^= rotateLeft((state[1] + state[0]) >>> 0, 9);
    state[3] ^= rotateLeft((state[2] + state[1]) >>> 0, 13);
    state[0] ^= rotateLeft((state[3] + state[2]) >>> 0, 18);
    state[6] ^= rotateLeft((state[5] + state[4]) >>> 0, 7);
    state[7] ^= rotateLeft((state[6] + state[5]) >>> 0, 9);
    state[4] ^= rotateLeft((state[7] + state[6]) >>> 0, 13);
    state[5] ^= rotateLeft((state[4] + state[7]) >>> 0, 18);
    state[11] ^= rotateLeft((state[10] + state[9]) >>> 0, 7);
    state[8] ^= rotateLeft((state[11] + state[10]) >>> 0, 9);
    state[9] ^= rotateLeft((state[8] + state[11]) >>> 0, 13);
    state[10] ^= rotateLeft((state[9] + state[8]) >>> 0, 18);
    state[12] ^= rotateLeft((state[15] + state[14]) >>> 0, 7);
    state[13] ^= rotateLeft((state[12] + state[15]) >>> 0, 9);
    state[14] ^= rotateLeft((state[13] + state[12]) >>> 0, 13);
    state[15] ^= rotateLeft((state[14] + state[13]) >>> 0, 18);
  }

  for (let index = 0; index < 16; index += 1) writeUint32(output, index * 4, (state[index] + initial[index]) >>> 0);
}

function blockMix(input: Uint8Array, output: Uint8Array, blockSize: number, workspace: SalsaWorkspace): void {
  const x = new Uint8Array(SALSA_BLOCK_BYTES);
  x.set(input.subarray(input.length - SALSA_BLOCK_BYTES));

  for (let index = 0; index < blockSize * 2; index += 1) {
    const inputOffset = index * SALSA_BLOCK_BYTES;
    salsa208Xor(input, inputOffset, x, workspace.output, workspace);
    x.set(workspace.output);
    const outputBlock = index % 2 === 0 ? index / 2 : blockSize + (index - 1) / 2;
    output.set(x, outputBlock * SALSA_BLOCK_BYTES);
  }
}

function integerify(input: Uint8Array, blockSize: number): number {
  return readUint32(input, (2 * blockSize - 1) * SALSA_BLOCK_BYTES);
}

function validateOptions(options: ScryptOptions): void {
  const { cost, blockSize, parallelization, keyLength } = options;
  if (!Number.isSafeInteger(cost) || cost <= 1 || (cost & (cost - 1)) !== 0) throw new Error('scrypt cost must be a power of two greater than one');
  if (!Number.isSafeInteger(blockSize) || blockSize <= 0) throw new Error('scrypt block size must be positive');
  if (!Number.isSafeInteger(parallelization) || parallelization <= 0) throw new Error('scrypt parallelization must be positive');
  if (!Number.isSafeInteger(keyLength) || keyLength <= 0) throw new Error('scrypt key length must be positive');
}

async function pbkdf2Sha256(password: Uint8Array, salt: Uint8Array, byteLength: number): Promise<Uint8Array> {
  const passwordBuffer = new ArrayBuffer(password.byteLength);
  new Uint8Array(passwordBuffer).set(password);
  const saltBuffer = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuffer).set(salt);
  const key = await globalThis.crypto.subtle.importKey('raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await globalThis.crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBuffer, iterations: 1 }, key, byteLength * 8);
  return new Uint8Array(bits);
}

function xorInto(target: Uint8Array, source: Uint8Array): void {
  for (let index = 0; index < target.length; index += 1) target[index] ^= source[index];
}

function romix(input: Uint8Array, cost: number, blockSize: number): Uint8Array {
  const blockLength = 128 * blockSize;
  let x = input.slice();
  let y = new Uint8Array(blockLength);
  const v = new Uint8Array(cost * blockLength);
  const mix = new Uint8Array(blockLength);
  const workspace: SalsaWorkspace = { state: new Uint32Array(16), initial: new Uint32Array(16), output: new Uint8Array(SALSA_BLOCK_BYTES) };

  for (let index = 0; index < cost; index += 1) {
    v.set(x, index * blockLength);
    blockMix(x, y, blockSize, workspace);
    [x, y] = [y, x];
  }

  for (let index = 0; index < cost; index += 1) {
    const block = (integerify(x, blockSize) & (cost - 1)) * blockLength;
    mix.set(x);
    xorInto(mix, v.subarray(block, block + blockLength));
    blockMix(mix, y, blockSize, workspace);
    [x, y] = [y, x];
  }

  return x;
}

export async function deriveScrypt(password: Uint8Array, salt: Uint8Array, options: ScryptOptions): Promise<Uint8Array> {
  validateOptions(options);
  const { cost, blockSize, parallelization, keyLength } = options;
  const blockLength = 128 * blockSize;
  const initial = await pbkdf2Sha256(password, salt, parallelization * blockLength);
  const mixed = new Uint8Array(initial.length);

  for (let index = 0; index < parallelization; index += 1) {
    const start = index * blockLength;
    mixed.set(romix(initial.subarray(start, start + blockLength), cost, blockSize), start);
  }

  return pbkdf2Sha256(password, mixed, keyLength);
}
