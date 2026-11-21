import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_QUESTIONS,
  DEFAULT_TEACHERS,
  PAPERS,
  TOTAL_TRAINEES,
  calculatePaperStats,
  calculateTeacherStats,
  countCompletedTeachers,
  formatChestLoginId,
  formatKolkataDateTime,
  fromKolkataDatetimeLocalValue,
  generateAllTraineeIds,
  getPerformanceBand,
  getSessionTimeState,
  parseChestLoginId,
  toKolkataDatetimeLocalValue,
  validateAllTeacherEvaluations,
} from './domain';
import type {EvaluationMap, QuestionItem, SessionConfig, TraineeSubmission} from './types';

test('teacher distribution matches exact 27 teachers across 12 papers', () => {
  assert.equal(DEFAULT_TEACHERS.length, 27);
  assert.equal(PAPERS.length, 12);

  const expectedCounts: Record<number, number> = {
    1: 3,
    2: 4,
    3: 3,
    4: 1,
    5: 2,
    6: 2,
    7: 1,
    8: 1,
    9: 2,
    10: 2,
    11: 2,
    12: 4,
  };

  for (const paper of PAPERS) {
    const actual = DEFAULT_TEACHERS.filter((t) => t.paperNumber === paper.paperNumber).length;
    assert.equal(actual, expectedCounts[paper.paperNumber], `Paper ${paper.paperNumber} count mismatch`);
    assert.equal(paper.expectedTeachers, expectedCounts[paper.paperNumber]);
  }

  // Verify T1..T27 codes, official names, and mobile numbers are present
  DEFAULT_TEACHERS.forEach((teacher, idx) => {
    assert.equal(teacher.code, `T${idx + 1}`);
    assert.ok(teacher.phone && teacher.phone.startsWith('+91 '));
  });
  assert.equal(DEFAULT_TEACHERS[0].name, 'SI(UB) Md Jalaluddin');
  assert.equal(DEFAULT_TEACHERS[0].phone, '+91 99334 52921');
  assert.equal(DEFAULT_TEACHERS[26].name, 'SI(AB) Biswajit Deb');
  assert.equal(DEFAULT_TEACHERS[26].phone, '+91 94120 10000');
});

test('trainee IDs cover STCLRC0001 to STCLRC0920 with 4-digit leading zeros', () => {
  assert.equal(formatChestLoginId(1), 'STCLRC0001');
  assert.equal(formatChestLoginId(45), 'STCLRC0045');
  assert.equal(formatChestLoginId(920), 'STCLRC0920');

  assert.throws(() => formatChestLoginId(0));
  assert.throws(() => formatChestLoginId(921));

  assert.equal(parseChestLoginId('stclrc0001'), 1);
  assert.equal(parseChestLoginId(' STCLRC0920 '), 920);
  assert.equal(parseChestLoginId('STCLRC0000'), null);
  assert.equal(parseChestLoginId('STCLRC0921'), null);
  assert.equal(parseChestLoginId('STCLRC1'), null);

  const roster = generateAllTraineeIds();
  assert.equal(roster.length, TOTAL_TRAINEES);
  assert.equal(roster[0], 'STCLRC0001');
  assert.equal(roster[919], 'STCLRC0920');
});

test('evaluation completeness validation supports custom dynamic questions', () => {
  assert.equal(DEFAULT_QUESTIONS.length, 5);
  const behaviorQ = DEFAULT_QUESTIONS.find((q) => q.id === 'behavior');
  assert.ok(behaviorQ, 'behavior default question must exist');
  assert.ok(behaviorQ.labelBn && behaviorQ.labelHi, 'behavior question must include Bengali & Hindi translations');

  const customQuestions: QuestionItem[] = [
    ...DEFAULT_QUESTIONS,
    {
      id: 'q_custom_1',
      label: 'Case Study Relevance',
      shortLabel: 'Case Study',
      description: 'Uses practical cases.',
      active: true,
      order: 6,
    },
  ];

  const partial: EvaluationMap = {
    'TCH-01': {
      teacherId: 'TCH-01',
      ratings: {clarity: 5, delivery: 4, engagement: 5, discipline: 4, behavior: 5, q_custom_1: 5},
      comment: 'Clear',
    },
    'TCH-02': {
      teacherId: 'TCH-02',
      ratings: {clarity: 4, delivery: 4, engagement: 4, discipline: 4, behavior: 4}, // missing q_custom_1
      comment: '',
    },
  };

  assert.equal(countCompletedTeachers(partial, DEFAULT_TEACHERS, customQuestions), 1);
  const partialCheck = validateAllTeacherEvaluations(partial, DEFAULT_TEACHERS, customQuestions);
  assert.equal(partialCheck.valid, false);
  assert.equal(partialCheck.missingTeacherIds.length, 26);

  const full: EvaluationMap = {};
  for (const teacher of DEFAULT_TEACHERS) {
    full[teacher.id] = {
      teacherId: teacher.id,
      ratings: {clarity: 4, delivery: 5, engagement: 4, discipline: 5, behavior: 5, q_custom_1: 4},
      comment: 'Solid session',
    };
  }
  assert.equal(countCompletedTeachers(full, DEFAULT_TEACHERS, customQuestions), 27);
  assert.equal(validateAllTeacherEvaluations(full, DEFAULT_TEACHERS, customQuestions).valid, true);
});

