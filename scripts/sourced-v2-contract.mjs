const LANE_CUES = {
  'core-ui-learning': [
    'ui-confirm',
    'ui-back',
    'page-turn',
    'map-unfold',
    'map-select',
    'landmark-open',
    'answer-select',
    'learning-hint',
    'match-connect',
    'lesson-complete',
    'collection-open',
    'lesson-start',
    'ui-toggle',
  ],
  'reward-social-pet': [
    'item-unlock',
    'challenge-submit',
    'class-milestone',
    'reaction-positive',
    'message-send',
    'message-receive',
    'pet-elephant',
    'pet-owl',
    'pet-dragon',
    'birthday',
  ],
  'music-ambience': [
    'music-map',
    'music-focus',
    'music-cooperate',
    'ambience-garden',
    'ambience-mountain',
    'ambience-coast',
    'ambience-forest',
    'ambience-river',
    'ambience-evening',
  ],
  'existing-pilot-variants': [
    'ui-tap',
    'answer-correct',
    'answer-retry',
    'stamp-press',
    'pet-fox',
    'music-home',
  ],
};

function assertCatalog(catalog) {
  if (!catalog || !Array.isArray(catalog.cues)) {
    throw new Error('catalog must contain a cues array');
  }

  const ids = new Set();
  for (const cue of catalog.cues) {
    if (!cue || typeof cue.id !== 'string' || !cue.id) {
      throw new Error('every catalog cue needs a non-empty id');
    }
    if (ids.has(cue.id)) {
      throw new Error(`duplicate catalog cue id: ${cue.id}`);
    }
    ids.add(cue.id);
    if (!Number.isInteger(cue.variants) || cue.variants < 1) {
      throw new Error(`catalog cue ${cue.id} must have at least one integer variant`);
    }
  }
}

function assertRuntimeEntries(runtimeEntries) {
  if (!Array.isArray(runtimeEntries)) {
    throw new Error('runtime manifest must be an array');
  }
  const keys = new Set();
  for (const entry of runtimeEntries) {
    if (!entry || typeof entry.id !== 'string' || !Number.isInteger(entry.variant)) {
      throw new Error('every runtime entry needs id and integer variant');
    }
    const key = `${entry.id}#${entry.variant}`;
    if (keys.has(key)) {
      throw new Error(`duplicate runtime entry: ${key}`);
    }
    keys.add(key);
  }
}

export function buildCatalogTargets(catalog) {
  assertCatalog(catalog);
  return catalog.cues.flatMap((cue) =>
    Array.from({ length: cue.variants }, (_, index) => ({
      id: cue.id,
      variant: index + 1,
    })),
  );
}

export function buildSourcedV2Gap(catalog, runtimeEntries, expectedTargetCount) {
  const targets = buildCatalogTargets(catalog);
  assertRuntimeEntries(runtimeEntries);
  const runtimeKeys = new Set(runtimeEntries.map((entry) => `${entry.id}#${entry.variant}`));
  const missingTargets = targets.filter((target) => !runtimeKeys.has(`${target.id}#${target.variant}`));

  if (expectedTargetCount !== undefined && targets.length !== expectedTargetCount) {
    throw new Error(`expected ${expectedTargetCount} catalog targets, got ${targets.length}`);
  }

  const targetIds = new Set(targets.map((target) => target.id));
  for (const entry of runtimeEntries) {
    if (!targetIds.has(entry.id)) {
      throw new Error(`runtime entry is not in catalog: ${entry.id}#${entry.variant}`);
    }
    const cue = catalog.cues.find((candidate) => candidate.id === entry.id);
    if (entry.variant < 1 || entry.variant > cue.variants) {
      throw new Error(`runtime entry variant is outside catalog: ${entry.id}#${entry.variant}`);
    }
  }

  const laneCounts = Object.fromEntries(
    Object.entries(LANE_CUES).map(([lane, cueIds]) => [
      lane,
      missingTargets.filter((target) => cueIds.includes(target.id)).length,
    ]),
  );
  const assignedMissing = Object.values(laneCounts).reduce((sum, count) => sum + count, 0);
  if (assignedMissing !== missingTargets.length) {
    const unassigned = missingTargets.filter(
      (target) => !Object.values(LANE_CUES).some((cueIds) => cueIds.includes(target.id)),
    );
    throw new Error(`unassigned missing targets: ${unassigned.map((target) => `${target.id}#${target.variant}`).join(', ')}`);
  }

  return {
    catalogTargetCount: targets.length,
    currentRuntimeCount: runtimeEntries.length,
    missingTargetCount: missingTargets.length,
    missingTargets,
    laneCounts,
    laneCues: LANE_CUES,
  };
}

export function getLaneForCue(cueId) {
  const lane = Object.entries(LANE_CUES).find(([, cueIds]) => cueIds.includes(cueId));
  return lane?.[0] ?? null;
}

