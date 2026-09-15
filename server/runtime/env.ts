type RuntimeGlobal = typeof globalThis & {
  Deno?: { env?: { get: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

/** Read server configuration in both the Node and Deno runtimes. */
export function getEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobal;
  try {
    const denoValue = runtime.Deno?.env?.get(name);
    if (denoValue !== undefined) return denoValue;
  } catch {
    // Deno can deny environment access when a local check omits --allow-env.
  }
  return runtime.process?.env?.[name];
}
