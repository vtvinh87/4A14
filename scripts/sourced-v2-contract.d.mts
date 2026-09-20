export function buildCatalogTargets(catalog: { cues: Array<{ id: string; variants: number }> }): Array<{ id: string; variant: number }>;
export function buildSourcedV2Gap(catalog: unknown, runtimeEntries: unknown[], expectedTargetCount?: number): {
  catalogTargetCount: number;
  currentRuntimeCount: number;
  missingTargetCount: number;
  missingTargets: Array<{ id: string; variant: number }>;
  laneCounts: Record<string, number>;
  laneCues: Record<string, string[]>;
};
export function getLaneForCue(cueId: string): string | null;
