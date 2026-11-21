import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  KeyRound,
  Languages,
  LogOut,
  Send,
  Star,
} from 'lucide-react';
import {
  countCompletedTeachers,
  formatDurationHms,
  formatKolkataDateTime,
  formatKolkataTime,
  getQuestionScore,
  getSessionTimeState,
  isTeacherEvaluationComplete,
  validateAllTeacherEvaluations,
} from '../shared/domain';
import {LANGUAGE_OPTIONS, PORTAL_COPY} from '../shared/i18n';
import type {
  AppLanguage,
  AuthSessionUser,
  EvaluationMap,
  NotificationItem,
  PaperInfo,
  QuestionItem,
  SessionConfig,
  Teacher,
  TeacherRatingInput,
  TraineeSubmission,
} from '../shared/types';
import {apiFetch} from '../utils/api';
import {ChangePasswordModal} from './ChangePasswordModal';

interface TraineePortalProps {
  user: AuthSessionUser;
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  onLogout: () => void;
}

interface TraineePortalResponse {
  session: SessionConfig;
  papers: PaperInfo[];
  teachers: Teacher[];
  questions: QuestionItem[];
  submission: TraineeSubmission;
  notifications: NotificationItem[];
}

function getOrderedQuestionTexts(question: QuestionItem, primaryLang: AppLanguage) {
  const entries: {code: AppLanguage; tag: string; title: string; desc?: string}[] = [
    {code: 'en', tag: 'EN', title: question.label, desc: question.description},
    ...(question.labelBn
      ? [{code: 'bn' as const, tag: 'বাংলা', title: question.labelBn, desc: question.descriptionBn}]
      : []),
    ...(question.labelHi
      ? [{code: 'hi' as const, tag: 'हिन्दी', title: question.labelHi, desc: question.descriptionHi}]
      : []),
  ];

  const primary = entries.find((e) => e.code === primaryLang) ?? entries[0];
  const secondary = entries.filter((e) => e.code !== primary.code);
  return {primary, secondary};
}

