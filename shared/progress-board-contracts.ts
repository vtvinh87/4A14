export const PROGRESS_BOARD_SCHEMA_VERSION = 1 as const;
export const PROGRESS_BOARD_RULE_VERSION = 'progress-board-v1' as const;

export type ProgressState = 'not_started' | 'explored' | 'practicing' | 'independent';
export type ProgressBoardNextAction = 'explore' | 'practice' | 'review' | 'celebrate';

export type ProgressBoardContentLesson = {
  lessonId: string;
  lessonVersion: number;
  title: string;
  topic: string;
  missionIds: string[];
  objectiveIds: string[];
  published: boolean;
};

export type ProgressBoardContentObjective = {
  objectiveId: string;
  lessonId: string;
  label: string;
  activityIds: string[];
  minIndependentActivities: number;
  published: boolean;
};

export type ProgressBoardContentIndex = {
  schemaVersion: typeof PROGRESS_BOARD_SCHEMA_VERSION;
  ruleVersion: typeof PROGRESS_BOARD_RULE_VERSION;
  contentVersion: string;
  generatedAt: string;
  lessons: ProgressBoardContentLesson[];
  objectives: ProgressBoardContentObjective[];
};

export type ProgressBoardObjective = {
  objectiveId: string;
  label: string;
  state: ProgressState;
  practicedActivityCount: number;
  independentActivityCount: number;
  nextAction: ProgressBoardNextAction;
};

export type ProgressBoardLesson = {
  lessonId: string;
  title: string;
  topic: string;
  completed: boolean;
  state: ProgressState;
  completedMissionCount: number;
  missionCount: number;
  objectives: ProgressBoardObjective[];
  nextAction: ProgressBoardNextAction;
};

export type ProgressBoardTopic = {
  topic: string;
  lessons: ProgressBoardLesson[];
};

export type ProgressBoardSummary = {
  exploredLessonCount: number;
  completedLessonCount: number;
  independentObjectiveCount: number;
  nextLessonId: string | null;
};

export type ProgressBoardData = {
  schemaVersion: typeof PROGRESS_BOARD_SCHEMA_VERSION;
  ruleVersion: typeof PROGRESS_BOARD_RULE_VERSION;
  contentVersion: string;
  generation: string;
  generatedAt: string;
  lastSyncedAt: string;
  stale: boolean;
  summary: ProgressBoardSummary;
  topics: ProgressBoardTopic[];
  nextLessonId: string | null;
};

export type ProgressBoardRolloutConfig = {
  enabled: boolean;
};

export type ProgressBoardRolloutResponse = {
  config: ProgressBoardRolloutConfig;
};
