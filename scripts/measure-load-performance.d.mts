export function percentile(values: number[], rank?: number): number;
export function p95(values: number[]): number;
export function parseServerTiming(header: string): Record<string, number>;
export function redactSensitiveText(value: string, token?: string): string;
export function validateLocalBaseUrl(value: string): URL;
