import { useEffect, useRef, useState } from 'react';
import { ArrowIcon, BookIcon, CheckIcon, ChevronIcon, InfoIcon, SparkIcon } from '../components/icons';
import { MatchBoard } from '../components/games/MatchBoard';
import {
  DiscoveryReveal,
  ExpeditionChoice,
  OrderRouteBuilder,
  SatchelSelect,
} from '../components/expedition/ExpeditionInteractions';
import { getLessonPackage } from '../content/packages';
import { getStampArtifact } from '../content/stampArtifacts';
import { formatTextbookReference } from '../content/textbookGuide';
import type { Activity, Lesson, Response, Session, SourceRef } from '../content/types';
import { getCurrentActivity, type SessionEvent } from '../game/session';
import { getLessonHeroTitle, getLessonSummary, type MvpLessonId } from '../content/catalog';
import { getLessonArtwork } from '../content/lessonArtwork';
import { getLessonPetCue, getPetTapCue, type LessonPetContext } from '../motion/petConversation';
import { Pet } from '../components/Pet';
import './lesson-play.css';

export type LessonViewProps = {
  lessonId: MvpLessonId;
  session: Session | null;
  completedMissions: string[];
  reducedMotion: boolean;
  onSessionEvent: (event: SessionEvent) => void;
  onBack: () => void;
  onPetThink: () => void;
  onPetCelebrate: () => void;
};

export function typeLabel(activity: Activity): string {
  if (activity.type === 'choice') return 'Quyết định';
  if (activity.type === 'match') return 'Nối manh mối';
  if (activity.type === 'order') return 'Dựng tuyến đường';
  return 'Nhặt manh mối';
}

export function SourceReferences({ references }: { references: SourceRef[] }) {
  const unique = references.filter((reference, index) => references.findIndex((item) => JSON.stringify(item) === JSON.stringify(reference)) === index);
  return (
    <details className="source-reference expedition-source-reference">
      <summary><BookIcon size={16} /> Xem trong SGK</summary>
      <div className="source-reference-list">
        {unique.map((reference) => (
          <small
            key={`${reference.sourceId}-${reference.pdfPage}-${reference.printedPage}-${reference.locator}`}
            data-source-id={reference.sourceId}
          >
            {formatTextbookReference(reference)}
          </small>
        ))}
      </div>
    </details>
  );
}

export function getSourceReferences(activity: Activity): SourceRef[] {
  return activity.sourceRefs?.length ? activity.sourceRefs : [activity.source];
}

export function lessonSourceLabel(_lesson: Lesson): string {
  return 'Tra cứu cùng SGK';
}

