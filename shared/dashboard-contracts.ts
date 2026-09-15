import type { AccountProgressSnapshot, LearningEventRecord } from './learning-contracts';
import type { LessonId } from '../src/content/types';

export const DASHBOARD_RULE_VERSION = 'dashboard-rules-v1';
export type DashboardRange = '7d' | '30d' | 'all';

export type DashboardDataQuality = 'none' | 'limited' | 'ready';

export type DashboardMetrics = {
  range: DashboardRange;
  activitySample: number;
  totalAttempts: number;
  retryAttempts: number;
  firstAttemptCorrect: number;
  firstAttemptAccuracy: number | null;
  hintActivities: number;
  hintRate: number | null;
  activeDays: number;
  estimatedMinutes: number;
  completedLessons: number;
  totalLessons: number;
  completedMissions: number;
  totalMissions: number;
  stamps: number;
  totalStamps: number;
  lastActivityAt: string | null;
  dataQuality: DashboardDataQuality;
};

export type DashboardActivity = {
  key: string;
  activityId: string;
  lessonId: LessonId;
  lessonVersion: number;
  topic: string;
  attempts: number;
  firstAttemptCorrect: boolean;
  firstAttemptHintUsed: boolean;
  hintUsed: boolean;
  eventIds: string[];
  firstAttemptAt: string;
  retryCount: number;
};

export type DashboardLessonStatus = {
  lessonId: LessonId;
  title: string;
  topic: string;
  status: 'locked' | 'open' | 'in-progress' | 'complete';
  completedMissions: number;
  totalMissions: number;
};

export type DashboardSuggestion = {
  id: string;
  kind: 'insufficient' | 'strength' | 'support' | 'next';
  title: string;
  body: string;
  action: string;
  evidence: string;
  lessonId?: LessonId;
  textbookReference?: string;
  provenance: {
    ruleVersion: typeof DASHBOARD_RULE_VERSION;
    range: DashboardRange;
    activityKeys: string[];
    eventIds: string[];
    generatedAt: string;
  };
};

export type ParentDashboardData = {
  schemaVersion: 1;
  ruleVersion: typeof DASHBOARD_RULE_VERSION;
  studentId: string;
  range: DashboardRange;
  generatedAt: string;
  lastSyncedAt: string;
  snapshot: AccountProgressSnapshot;
  metrics: DashboardMetrics;
  activities: DashboardActivity[];
  lessons: DashboardLessonStatus[];
  suggestions: DashboardSuggestion[];
  events: LearningEventRecord[];
};