test('teacher and paper performance calculations compute accurate averages and ranks', () => {
  const evalA: EvaluationMap = {};
  const evalB: EvaluationMap = {};
  for (const teacher of DEFAULT_TEACHERS) {
    const isTop = teacher.id === 'TCH-01';
    evalA[teacher.id] = {
      teacherId: teacher.id,
      clarity: isTop ? 5 : 3,
      delivery: isTop ? 5 : 3,
      engagement: isTop ? 5 : 3,
      discipline: isTop ? 5 : 3,
      behavior: isTop ? 5 : 3,
      comment: isTop ? 'Outstanding' : '',
    };
    evalB[teacher.id] = {
      teacherId: teacher.id,
      clarity: isTop ? 4 : 3,
      delivery: isTop ? 4 : 3,
      engagement: isTop ? 4 : 3,
      discipline: isTop ? 4 : 3,
      behavior: isTop ? 4 : 3,
      comment: '',
    };
  }

  const submissions: TraineeSubmission[] = [
    {
      traineeId: 'STCLRC0010',
      chestNumber: 10,
      status: 'submitted',
      evaluations: evalA,
      startedAt: '2026-11-18T06:00:00.000Z',
      updatedAt: '2026-11-18T06:05:00.000Z',
      submittedAt: '2026-11-18T06:05:00.000Z',
      durationSeconds: 300,
    },
    {
      traineeId: 'STCLRC0011',
      chestNumber: 11,
      status: 'submitted',
      evaluations: evalB,
      startedAt: '2026-11-18T06:01:00.000Z',
      updatedAt: '2026-11-18T06:06:00.000Z',
      submittedAt: '2026-11-18T06:06:00.000Z',
      durationSeconds: 300,
    },
  ];

  const stats = calculateTeacherStats(DEFAULT_TEACHERS, submissions);
  const tch1 = stats.find((s) => s.teacher.id === 'TCH-01');
  assert.ok(tch1);
  assert.equal(tch1.overallAverage, 4.5);
  assert.equal(tch1.rank, 1);
  assert.equal(tch1.performanceBand, 'Exemplary');
  assert.equal(tch1.comments.length, 1);

  const paperStats = calculatePaperStats(PAPERS, stats);
  const paper1 = paperStats.find((p) => p.paperNumber === 1);
  assert.ok(paper1);
  assert.equal(paper1.teacherCount, 3);
  assert.equal(paper1.topTeacherName, 'SI(UB) Md Jalaluddin');
  assert.equal(paper1.topTeacherScore, 4.5);
  assert.equal(getPerformanceBand(2.5, 5), 'Needs Attention');
});

test('Kolkata Standard Time helpers convert accurately between UTC ISO and IST datetime-local', () => {
  // 2026-11-18 14:30 IST (+05:30) == 2026-11-18T09:00:00.000Z
  const iso = fromKolkataDatetimeLocalValue('2026-11-18T14:30');
  assert.equal(iso, '2026-11-18T09:00:00.000Z');
  assert.equal(toKolkataDatetimeLocalValue(iso!), '2026-11-18T14:30');
  assert.ok(formatKolkataDateTime(iso!).includes('IST'));
});

test('session timer state handles scheduled, open, warning, expired, and manually closed states', () => {
  const baseSession: SessionConfig = {
    id: 'S-1',
    title: 'Term End Feedback',
    batchName: 'Batch 2026',
    durationMinutes: 60,
    startTime: '2026-11-18T06:00:00.000Z',
    endTime: '2026-11-18T07:00:00.000Z',
    isClosedManually: false,
    completionNotifiedAt: null,
  };

  const scheduledState = getSessionTimeState(baseSession, new Date('2026-11-18T05:30:00.000Z').getTime());
  assert.equal(scheduledState.isScheduled, true);
  assert.equal(scheduledState.isOpen, false);
  assert.equal(scheduledState.formattedRemaining, '00:30:00');

  const openState = getSessionTimeState(baseSession, new Date('2026-11-18T06:30:00.000Z').getTime());
  assert.equal(openState.isOpen, true);
  assert.equal(openState.urgency, 'normal');
  assert.equal(openState.formattedRemaining, '00:30:00');

  const warnState = getSessionTimeState(baseSession, new Date('2026-11-18T06:55:00.000Z').getTime());
  assert.equal(warnState.isOpen, true);
  assert.equal(warnState.urgency, 'warning');
  assert.equal(warnState.formattedRemaining, '00:05:00');

  const expiredState = getSessionTimeState(baseSession, new Date('2026-11-18T07:00:05.000Z').getTime());
  assert.equal(expiredState.isOpen, false);
  assert.equal(expiredState.isExpired, true);
  assert.equal(expiredState.urgency, 'expired');

  const manualClosed = getSessionTimeState(
    {...baseSession, isClosedManually: true},
    new Date('2026-11-18T06:10:00.000Z').getTime(),
  );
  assert.equal(manualClosed.isOpen, false);
  assert.equal(manualClosed.formattedRemaining, '00:00:00');
});