export const TraineePortal: React.FC<TraineePortalProps> = ({
  user,
  language,
  onLanguageChange,
  onLogout,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionConfig | null>(null);
  const [papers, setPapers] = useState<PaperInfo[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [submission, setSubmission] = useState<TraineeSubmission | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationMap>({});
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activePaper, setActivePaper] = useState<number>(1);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receiptNotification, setReceiptNotification] = useState<NotificationItem | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const draftTimerRef = useRef<number | null>(null);
  const t = PORTAL_COPY[language];

  const loadPortal = useCallback(async () => {
    try {
      const data = await apiFetch<TraineePortalResponse>('/api/trainee/portal');
      setSession(data.session);
      setPapers(data.papers);
      setTeachers(data.teachers);
      setQuestions(data.questions);
      setSubmission(data.submission);
      setEvaluations(data.submission.evaluations ?? {});
      setNotifications(data.notifications);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load evaluation portal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPortal();
  }, [loadPortal]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void apiFetch<TraineePortalResponse>('/api/trainee/portal')
        .then((data) => {
          setSession(data.session);
          setTeachers(data.teachers);
          setQuestions(data.questions);
          setNotifications(data.notifications);
          if (data.submission.status === 'submitted') {
            setSubmission(data.submission);
          }
        })
        .catch(() => {
          // ignore transient poll errors
        });
    }, 12000);
    return () => window.clearInterval(id);
  }, []);

  const timeState = useMemo(() => {
    return session ? getSessionTimeState(session, nowMs) : null;
  }, [session, nowMs]);

  const completedCount = useMemo(
    () => countCompletedTeachers(evaluations, teachers, questions),
    [evaluations, teachers, questions],
  );

  const activePaperTeachers = useMemo(
    () => teachers.filter((teacher) => teacher.paperNumber === activePaper),
    [teachers, activePaper],
  );

  const activePaperInfo = useMemo(
    () => papers.find((p) => p.paperNumber === activePaper) ?? null,
    [papers, activePaper],
  );

  const scheduleDraftSave = useCallback(
    (nextEvaluations: EvaluationMap) => {
      if (submission?.status === 'submitted' || !timeState?.isOpen) return;
      setSaveState('saving');
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
      }
      draftTimerRef.current = window.setTimeout(async () => {
        try {
          const res = await apiFetch<{submission: TraineeSubmission}>('/api/trainee/draft', {
            method: 'POST',
            body: JSON.stringify({evaluations: nextEvaluations}),
          });
          setSubmission(res.submission);
          setSaveState('saved');
        } catch {
          setSaveState('error');
        }
      }, 450);
    },
    [submission?.status, timeState?.isOpen],
  );

  const updateQuestionScore = (teacherId: string, questionId: string, score: number) => {
    if (submission?.status === 'submitted' || !timeState?.isOpen) return;
    setSubmitError(null);
    setEvaluations((prev) => {
      const current: TeacherRatingInput = prev[teacherId] ?? {
        teacherId,
        ratings: {},
        comment: '',
      };
      const nextRatings = {
        ...(current.ratings ?? {}),
        [questionId]: score,
      };
      const updated: EvaluationMap = {
        ...prev,
        [teacherId]: {
          ...current,
          ratings: nextRatings,
          [questionId]: score,
        },
      };
      scheduleDraftSave(updated);
      return updated;
    });
  };

  const updateTeacherComment = (teacherId: string, comment: string) => {
    if (submission?.status === 'submitted' || !timeState?.isOpen) return;
    setSubmitError(null);
    setEvaluations((prev) => {
      const current: TeacherRatingInput = prev[teacherId] ?? {
        teacherId,
        ratings: {},
        comment: '',
      };
      const updated: EvaluationMap = {
        ...prev,
        [teacherId]: {
          ...current,
          comment,
        },
      };
      scheduleDraftSave(updated);
      return updated;
    });
  };

  const applyQuickScoreToTeacher = (teacherId: string, score: number) => {
    if (submission?.status === 'submitted' || !timeState?.isOpen) return;
    setSubmitError(null);
    setEvaluations((prev) => {
      const current = prev[teacherId];
      const nextRatings: Record<string, number> = {...(current?.ratings ?? {})};
      const legacyPatch: Record<string, number> = {};
      for (const q of questions) {
        nextRatings[q.id] = score;
        legacyPatch[q.id] = score;
      }
      const updated: EvaluationMap = {
        ...prev,
        [teacherId]: {
          teacherId,
          ...legacyPatch,
          ratings: nextRatings,
          comment: current?.comment ?? '',
        },
      };
      scheduleDraftSave(updated);
      return updated;
    });
  };

  const jumpToNextUnrated = () => {
    const missing = teachers.find((teacher) => !isTeacherEvaluationComplete(evaluations[teacher.id], questions));
    if (missing) {
      setActivePaper(missing.paperNumber);
      window.scrollTo({top: 0, behavior: 'smooth'});
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitError(null);
    const check = validateAllTeacherEvaluations(evaluations, teachers, questions);
    if (!check.valid) {
      const firstMissing = teachers.find((teacher) => teacher.id === check.missingTeacherIds[0]);
      if (firstMissing) {
        setActivePaper(firstMissing.paperNumber);
      }
      setSubmitError(t.missingRatingsError(teachers.length, check.missingTeacherIds.length));
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{
        submission: TraineeSubmission;
        receiptNotification: NotificationItem;
      }>('/api/trainee/submit', {
        method: 'POST',
        body: JSON.stringify({evaluations}),
      });
      setSubmission(res.submission);
      setEvaluations({});
      setReceiptNotification(res.receiptNotification);
      setNotifications((prev) => [res.receiptNotification, ...prev]);
      window.scrollTo({top: 0, behavior: 'smooth'});
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const sessionCompletionNotice = notifications.find((n) => n.type === 'session_completed');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm font-medium text-slate-600">Loading your evaluation workspace...</div>
      </div>
    );
  }

  if (error || !submission || !session || !timeState) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="text-base font-semibold text-red-700">Unable to open portal</div>
          <p className="text-sm text-slate-600">{error ?? 'Session unavailable.'}</p>
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg cursor-pointer"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const isSubmitted = submission.status === 'submitted';
  const isScheduledFuture = !isSubmitted && timeState.isScheduled;
  const isLockedExpired = !isSubmitted && timeState.isExpired;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract (3 zones) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <span className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          {t.portalHeaderTitle}
        </span>

        <div className="hidden xl:flex items-center gap-4 text-xs text-slate-600 font-mono tabular-nums whitespace-nowrap">
          <span className="font-semibold text-slate-900">{user.id}</span>
          <span aria-hidden="true">·</span>
          <span>
            {t.kolkataLabel}: {formatKolkataTime(nowMs)}
          </span>
          <span aria-hidden="true">·</span>
          <span
            className={
              timeState.urgency === 'expired'
                ? 'text-red-700 font-semibold'
                : timeState.urgency === 'warning' || timeState.urgency === 'scheduled'
                  ? 'text-amber-700 font-semibold'
                  : 'text-blue-700 font-semibold'
            }
          >
            {timeState.isScheduled
              ? `${t.startsIn}: ${timeState.formattedRemaining}`
              : `${t.timeLeft}: ${timeState.formattedRemaining}`}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Select portal language"
            className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg"
          >
            <Languages className="w-3.5 h-3.5 text-slate-500 mx-1.5 hidden sm:block" aria-hidden="true" />
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                aria-pressed={language === opt.code}
                onClick={() => onLanguageChange(opt.code)}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  language === opt.code
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.nativeLabel}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPasswordModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
            {t.changePassword}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            {t.signOut}
          </button>
        </div>
      </header>

      {/* Live Kolkata Countdown Strip */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3">
        <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock
              className={`w-4 h-4 shrink-0 ${
                timeState.urgency === 'expired'
                  ? 'text-red-600'
                  : timeState.urgency === 'warning' || timeState.urgency === 'scheduled'
                    ? 'text-amber-600'
                    : 'text-blue-700'
              }`}
              aria-hidden="true"
            />
            <div className="text-sm">
              <span className="font-semibold text-slate-900">{session.title}</span>
              <span className="text-slate-400 mx-2">·</span>
              <span className="font-mono text-xs text-slate-600 tabular-nums">
                {timeState.isScheduled
                  ? `${t.opensAt} ${formatKolkataDateTime(session.startTime)}`
                  : timeState.isOpen
                    ? `${t.closesAt} ${formatKolkataDateTime(session.endTime)}`
                    : `${t.closedAt} ${formatKolkataDateTime(session.endTime)}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!isSubmitted && !isLockedExpired && !isScheduledFuture && (
              <span className="text-xs text-slate-500 font-mono">
                {saveState === 'saving'
                  ? t.savingDraft
                  : saveState === 'saved'
                    ? t.draftSaved
                    : saveState === 'error'
                      ? t.saveError
                      : t.autoSaveActive}
              </span>
            )}
            <div className="font-mono text-sm font-bold tabular-nums px-3 py-1 rounded-lg bg-slate-100 text-slate-900">
              {timeState.formattedRemaining}
            </div>
          </div>
        </div>
      </div>

      {/* Non-analytical Session Completion Banner */}
      {sessionCompletionNotice && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 sm:px-8 py-3">
          <div className="max-w-[1280px] mx-auto flex items-start gap-3 text-sm text-blue-950">
            <Bell className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <span className="font-semibold">{sessionCompletionNotice.title}: </span>
              <span>{sessionCompletionNotice.message}</span>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-8 py-8">
        {isSubmitted ? (
          /* Strictly Confidential Receipt — NO feedback scores or aggregate data shown outside Admin Panel */
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <h1 className="font-display text-2xl font-bold text-slate-900">{t.submittedHeading}</h1>
                <p className="text-sm text-slate-600 leading-relaxed">{t.submittedBody(user.id)}</p>
              </div>
            </div>

            {receiptNotification && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-900">
                <div className="font-semibold">{receiptNotification.title}</div>
                <div className="text-xs mt-1 text-green-800">{receiptNotification.message}</div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-sm">
              <div>
                <div className="text-xs text-slate-500">{t.traineeChestIdLabel}</div>
                <div className="font-mono font-semibold text-slate-900 mt-0.5">{submission.traineeId}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">{t.submittedAtIst}</div>
                <div className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                  {submission.submittedAt ? formatKolkataDateTime(submission.submittedAt) : t.recorded}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">{t.completionDuration}</div>
                <div className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                  {submission.durationSeconds
                    ? formatDurationHms(submission.durationSeconds * 1000)
                    : t.recorded}
                </div>
              </div>
            </div>
          </div>
        ) : isScheduledFuture ? (
          <div className="max-w-xl mx-auto bg-white border border-amber-200 rounded-2xl p-8 text-center space-y-4">
            <Clock className="w-10 h-10 text-amber-600 mx-auto" aria-hidden="true" />
            <h1 className="font-display text-2xl font-bold text-slate-900">{t.scheduledHeading}</h1>
            <p className="text-sm text-slate-600">
              {t.scheduledBody(
                formatKolkataDateTime(session.startTime),
                formatKolkataDateTime(session.endTime),
              )}
            </p>
            <div className="font-mono text-xl font-bold text-amber-700 tabular-nums">
              {t.startsIn} {timeState.formattedRemaining}
            </div>
          </div>
        ) : isLockedExpired ? (
          <div className="max-w-xl mx-auto bg-white border border-red-200 rounded-2xl p-8 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-red-600 mx-auto" aria-hidden="true" />
            <h1 className="font-display text-2xl font-bold text-slate-900">{t.expiredHeading}</h1>
            <p className="text-sm text-slate-600">
              {t.expiredBody(session.title, formatKolkataDateTime(session.endTime))}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Paper Navigation Sidebar */}
            <aside className="lg:col-span-4 xl:col-span-3 bg-white border border-slate-200 rounded-xl p-4 lg:sticky lg:top-24 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">{t.yourProgress}</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {completedCount} / {teachers.length} {t.facultyLabel}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-700 transition-all duration-200"
                    style={{width: `${(completedCount / Math.max(1, teachers.length)) * 100}%`}}
                  />
                </div>
              </div>

              <nav aria-label="Papers navigation" className="space-y-1">
                {papers.map((paper) => {
                  const group = teachers.filter((teacher) => teacher.paperNumber === paper.paperNumber);
                  if (group.length === 0) return null;
                  const done = group.filter((teacher) =>
                    isTeacherEvaluationComplete(evaluations[teacher.id], questions),
                  ).length;
                  const isActive = activePaper === paper.paperNumber;
                  const allDone = done === group.length;

                  return (
                    <button
                      key={paper.paperNumber}
                      type="button"
                      onClick={() => setActivePaper(paper.paperNumber)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-700 text-white font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate pr-2">
                        {t.paperWord} {paper.paperNumber} ({group.length}{' '}
                        {group.length === 1 ? t.teacherSingular : t.teacherPlural})
                      </span>
                      <span
                        className={`font-mono tabular-nums shrink-0 ${
                          isActive ? 'text-blue-100' : allDone ? 'text-green-700 font-semibold' : 'text-slate-500'
                        }`}
                      >
                        {done}/{group.length}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="pt-3 border-t border-slate-200 space-y-2">
                {completedCount < teachers.length && (
                  <button
                    type="button"
                    onClick={jumpToNextUnrated}
                    className="w-full py-2 px-3 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                  >
                    {t.jumpToNextUnrated}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  {submitting ? t.submitting : t.submitAllFeedback(completedCount, teachers.length)}
                </button>
              </div>
            </aside>

            {/* Main Teacher Cards */}
            <section className="lg:col-span-8 xl:col-span-9 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-blue-700">
                    {t.paperOf(activePaper, papers.length)} · {activePaperTeachers.length}{' '}
                    {activePaperTeachers.length === 1 ? t.teacherSingular : t.teacherPlural}
                  </div>
                  <h1 className="font-display text-xl font-bold text-slate-900 mt-0.5">
                    {activePaperInfo?.title ?? `Paper ${activePaper}`}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">{t.questionLanguagesLegend}</p>
                </div>
                <div className="text-xs text-slate-500 text-right space-y-1">
                  <div>{t.activeQuestionsHint(questions.length)}</div>
                  <div className="font-mono text-[11px] text-slate-500">
                    1: {t.ratingScale[1]} · 3: {t.ratingScale[3]} · 5: {t.ratingScale[5]}
                  </div>
                </div>
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 font-medium"
                >
                  {submitError}
                </div>
              )}

              <div className="space-y-5">
                {activePaperTeachers.map((teacher, idx) => {
                  const entry = evaluations[teacher.id];
                  const isDone = isTeacherEvaluationComplete(entry, questions);

                  return (
                    <article
                      key={teacher.id}
                      data-testid={`teacher-card-${teacher.id}`}
                      className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                            <span>{teacher.code}</span>
                            <span aria-hidden="true">·</span>
                            <span>{teacher.designation}</span>
                          </div>
                          <h2 className="font-display text-lg font-bold text-slate-900 mt-1">
                            {idx + 1}. {teacher.name}
                          </h2>
                          <p className="text-sm text-slate-600 mt-0.5">
                            {teacher.subjectTopic}
                            {teacher.features ? ` · ${teacher.features}` : ''}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`text-xs font-semibold ${
                              isDone ? 'text-green-700' : 'text-amber-700'
                            }`}
                          >
                            {isDone ? t.completedBadge : t.pendingRatingBadge}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-500 mr-1">{t.quickAll}</span>
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={score}
                                type="button"
                                onClick={() => applyQuickScoreToTeacher(teacher.id, score)}
                                aria-label={`Set all questions for ${teacher.name} to ${score} stars`}
                                className="w-7 h-7 text-xs font-mono font-semibold border border-slate-200 hover:border-blue-700 hover:text-blue-700 rounded-md bg-slate-50 transition-colors cursor-pointer"
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Active Questions — Trilingual Display (English + Bengali + Hindi) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {questions.map((question) => {
                          const currentVal = getQuestionScore(entry, question.id);
                          const {primary, secondary} = getOrderedQuestionTexts(question, language);

                          return (
                            <div
                              key={question.id}
                              className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg flex flex-col justify-between gap-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1.5">
                                  <div>
                                    <div className="text-sm font-semibold text-slate-900 leading-snug">
                                      {primary.title}
                                    </div>
                                    {primary.desc && (
                                      <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                                        {primary.desc}
                                      </div>
                                    )}
                                  </div>

                                  {secondary.length > 0 && (
                                    <div className="pt-1.5 border-t border-slate-200/80 space-y-1">
                                      {secondary.map((alt) => (
                                        <div
                                          key={alt.code}
                                          className="text-xs text-slate-700 leading-snug"
                                        >
                                          <span className="font-semibold text-slate-500 mr-1.5">
                                            {alt.tag}:
                                          </span>
                                          <span className="font-medium text-slate-800">{alt.title}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span className="font-mono text-xs font-bold text-slate-700 tabular-nums shrink-0">
                                  {currentVal > 0 ? `${currentVal}/5` : '—'}
                                </span>
                              </div>

                              <div
                                role="radiogroup"
                                aria-label={`${primary.title} for ${teacher.name}`}
                                className="grid grid-cols-5 gap-1.5"
                              >
                                {([1, 2, 3, 4, 5] as const).map((score) => {
                                  const selected = currentVal === score;
                                  return (
                                    <button
                                      key={score}
                                      type="button"
                                      role="radio"
                                      aria-checked={selected}
                                      aria-label={`${score} - ${t.ratingScale[score]} for ${question.shortLabel} of ${teacher.name}`}
                                      onClick={() => updateQuestionScore(teacher.id, question.id, score)}
                                      className={`py-2 px-1 rounded-md text-xs font-medium flex flex-col items-center justify-center gap-0.5 border transition-colors cursor-pointer ${
                                        selected
                                          ? 'bg-blue-700 text-white border-blue-700'
                                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                                      }`}
                                    >
                                      <span className="inline-flex items-center gap-0.5 font-mono font-bold">
                                        {score}
                                        <Star
                                          className={`w-3 h-3 ${selected ? 'fill-white' : 'fill-amber-400 text-amber-400'}`}
                                          aria-hidden="true"
                                        />
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div>
                        <label
                          htmlFor={`comment-${teacher.id}`}
                          className="block text-xs font-medium text-slate-700 mb-1.5"
                        >
                          {t.optionalRemarksFor(teacher.name)}
                        </label>
                        <textarea
                          id={`comment-${teacher.id}`}
                          rows={2}
                          value={entry?.comment ?? ''}
                          onChange={(e) => updateTeacherComment(teacher.id, e.target.value)}
                          placeholder={t.remarksPlaceholder}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                        />
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={activePaper <= 1}
                  onClick={() => {
                    setActivePaper((p) => Math.max(1, p - 1));
                    window.scrollTo({top: 0, behavior: 'smooth'});
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg cursor-pointer"
                >
                  {t.previousPaper}
                </button>

                {activePaper < papers.length ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActivePaper((p) => Math.min(papers.length, p + 1));
                      window.scrollTo({top: 0, behavior: 'smooth'});
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                  >
                    {t.nextPaper(activePaper + 1)}
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg cursor-pointer"
                  >
                    <Send className="w-4 h-4" aria-hidden="true" />
                    {submitting ? t.submitting : t.submitAllFeedback(completedCount, teachers.length)}
                  </button>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      <ChangePasswordModal
        open={passwordModalOpen}
        userLabel={user.id}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
};
