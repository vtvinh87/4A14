#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const LOCALHOST_NAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export function percentile(values, rank = 0.95) {
  if (!Array.isArray(values) || values.length === 0) throw new Error('percentile requires at least one value');
  if (!Number.isFinite(rank) || rank <= 0 || rank > 1) throw new Error('percentile rank must be in (0, 1]');
  if (values.some((value) => !Number.isFinite(value))) throw new Error('percentile values must be finite');
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(rank * sorted.length) - 1];
}

export function p95(values) {
  return percentile(values, 0.95);
}

export function parseServerTiming(header) {
  const timing = {};
  if (!header) return timing;
  for (const entry of header.split(',')) {
    const [namePart, ...parameters] = entry.trim().split(';');
    const name = namePart?.trim() ?? '';
    const durationParameter = parameters.find((parameter) => /^\s*dur\s*=/i.test(parameter));
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name) || !durationParameter) continue;
    const duration = Number(durationParameter.split('=').slice(1).join('=').trim());
    if (Number.isFinite(duration) && duration >= 0) timing[name] = duration;
  }
  return timing;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function redactSensitiveText(value, token = '') {
  let redacted = String(value);
  if (token) redacted = redacted.replace(new RegExp(escapeRegExp(token), 'g'), '[REDACTED]');
  redacted = redacted.replace(/\b(?:authorization|cookie|x-parent-grant)\s*[:=]\s*[^\s,}]+/gi, (match) => `${match.slice(0, match.search(/[:=]/))}=[REDACTED]`);
  redacted = redacted.replace(/\bbody\s*=\s*.+$/i, 'body=[REDACTED]');
  return redacted;
}

export function validateLocalBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Benchmark base URL must be a valid localhost URL');
  }
  if (!['http:', 'https:'].includes(url.protocol) || !LOCALHOST_NAMES.has(url.hostname)) {
    throw new Error('Benchmark base URL must target localhost');
  }
  return url;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument?.startsWith('--')) throw new Error(`Unknown argument: ${argument}`);
    const key = argument.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    args[key] = value;
    index += 1;
  }
  const baseUrl = args['base-url'];
  const route = args.route;
  const samples = Number(args.samples ?? 30);
  const output = args.output;
  if (!baseUrl || !route || !output) throw new Error('Usage: --base-url <localhost> --route </api/...> --samples <n> --output <file>');
  if (!route.startsWith('/')) throw new Error('Benchmark route must start with /');
  if (!Number.isInteger(samples) || samples < 1 || samples > 1000) throw new Error('Benchmark samples must be an integer from 1 to 1000');
  return { baseUrl: validateLocalBaseUrl(baseUrl), route, samples, output };
}

function errorClass(error) {
  return error instanceof Error && error.name ? error.name : 'Error';
}

export async function runBenchmark({ baseUrl, route, samples, token = '', fetchImpl = globalThis.fetch }) {
  const validatedBaseUrl = baseUrl instanceof URL ? validateLocalBaseUrl(baseUrl.href) : validateLocalBaseUrl(baseUrl);
  const requestUrl = new URL(route, validatedBaseUrl);
  const measurements = [];
  for (let iteration = 1; iteration <= samples; iteration += 1) {
    const startedAt = performance.now();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const response = await fetchImpl(requestUrl, { method: 'GET', headers });
      measurements.push({
        route: route,
        iteration,
        status: response.status,
        totalMs: Number((performance.now() - startedAt).toFixed(3)),
        serverTiming: parseServerTiming(response.headers?.get?.('Server-Timing') ?? ''),
        ...(response.ok ? {} : { errorClass: `HTTP_${response.status}` }),
      });
    } catch (error) {
      measurements.push({
        route: route,
        iteration,
        status: null,
        totalMs: Number((performance.now() - startedAt).toFixed(3)),
        serverTiming: {},
        errorClass: errorClass(error),
      });
    }
  }
  const durations = measurements.map((measurement) => measurement.totalMs);
  const successful = measurements.filter((measurement) => measurement.status !== null && measurement.status >= 200 && measurement.status < 400);
  return {
    schemaVersion: 1,
    route,
    sampleCount: measurements.length,
    errorCount: measurements.length - successful.length,
    summary: {
      medianMs: percentile(durations, 0.5),
      p95Ms: p95(durations),
    },
    measurements,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runBenchmark({
    ...options,
    token: process.env.HOC_VUI_BENCH_TOKEN ?? '',
  });
  await mkdir(dirname(resolve(options.output)), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`${redactSensitiveText(error instanceof Error ? error.message : String(error), process.env.HOC_VUI_BENCH_TOKEN ?? '')}\n`);
    process.exitCode = 1;
  });
}
