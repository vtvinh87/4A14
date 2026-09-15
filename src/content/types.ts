export type SourceRef = {
  sourceId: 'sgk-lsdl4-sample' | 'vbt-lsdl4-2026';
  pdfPage: number;
  printedPage: number;
  locator: string;
};

export type ReviewStatus = 'draft' | 'verified';

export type ActivityBase = {
  id: string;
  objectiveId: string;
  prompt: string;
  hint: string;
  explanation: string;
  source: SourceRef;
  /** Optional additional locators when one activity draws from more than one reviewed fact. */
  sourceRefs?: SourceRef[];
  /** Optional small source-backed table shown before a data question. */
  contextTable?: {
    caption: string;
    columns: [string, string];
    rows: { label: string; value: string }[];
  };
  reviewStatus: ReviewStatus;
};

export type Choice = ActivityBase & {
  type: 'choice';
  options: { id: string; text: string }[];
  correctId: string;
};

export type Match = ActivityBase & {
  type: 'match';
  pairs: { leftId: string; left: string; rightId: string; right: string }[];
};

export type Order = ActivityBase & {
  type: 'order';
  items: { id: string; text: string }[];
  correctOrder: string[];
};

/** A lightweight multi-select challenge: the learner must identify an exact set of clues. */
export type Select = ActivityBase & {
  type: 'select';
  options: { id: string; text: string }[];
  correctIds: string[];
};

export type Activity = Choice | Match | Order | Select;

export type Mission = {
  id: string;
  title: string;
  discovery: { text: string; source: SourceRef }[];
  activities: Activity[];
};

export type LessonId =
  | 'lesson-01' | 'lesson-02' | 'lesson-03' | 'lesson-04' | 'lesson-05'
  | 'lesson-06' | 'lesson-07' | 'lesson-08' | 'lesson-09' | 'lesson-10'
  | 'lesson-11' | 'lesson-12' | 'lesson-13' | 'lesson-14' | 'lesson-15'
  | 'lesson-16' | 'lesson-17' | 'lesson-18' | 'lesson-19' | 'lesson-20'
  | 'lesson-21' | 'lesson-22' | 'lesson-23' | 'lesson-24' | 'lesson-25'
  | 'lesson-26' | 'lesson-27' | 'lesson-28' | 'lesson-29';

export type Lesson = {
  id: LessonId;
  version: number;
  title: string;
  objectives: { id: string; text: string }[];
  missions: Mission[];
};

export type Response =
  | { type: 'choice'; optionId: string }
  | { type: 'match'; pairs: [string, string][] }
  | { type: 'order'; ids: string[] }
  | { type: 'select'; optionIds: string[] };

export type Evaluation = {
  correct: boolean;
  explanation: string;
  invalid: boolean;
};

export type Attempt = {
  id: string;
  activityId: string;
  response: Response;
  hintUsed: boolean;
  correct: boolean;
  time: string;
};

export type Session = {
  id: string;
  lessonId: Lesson['id'];
  lessonVersion: number;
  missionIndex: number;
  activityIndex: number;
  stage: 'discover' | 'answer' | 'feedback' | 'missionComplete' | 'lessonComplete';
  attempts: Attempt[];
  hintUsed: boolean;
  lastEvaluation: Evaluation | null;
};

export type Progress = {
  schemaVersion: 1;
  completedMissions: string[];
  stamps: string[];
  settings: { sound: boolean; reducedMotion: boolean };
  session: Session | null;
  updatedAt: string;
};