function TrailProgress({ lesson, session, completedMissions, stampName }: {
  lesson: Lesson;
  session: Session | null;
  completedMissions: string[];
  stampName: string;
}) {
  const isComplete = session?.stage === 'lessonComplete';
  const completedCount = lesson.missions.filter((item) => completedMissions.includes(item.id)).length;
  const stageLabel = !session ? 'Sẵn sàng khám phá' : isComplete ? 'Đã tới đích' : session.stage === 'discover' ? 'Mở manh mối' : session.stage === 'answer' ? 'Tìm đường' : session.stage === 'feedback' ? 'Đối chiếu dấu vết' : 'Nhận dấu';
  return (
    <aside className="step-rail expedition-trail" aria-label="Tiến độ đường đi">
      <div className="trail-heading">
        <div>
          <p className="expedition-kicker">ĐƯỜNG ĐI</p>
          <strong>{completedCount}/{lesson.missions.length} nhiệm vụ đã xong</strong>
        </div>
        <span className="trail-stage" data-task-stage>{stageLabel}</span>
      </div>
      <div className="trail-destination">
        <span className="trail-destination-dot" aria-hidden="true" />
        <span>Đích đến: <strong>{stampName}</strong></span>
      </div>
      <ol className="trail-nodes">
        {lesson.missions.map((mission, index) => {
          const current = session?.missionIndex === index && !isComplete;
          const completed = completedMissions.includes(mission.id);
          return (
            <li className={`step-item trail-node${current ? ' is-active' : ''}${completed ? ' is-complete' : ''}`} data-trail-node={index} aria-current={current ? 'step' : undefined} key={mission.id}>
              <span className="step-number">{completed ? <CheckIcon size={17} /> : String(index + 1).padStart(2, '0')}</span>
              <span className="step-copy"><strong>{mission.title}</strong><small>{completed ? 'Đã nhận dấu nhiệm vụ' : current ? stageLabel : 'Chưa mở'}</small></span>
              {current && <ChevronIcon direction="right" size={16} />}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function IntroPanel({ lesson, stamp, onStart }: { lesson: Lesson; stamp: ReturnType<typeof getStampArtifact>; onStart: () => void }) {
  return (
    <div className="lesson-panel-content expedition-intro-panel">
      <div className="expedition-intro-layout">
        <div>
          <p className="expedition-kicker">MỞ BẢN ĐỒ</p>
          <h2>Chọn manh mối đầu tiên rồi lên đường.</h2>
          <p>Mỗi nhiệm vụ bắt đầu bằng một mẩu tư liệu ngắn. Con tự mở, tự suy nghĩ và không bị tính giờ.</p>
          <div className="objective-list expedition-objectives">
            {lesson.objectives.slice(0, 3).map((objective) => <span key={objective.id}><CheckIcon size={16} /> {objective.text}</span>)}
          </div>
          <button className="primary-small-button expedition-action-button" type="button" onClick={onStart}>Bắt đầu khám phá <ArrowIcon size={18} /></button>
        </div>
        <figure className="intro-stamp-figure">
          <img src={stamp.src} alt={stamp.alt} />
          <figcaption><strong>{stamp.name}</strong><span>{stamp.region}</span></figcaption>
        </figure>
      </div>
    </div>
  );
}

function LessonPet({ context, reducedMotion }: { context: LessonPetContext; reducedMotion: boolean }) {
  const cue = getLessonPetCue(context);
  const [tapCount, setTapCount] = useState(0);
  const [tapped, setTapped] = useState(false);
  const [followUp, setFollowUp] = useState(false);
  useEffect(() => {
    setTapped(false);
    setFollowUp(false);
    const timer = window.setTimeout(() => setFollowUp(true), 12000);
    return () => window.clearTimeout(timer);
  }, [cue.key]);
  useEffect(() => {
    if (!tapped) return;
    const timer = window.setTimeout(() => setTapped(false), 8000);
    return () => window.clearTimeout(timer);
  }, [tapped, tapCount]);
  const playful = [getPetTapCue(context).message, 'Tớ vừa kiểm tra ba lô: có la bàn, có bánh… và có một đồng đội rất cừ là cậu!', 'Đuôi tớ đang vẫy cổ vũ đây! Mình cứ thong thả, tìm từng manh mối nhé.'];
  return <aside className="lesson-pet-companion" aria-label="Cáo Nhỏ đồng hành" data-lesson-pet>
    <Pet size="compact" mood={tapped ? 'greet' : cue.mood} reducedMotion={reducedMotion}
      message={tapped ? playful[(tapCount - 1) % playful.length] : followUp && cue.followUpMessage ? cue.followUpMessage : cue.message}
      onTap={() => { setTapCount(count => count + 1); setTapped(true); }} />
  </aside>;
}

function ActivityHeader({ activity, session, activityTotal }: { activity: Activity; session: Session; activityTotal: number }) {
  return (
    <div className="activity-heading expedition-task-heading">
      <div>
        <p className="expedition-kicker">THỬ THÁCH · {session.activityIndex + 1}/{activityTotal}</p>
        <h2>{activity.prompt}</h2>
      </div>
      <span className="activity-type-pill">{typeLabel(activity)}</span>
    </div>
  );
}

function ActivityPanel({
  activity,
  session,
  activityTotal,
  onSubmit,
  onHint,
  choiceId,
  onChoice,
  matchPairs,
  selectedLeft,
  selectedRight,
  onMatchLeft,
  onMatchRight,
  onMatchConnect,
  orderIds,
  onOrderPlace,
  onOrderUndo,
  onOrderMove,
  selectIds,
  onSelectToggle,
}: {
  activity: Activity;
  session: Session;
  activityTotal: number;
  onSubmit: () => void;
  onHint: () => void;
  choiceId: string | null;
  onChoice: (id: string) => void;
  matchPairs: [string, string][];
  selectedLeft: string | null;
  selectedRight: string | null;
  onMatchLeft: (id: string) => void;
  onMatchRight: (id: string) => void;
  onMatchConnect: (leftId: string, rightId: string) => void;
  orderIds: string[];
  onOrderPlace: (id: string) => void;
  onOrderUndo: () => void;
  onOrderMove: (index: number, delta: number) => void;
  selectIds: string[];
  onSelectToggle: (id: string) => void;
}) {
  const canSubmit = activity.type === 'choice'
    ? choiceId !== null
    : activity.type === 'match'
      ? matchPairs.length === activity.pairs.length
      : activity.type === 'order'
        ? orderIds.length === activity.items.length
        : selectIds.length === activity.correctIds.length && activity.correctIds.length > 0;

  return (
    <div className="lesson-panel-content expedition-task-panel" data-task-panel data-activity-type={activity.type}>
      <ActivityHeader activity={activity} session={session} activityTotal={activityTotal} />
      <div className="task-brief">
        <span className="task-brief-pin" aria-hidden="true">⌖</span>
        <span>Con tự chọn đường đi. Kiểm tra chỉ mở khi con đã sẵn sàng.</span>
      </div>
      <SourceReferences references={getSourceReferences(activity)} />
      {activity.contextTable && (
        <div className="source-table-wrap expedition-table-wrap">
          <table className="source-table">
            <caption>{activity.contextTable.caption}</caption>
            <thead><tr>{activity.contextTable.columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead>
            <tbody>{activity.contextTable.rows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th><td>{row.value}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {activity.type === 'choice' && <ExpeditionChoice activity={activity} selectedId={choiceId} onSelect={onChoice} />}
      {activity.type === 'match' && <MatchBoard activity={activity} pairs={matchPairs} selectedLeft={selectedLeft} selectedRight={selectedRight} onLeft={onMatchLeft} onRight={onMatchRight} onConnect={onMatchConnect} />}
      {activity.type === 'order' && <OrderRouteBuilder activity={activity} placedIds={orderIds} onPlace={onOrderPlace} onUndo={onOrderUndo} onMove={onOrderMove} />}
      {activity.type === 'select' && <SatchelSelect activity={activity} selectedIds={selectIds} onToggle={onSelectToggle} />}
      {session.hintUsed && <div className="hint-callout expedition-hint"><SparkIcon size={18} /><span><strong>Gợi ý:</strong> {activity.hint}</span></div>}
      <div className="activity-actions expedition-task-actions">
        <button className="secondary-button" type="button" onClick={onHint} disabled={session.hintUsed}><SparkIcon size={17} /> {session.hintUsed ? 'Đã dùng gợi ý' : 'Xin gợi ý'}</button>
        <button className="primary-small-button expedition-action-button" type="button" onClick={onSubmit} disabled={!canSubmit} data-check-answer>Kiểm tra dấu vết <CheckIcon size={18} /></button>
      </div>
    </div>
  );
}

function isGeneratedExpeditionChoice(activity: Activity): activity is Extract<Activity, { type: 'choice' }> {
  return activity.type === 'choice' && /^lesson-\d{2}-m[45]-a1$/.test(activity.id);
}

function getFeedbackCopy(activity: Activity): { answer: string | null; explanation: string } {
  if (!isGeneratedExpeditionChoice(activity)) return { answer: null, explanation: activity.explanation };
  const correctOption = activity.options.find((option) => option.id === activity.correctId);
  return {
    answer: correctOption?.text ?? null,
    explanation: activity.explanation.replace(/^Theo tư liệu của bài, đáp án đúng là/, 'Dữ kiện cần nhớ là'),
  };
}

function FeedbackPanel({ activity, session, stamp, activityTotal, onNext, onRetry }: {
  activity: Activity;
  session: Session;
  stamp: ReturnType<typeof getStampArtifact>;
  activityTotal: number;
  onNext: () => void;
  onRetry: () => void;
}) {
  const evaluation = session.lastEvaluation;
  const correct = Boolean(evaluation?.correct && !evaluation.invalid);
  if (correct) {
    const feedbackCopy = getFeedbackCopy(activity);
    return (
      <div className="lesson-panel-content expedition-success-panel" data-success-presentation>
        <p className="expedition-kicker">DẤU VẾT KHỚP RỒI</p>
        <h2>Con đã mở thêm một đoạn đường.</h2>
        {feedbackCopy.answer && <p className="feedback-answer" data-feedback-answer><strong>Đáp án:</strong> {feedbackCopy.answer}</p>}
        <p>{feedbackCopy.explanation}</p>
        <div className="success-progress" role="status" aria-live="polite">
          <span className="success-progress-number">{session.activityIndex + 1}/{activityTotal}</span>
          <span>bước trong nhiệm vụ đã khớp</span>
        </div>
        <figure className="success-stamp-figure"><img src={stamp.src} alt={stamp.alt} /><figcaption>{stamp.name}</figcaption></figure>
        <button className="primary-small-button expedition-action-button" type="button" onClick={onNext}>Sang bước tiếp <ArrowIcon size={18} /></button>
      </div>
    );
  }
  return (
    <div className="lesson-panel-content expedition-retry-panel" data-retry-presentation>
      <div className="retry-mark" aria-hidden="true"><SparkIcon size={28} /></div>
      <p className="expedition-kicker">MÌNH DÒ LẠI NHÉ</p>
      <h2>Đường đi chưa khớp lần này.</h2>
      <p>{evaluation?.invalid ? 'Một vài thẻ còn thiếu hoặc bị lặp. Con có thể bình tĩnh sửa lại.' : getFeedbackCopy(activity).explanation}</p>
      <div className="hint-callout expedition-hint"><SparkIcon size={18} /><span><strong>Gợi ý:</strong> {activity.hint}</span></div>
      <div className="feedback-source"><SourceReferences references={getSourceReferences(activity)} /></div>
      <button className="primary-small-button expedition-action-button" type="button" onClick={onRetry}>Dò lại hoạt động <ArrowIcon size={18} /></button>
    </div>
  );
}

function MissionCompletePanel({ missionTitle, stamp, completedCount, missionTotal, isLastMission, onNext }: {
  missionTitle: string;
  stamp: ReturnType<typeof getStampArtifact>;
  completedCount: number;
  missionTotal: number;
  isLastMission: boolean;
  onNext: () => void;
}) {
  return (
    <div className="lesson-panel-content expedition-success-panel mission-complete-panel" data-mission-complete>
      <p className="expedition-kicker">NHIỆM VỤ ĐÃ GHI DẤU</p>
      <h2>{missionTitle}</h2>
      <p>Đường đi đã được lưu. Mỗi dấu chỉ nhận một lần, con có thể bước tiếp thật thong thả.</p>
      <div className="success-progress"><span className="success-progress-number">{completedCount}/{missionTotal}</span><span>nhiệm vụ trên bản đồ</span></div>
      <figure className="success-stamp-figure"><img src={stamp.src} alt={stamp.alt} /><figcaption>{stamp.name}</figcaption></figure>
      <button className="primary-small-button expedition-action-button" type="button" onClick={onNext}>{isLastMission ? 'Xem về đích' : 'Mở nhiệm vụ tiếp theo'} <ArrowIcon size={18} /></button>
    </div>
  );
}

function LessonCompletePanel({ stamp, onBack, onRestart }: { stamp: ReturnType<typeof getStampArtifact>; onBack: () => void; onRestart: () => void }) {
  return (
    <div className="lesson-panel-content expedition-success-panel lesson-complete-panel" data-lesson-complete>
      <p className="expedition-kicker">ĐÃ TỚI ĐÍCH</p>
      <h2>Hộ chiếu đã có dấu của chặng này.</h2>
      <p>Tiến độ và dấu đã được lưu trên thiết bị. Con có thể xem lại đường đi hoặc chọn một chặng mới.</p>
      <figure className="success-stamp-figure"><img src={stamp.src} alt={stamp.alt} /><figcaption>{stamp.name} · {stamp.region}</figcaption></figure>
      <div className="completion-actions"><button className="primary-small-button expedition-action-button" type="button" onClick={onBack}>Xem các bài học <ArrowIcon size={18} /></button><button className="secondary-button" type="button" onClick={onRestart}>Học lại chặng</button></div>
    </div>
  );
}

export function LessonView({ lessonId, session, completedMissions, reducedMotion, onSessionEvent, onBack, onPetThink, onPetCelebrate }: LessonViewProps) {
  const lesson = getLessonPackage(lessonId);
  const lessonSummary = getLessonSummary(lessonId);
  const heroArtwork = getLessonArtwork(lessonId);
  const heroTitle = getLessonHeroTitle(lessonId);
  const stamp = getStampArtifact(lessonId);
  const lessonNumber = lessonId.slice(-2);
  const mission = lesson.missions[session?.missionIndex ?? 0] ?? lesson.missions[0];
  const activity = session ? getCurrentActivity(session, lesson) : null;
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const [matchPairs, setMatchPairs] = useState<[string, string][]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [orderTouched, setOrderTouched] = useState(false);
  const [selectIds, setSelectIds] = useState<string[]>([]);
  const previousActivityId = useRef<string | null>(null);
  const previousStage = useRef<Session['stage'] | null>(session?.stage ?? null);
  const celebratedAttempt = useRef<number>(-1);

  const resetActivityInput = () => {
    setChoiceId(null);
    setMatchPairs([]);
    setSelectedLeft(null);
    setSelectedRight(null);
    setOrderIds([]);
    setOrderTouched(false);
    setSelectIds([]);
  };

  useEffect(() => {
    if (activity?.id !== previousActivityId.current) {
      previousActivityId.current = activity?.id ?? null;
      resetActivityInput();
    }
  }, [activity?.id]);

  useEffect(() => {
    if (previousStage.current === 'feedback' && session?.stage === 'answer') resetActivityInput();
    previousStage.current = session?.stage ?? null;
  }, [session?.stage]);

  useEffect(() => {
    if (session?.stage === 'feedback' && session.lastEvaluation?.correct && celebratedAttempt.current !== session.attempts.length) {
      celebratedAttempt.current = session.attempts.length;
      onPetCelebrate();
    }
  }, [onPetCelebrate, session?.attempts.length, session?.lastEvaluation?.correct, session?.stage]);

  const submitAnswer = () => {
    if (!activity) return;
    let response: Response;
    if (activity.type === 'choice') {
      if (!choiceId) return;
      response = { type: 'choice', optionId: choiceId };
    } else if (activity.type === 'match') {
      response = { type: 'match', pairs: matchPairs };
    } else if (activity.type === 'order') {
      response = { type: 'order', ids: orderIds };
    } else {
      response = { type: 'select', optionIds: selectIds };
    }
    onSessionEvent({ type: 'ANSWER', response });
    onPetThink();
  };

  const connectMatch = (leftId: string, rightId: string) => {
    setMatchPairs((current) => [...current.filter(([left, right]) => left !== leftId && right !== rightId), [leftId, rightId]]);
    setSelectedLeft(null);
    setSelectedRight(null);
  };

  const selectMatchLeft = (id: string) => {
    const current = matchPairs.find((pair) => pair[0] === id);
    if (current) {
      setMatchPairs((pairs) => pairs.filter(([left]) => left !== id));
      setSelectedLeft(null);
      setSelectedRight(null);
      return;
    }
    if (selectedRight) {
      connectMatch(id, selectedRight);
      return;
    }
    setSelectedLeft(selectedLeft === id ? null : id);
  };

  const selectMatchRight = (id: string) => {
    const current = matchPairs.find((pair) => pair[1] === id);
    if (current) {
      setMatchPairs((pairs) => pairs.filter(([, right]) => right !== id));
      setSelectedLeft(null);
      setSelectedRight(null);
      return;
    }
    if (selectedLeft) {
      connectMatch(selectedLeft, id);
      return;
    }
    setSelectedRight(selectedRight === id ? null : id);
  };

  const placeOrder = (id: string) => {
    setOrderTouched(true);
    setOrderIds((ids) => ids.includes(id) ? ids : [...ids, id]);
  };

  const undoOrder = () => {
    setOrderTouched(true);
    setOrderIds((ids) => ids.slice(0, -1));
  };

  const moveOrder = (index: number, delta: number) => {
    const nextIndex = index + delta;
    setOrderTouched(true);
    setOrderIds((ids) => {
      if (nextIndex < 0 || nextIndex >= ids.length) return ids;
      const next = [...ids];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  };

  const completedCount = lesson.missions.filter((item) => completedMissions.includes(item.id)).length;
  const isComplete = session?.stage === 'lessonComplete';
  const lessonPetContext: LessonPetContext = {
    stage: session?.stage ?? 'idle',
    mission,
    activity,
    activityIndex: session?.activityIndex ?? 0,
    activityTotal: mission.activities.length,
    hintUsed: session?.hintUsed ?? false,
    evaluation: session?.lastEvaluation ?? null,
    selectedChoiceText: activity?.type === 'choice' ? activity.options.find((option) => option.id === choiceId)?.text ?? null : null,
    matchPairCount: activity?.type === 'match' ? matchPairs.length : 0,
    matchPairTotal: activity?.type === 'match' ? activity.pairs.length : 0,
    hasMatchSelection: selectedLeft !== null || selectedRight !== null,
    orderTouched,
    isLastMission: (session?.missionIndex ?? 0) === lesson.missions.length - 1,
  };


  return (
    <section className="content-view lesson-view lesson-play-shell" aria-labelledby="lesson-title" data-reduced-motion={reducedMotion ? 'true' : 'false'}>
      <div className="lesson-hero-card expedition-hero-card">
        <div className="lesson-hero-art">
          <img className="lesson-hero-art-image" data-lesson-hero-art src={heroArtwork.src} alt={heroArtwork.alt} loading="eager" decoding="async" style={{ objectPosition: heroArtwork.objectPosition ?? '50% 50%' }} />
          <span className="lesson-hero-number" data-lesson-hero-number aria-hidden="true">{lessonNumber}</span>
        </div>
        <div className="lesson-hero-copy">
          <p className="lesson-hero-kicker">{lessonSummary.eyebrow} · BÀI {lessonNumber}</p>
          <h1 id="lesson-title" aria-label={lesson.title} title={lesson.title} data-full-title={lesson.title}>{heroTitle}</h1>
          <p className="lesson-hero-lead">Theo dấu tư liệu, dựng tuyến đường và nhận dấu {stamp.name} khi tới đích.</p>
          <div className="source-chip"><BookIcon size={17} /><span>{lessonSourceLabel(lesson)}</span><InfoIcon size={16} /></div>
        </div>
        <div className="hero-destination-badge"><img src={stamp.src} alt="" aria-hidden="true" /><span>{stamp.name}</span></div>
      </div>

      <div className="lesson-workspace expedition-workspace">
        <TrailProgress lesson={lesson} session={session} completedMissions={completedMissions} stampName={stamp.name} />
        <div className="lesson-panel expedition-panel">
          <LessonPet context={lessonPetContext} reducedMotion={reducedMotion} />
          {!session && <IntroPanel lesson={lesson} stamp={stamp} onStart={() => onSessionEvent({ type: 'START', sessionId: `${lesson.id}-${Date.now()}` })} />}
          {session?.stage === 'discover' && <div className="lesson-panel-content"><DiscoveryReveal mission={mission} stamp={stamp} renderSource={(source) => <SourceReferences references={[source]} />} onDone={() => onSessionEvent({ type: 'DISCOVERY_DONE' })} /></div>}
          {session?.stage === 'answer' && activity && <ActivityPanel activity={activity} session={session} activityTotal={mission.activities.length} onSubmit={submitAnswer} onHint={() => { onSessionEvent({ type: 'HINT' }); onPetThink(); }} choiceId={choiceId} onChoice={setChoiceId} matchPairs={matchPairs} selectedLeft={selectedLeft} selectedRight={selectedRight} onMatchLeft={selectMatchLeft} onMatchRight={selectMatchRight} onMatchConnect={connectMatch} orderIds={orderIds} onOrderPlace={placeOrder} onOrderUndo={undoOrder} onOrderMove={moveOrder} selectIds={selectIds} onSelectToggle={toggleSelect} />}
          {session?.stage === 'feedback' && activity && <FeedbackPanel activity={activity} session={session} stamp={stamp} activityTotal={mission.activities.length} onNext={() => onSessionEvent({ type: 'NEXT' })} onRetry={() => onSessionEvent({ type: 'NEXT' })} />}
          {session?.stage === 'missionComplete' && <MissionCompletePanel missionTitle={mission.title} stamp={stamp} completedCount={completedCount} missionTotal={lesson.missions.length} isLastMission={session.missionIndex === lesson.missions.length - 1} onNext={() => onSessionEvent({ type: 'NEXT' })} />}
          {session?.stage === 'lessonComplete' && <LessonCompletePanel stamp={stamp} onBack={onBack} onRestart={() => onSessionEvent({ type: 'START', sessionId: `${lesson.id}-${Date.now()}` })} />}
        </div>
      </div>
    </section>
  );
}
