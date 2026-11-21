import type {
  EvaluationMap,
  PaperInfo,
  PaperPerformanceStat,
  PerformanceBand,
  QuestionItem,
  SessionConfig,
  SessionTimeState,
  Teacher,
  TeacherPerformanceStat,
  TeacherRatingInput,
  TraineeSubmission,
} from './types.ts';

export const TOTAL_TRAINEES = 920;
export const DEFAULT_TRAINEE_PASSWORD = 'pass1234';
export const KOLKATA_TIMEZONE = 'Asia/Kolkata';

export const DEFAULT_QUESTIONS: QuestionItem[] = [
  {
    id: 'clarity',
    label: 'Concept Clarity & Subject Mastery',
    labelBn: 'ধারণার স্পষ্টতা ও বিষয়ে দক্ষতা',
    labelHi: 'अवधारणा की स्पष्टता और विषय पर पकड़',
    shortLabel: 'Clarity',
    description: 'Explains core concepts clearly with practical examples and strong subject command.',
    descriptionBn: 'বাস্তব উদাহরণ ও দৃঢ় বিষয়জ্ঞানের মাধ্যমে মূল ধারণাগুলি স্পষ্টভাবে ব্যাখ্যা করেন।',
    descriptionHi: 'व्यावहारिक उदाहरणों और मजबूत विषय ज्ञान के साथ मुख्य अवधारणाओं को स्पष्ट रूप से समझाते हैं।',
    active: true,
    order: 1,
  },
  {
    id: 'delivery',
    label: 'Teaching Pace & Delivery',
    labelBn: 'শিক্ষাদানের গতি ও উপস্থাপনা',
    labelHi: 'शिक्षण की गति और प्रस्तुति',
    shortLabel: 'Delivery',
    description: 'Maintains an effective teaching pace, structured flow, and audible presentation.',
    descriptionBn: 'কার্যকর শিক্ষাদানের গতি, সুশৃঙ্খল ধারাবাহিকতা এবং স্পষ্ট উপস্থাপনা বজায় রাখেন।',
    descriptionHi: 'प्रभावी शिक्षण गति, व्यवस्थित प्रवाह और स्पष्ट प्रस्तुति बनाए रखते हैं।',
    active: true,
    order: 2,
  },
  {
    id: 'engagement',
    label: 'Engagement & Doubt Resolution',
    labelBn: 'সক্রিয় অংশগ্রহণ ও সন্দেহ নিরসন',
    labelHi: 'सहभागिता और शंका समाधान',
    shortLabel: 'Engagement',
    description: 'Encourages questions and resolves trainee doubts patiently and thoroughly.',
    descriptionBn: 'প্রশ্ন করতে উৎসাহিত করেন এবং প্রশিক্ষণার্থীদের সন্দেহ ধৈর্যসহকারে ও সম্পূর্ণরূপে দূর করেন।',
    descriptionHi: 'प्रश्न पूछने के लिए प्रोत्साहित करते हैं और प्रशिक्षुओं की शंकाओं का धैर्यपूर्वक व पूर्ण समाधान करते हैं।',
    active: true,
    order: 3,
  },
  {
    id: 'discipline',
    label: 'Punctuality & Class Structure',
    labelBn: 'সময়ের অনুবর্তিতা ও ক্লাসের শৃঙ্খলা',
    labelHi: 'समयबद्धता और कक्षा की संरचना',
    shortLabel: 'Structure',
    description: 'Starts and concludes sessions on schedule with well-organized instructional material.',
    descriptionBn: 'নির্ধারিত সময়ে ক্লাস শুরু ও শেষ করেন এবং সুসংগঠিত পাঠ্য উপকরণ ব্যবহার করেন।',
    descriptionHi: 'निर्धारित समय पर सत्र शुरू व समाप्त करते हैं और सुव्यवस्थित शिक्षण सामग्री का उपयोग करते हैं।',
    active: true,
    order: 4,
  },
];

export const PAPERS: PaperInfo[] = [
  {paperNumber: 1, title: 'Paper-1: Bharatiya Nagarik Suraksha Sanhita 2023 (BNSS)', expectedTeachers: 3},
  {paperNumber: 2, title: 'Paper-2: Bharatiya Nyaya Sanhita 2023 (BNS)', expectedTeachers: 4},
  {paperNumber: 3, title: 'Paper-3: Central Minor Acts and Special Laws', expectedTeachers: 3},
  {paperNumber: 4, title: 'Paper-4: Bharatiya Sakshya Adhiniyam 2023 (BSA)', expectedTeachers: 1},
  {paperNumber: 5, title: 'Paper-5: Forensics', expectedTeachers: 2},
  {paperNumber: 6, title: 'Paper-6: ICT and Cyber Investigation', expectedTeachers: 2},
  {paperNumber: 7, title: 'Paper-7: Criminology and Crime Prevention', expectedTeachers: 1},
  {paperNumber: 8, title: 'Paper-8: Police Organization and Administration', expectedTeachers: 1},
  {paperNumber: 9, title: 'Paper-9: Police Station Management', expectedTeachers: 2},
  {paperNumber: 10, title: 'Paper-10: Personal Development', expectedTeachers: 2},
  {paperNumber: 11, title: 'Paper-11: Internal Security and Public Order', expectedTeachers: 2},
  {paperNumber: 12, title: 'Paper-12: Ethics and Accountability', expectedTeachers: 4},
];

// Official 27 STCLRC instructors across Paper-1 to Paper-12:
// P1:3, P2:4, P3:3, P4:1, P5:2, P6:2, P7:1, P8:1, P9:2, P10:2, P11:2, P12:4 => Total 27
export const DEFAULT_TEACHERS: Teacher[] = [
  // Paper-1 (3)
  {id: 'TCH-01', code: 'T1', name: 'SI(UB) Md Jalaluddin', phone: '+91 99334 52921', paperNumber: 1, subjectTopic: 'Bharatiya Nagarik Suraksha Sanhita 2023 (BNSS)', designation: 'SI(UB)', features: 'Paper-1', active: true},
  {id: 'TCH-02', code: 'T2', name: 'SI(AB) Hazrat Belal', phone: '+91 98006 20487', paperNumber: 1, subjectTopic: 'Bharatiya Nagarik Suraksha Sanhita 2023 (BNSS)', designation: 'SI(AB)', features: 'Paper-1', active: true},
  {id: 'TCH-03', code: 'T3', name: 'ASI(UB) Surojit Kr. Das', phone: '+91 96142 17484', paperNumber: 1, subjectTopic: 'Bharatiya Nagarik Suraksha Sanhita 2023 (BNSS)', designation: 'ASI(UB)', features: 'Paper-1', active: true},
  // Paper-2 (4)
  {id: 'TCH-04', code: 'T4', name: 'ASI(AB) Prabir Sarkar', phone: '+91 89006 74916', paperNumber: 2, subjectTopic: 'Bharatiya Nyaya Sanhita 2023 (BNS)', designation: 'ASI(AB)', features: 'Paper-2', active: true},
  {id: 'TCH-05', code: 'T5', name: 'SI(UB) Kaushik Sarkar', phone: '+91 97352 80252', paperNumber: 2, subjectTopic: 'Bharatiya Nyaya Sanhita 2023 (BNS)', designation: 'SI(UB)', features: 'Paper-2', active: true},
  {id: 'TCH-06', code: 'T6', name: 'SI(UB) Biswajit Saha', phone: '+91 79082 77110', paperNumber: 2, subjectTopic: 'Bharatiya Nyaya Sanhita 2023 (BNS)', designation: 'SI(UB)', features: 'Paper-2', active: true},
  {id: 'TCH-07', code: 'T7', name: 'SI(UB) Sadhan Kr Roy', phone: '+91 76021 44180', paperNumber: 2, subjectTopic: 'Bharatiya Nyaya Sanhita 2023 (BNS)', designation: 'SI(UB)', features: 'Paper-2', active: true},
  // Paper-3 (3)
  {id: 'TCH-08', code: 'T8', name: 'SI(UB) Ebadul Ali Mondal', phone: '+91 861 786 1981', paperNumber: 3, subjectTopic: 'Central Minor Acts and Special Laws', designation: 'SI(UB)', features: 'Paper-3', active: true},
  {id: 'TCH-09', code: 'T9', name: 'SI(UB) Tika Kr. Damai', phone: '+91 891 844 1326', paperNumber: 3, subjectTopic: 'Central Minor Acts and Special Laws', designation: 'SI(UB)', features: 'Paper-3', active: true},
  {id: 'TCH-10', code: 'T10', name: 'SI(UB) Bhudeb Ch. Ghosh', phone: '+91 97332 18259', paperNumber: 3, subjectTopic: 'Central Minor Acts and Special Laws', designation: 'SI(UB)', features: 'Paper-3', active: true},
  // Paper-4 (1)
  {id: 'TCH-11', code: 'T11', name: 'SI(UB) Ratan Sarkar', phone: '+91 94345 18447', paperNumber: 4, subjectTopic: 'Bharatiya Sakshya Adhiniyam 2023 (BSA)', designation: 'SI(UB)', features: 'Paper-4', active: true},
  // Paper-5 (2)
  {id: 'TCH-12', code: 'T12', name: 'SI(UB) Abdul Samad', phone: '+91 83378 00950', paperNumber: 5, subjectTopic: 'Forensics', designation: 'SI(UB)', features: 'Paper-5', active: true},
  {id: 'TCH-13', code: 'T13', name: 'SI(UB) Rassel Hossain', phone: '+91 94757 68133', paperNumber: 5, subjectTopic: 'Forensics', designation: 'SI(UB)', features: 'Paper-5', active: true},
  // Paper-6 (2)
  {id: 'TCH-14', code: 'T14', name: 'ASI(W) Noor Alam', phone: '+91 81458 48041', paperNumber: 6, subjectTopic: 'ICT and Cyber Investigation', designation: 'ASI(W)', features: 'Paper-6', active: true},
  {id: 'TCH-15', code: 'T15', name: 'ASI(UB) Nripen Ch Roy', phone: '+91 98323 86930', paperNumber: 6, subjectTopic: 'ICT and Cyber Investigation', designation: 'ASI(UB)', features: 'Paper-6', active: true},
  // Paper-7 (1)
  {id: 'TCH-16', code: 'T16', name: 'SI(UB) Ghanashyam Mahato', phone: '+91 70312 35687', paperNumber: 7, subjectTopic: 'Criminology and Crime Prevention', designation: 'SI(UB)', features: 'Paper-7', active: true},
  // Paper-8 (1)
  {id: 'TCH-17', code: 'T17', name: 'SI(AB) Avijit Bala', phone: '+91 79087 52229', paperNumber: 8, subjectTopic: 'Police Organization and Administration', designation: 'SI(AB)', features: 'Paper-8', active: true},
  // Paper-9 (2)
  {id: 'TCH-18', code: 'T18', name: 'SI(UB) Parimal Saha', phone: '+91 90029 43499', paperNumber: 9, subjectTopic: 'Police Station Management', designation: 'SI(UB)', features: 'Paper-9', active: true},
  {id: 'TCH-19', code: 'T19', name: 'ASI(UB) Bisu Benjamin Mardi', phone: '+91 70013 37008', paperNumber: 9, subjectTopic: 'Police Station Management', designation: 'ASI(UB)', features: 'Paper-9', active: true},
  // Paper-10 (2)
  {id: 'TCH-20', code: 'T20', name: 'SI(UB) Sankar Bhowmick', phone: '+91 70018 83069', paperNumber: 10, subjectTopic: 'Personal Development', designation: 'SI(UB)', features: 'Paper-10', active: true},
  {id: 'TCH-21', code: 'T21', name: 'SI(UB) Sanjay Majumdar', phone: '+91 83482 65787', paperNumber: 10, subjectTopic: 'Personal Development', designation: 'SI(UB)', features: 'Paper-10', active: true},
  // Paper-11 (2)
  {id: 'TCH-22', code: 'T22', name: 'SI(UB) Biman Ghosh', phone: '+91 70010 05530', paperNumber: 11, subjectTopic: 'Internal Security and Public Order', designation: 'SI(UB)', features: 'Paper-11', active: true},
  {id: 'TCH-23', code: 'T23', name: 'SI(AB) Debashis Ray', phone: '+91 98327 36256', paperNumber: 11, subjectTopic: 'Internal Security and Public Order', designation: 'SI(AB)', features: 'Paper-11', active: true},
  // Paper-12 (4)
  {id: 'TCH-24', code: 'T24', name: 'SI(UB) Krishnapada Barman', phone: '+91 94344 58547', paperNumber: 12, subjectTopic: 'Ethics and Accountability', designation: 'SI(UB)', features: 'Paper-12', active: true},
  {id: 'TCH-25', code: 'T25', name: 'SI(UB) Chandan Kr. Siddhanta', phone: '+91 97332 91300', paperNumber: 12, subjectTopic: 'Ethics and Accountability', designation: 'SI(UB)', features: 'Paper-12', active: true},
  {id: 'TCH-26', code: 'T26', name: 'ASI(UB) Shiben Hansda', phone: '+91 747 914 2044', paperNumber: 12, subjectTopic: 'Ethics and Accountability', designation: 'ASI(UB)', features: 'Paper-12', active: true},
  {id: 'TCH-27', code: 'T27', name: 'SI(AB) Biswajit Deb', phone: '+91 94120 10000', paperNumber: 12, subjectTopic: 'Ethics and Accountability', designation: 'SI(AB)', features: 'Paper-12', active: true},
];

// Kolkata Standard Time (IST, UTC+05:30) formatting & parsing helpers
export function formatKolkataDateTime(iso: string | number | Date): string {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const formatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: KOLKATA_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return `${formatted} IST`;
}

export function formatKolkataTime(iso: string | number | Date): string {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const formatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: KOLKATA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
  return `${formatted} IST`;
}

export function formatKolkataShortTime(iso: string | number | Date): string {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: KOLKATA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Converts an ISO timestamp to `YYYY-MM-DDTHH:mm` in Asia/Kolkata (+05:30)
 * for `<input type="datetime-local">`.
 */
export function toKolkataDatetimeLocalValue(iso: string): string {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '';
  // Shift by +05:30 (330 minutes) and format via UTC getters
  const istDate = new Date(ms + 330 * 60 * 1000);
  const yyyy = istDate.getUTCFullYear();
  const mm = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(istDate.getUTCDate()).padStart(2, '0');
  const hh = String(istDate.getUTCHours()).padStart(2, '0');
  const min = String(istDate.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

/**
 * Parses a `YYYY-MM-DDTHH:mm` string entered in Kolkata Standard Time (+05:30)
 * into a UTC ISO string.
 */
export function fromKolkataDatetimeLocalValue(localStr: string): string | null {
  const trimmed = localStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return null;
  }
  const parsed = new Date(`${trimmed}:00+05:30`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

export function formatChestLoginId(chestNumber: number): string {
  if (!Number.isInteger(chestNumber) || chestNumber < 1 || chestNumber > TOTAL_TRAINEES) {
    throw new Error(`Invalid chest number: ${chestNumber}. Must be between 1 and ${TOTAL_TRAINEES}.`);
  }
  return `STCLRC${String(chestNumber).padStart(4, '0')}`;
}

export function parseChestLoginId(rawId: string): number | null {
  const normalized = rawId.trim().toUpperCase();
  const match = /^STCLRC(\d{4})$/.exec(normalized);
  if (!match) {
    return null;
  }
  const num = Number(match[1]);
  if (!Number.isInteger(num) || num < 1 || num > TOTAL_TRAINEES) {
    return null;
  }
  return num;
}

export function generateAllTraineeIds(): string[] {
  const ids: string[] = [];
  for (let i = 1; i <= TOTAL_TRAINEES; i++) {
    ids.push(formatChestLoginId(i));
  }
  return ids;
}

export function isRatingValid(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

export function getQuestionScore(
  entry: Partial<TeacherRatingInput> | undefined,
  questionId: string,
): number {
  if (!entry) return 0;
  if (entry.ratings && typeof entry.ratings[questionId] === 'number') {
    return entry.ratings[questionId];
  }
  const legacy = (entry as Record<string, unknown>)[questionId];
  return typeof legacy === 'number' ? legacy : 0;
}

export function isTeacherEvaluationComplete(
  entry: Partial<TeacherRatingInput> | undefined,
  questions: QuestionItem[] = DEFAULT_QUESTIONS,
): boolean {
  if (!entry) return false;
  const activeQuestions = questions.filter((q) => q.active);
  if (activeQuestions.length === 0) return false;
  return activeQuestions.every((q) => isRatingValid(getQuestionScore(entry, q.id)));
}

export function countCompletedTeachers(
  evaluations: EvaluationMap,
  teachers: Teacher[],
  questions: QuestionItem[] = DEFAULT_QUESTIONS,
): number {
  const activeTeachers = teachers.filter((t) => t.active !== false);
  let count = 0;
  for (const teacher of activeTeachers) {
    if (isTeacherEvaluationComplete(evaluations[teacher.id], questions)) {
      count++;
    }
  }
  return count;
}

export function validateAllTeacherEvaluations(
  evaluations: EvaluationMap,
  teachers: Teacher[],
  questions: QuestionItem[] = DEFAULT_QUESTIONS,
): {valid: boolean; missingTeacherIds: string[]} {
  const activeTeachers = teachers.filter((t) => t.active !== false);
  const missingTeacherIds: string[] = [];
  for (const teacher of activeTeachers) {
    if (!isTeacherEvaluationComplete(evaluations[teacher.id], questions)) {
      missingTeacherIds.push(teacher.id);
    }
  }
  return {
    valid: missingTeacherIds.length === 0,
    missingTeacherIds,
  };
}

export function getPerformanceBand(avg: number, responseCount: number): PerformanceBand {
  if (responseCount === 0) return 'No Data';
  if (avg >= 4.2) return 'Exemplary';
  if (avg >= 3.5) return 'Proficient';
  if (avg >= 2.8) return 'Developing';
  return 'Needs Attention';
}

export function calculateTeacherStats(
  teachers: Teacher[],
  submissions: TraineeSubmission[],
  questions: QuestionItem[] = DEFAULT_QUESTIONS,
): TeacherPerformanceStat[] {
  const submittedOnly = submissions.filter((s) => s.status === 'submitted');
  const activeQuestions = questions.filter((q) => q.active);
  const targetQuestions = activeQuestions.length > 0 ? activeQuestions : DEFAULT_QUESTIONS;

  const rawStats = teachers.map((teacher) => {
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const q of targetQuestions) {
      sums[q.id] = 0;
      counts[q.id] = 0;
    }

    let responseCount = 0;
    const dist: Record<1 | 2 | 3 | 4 | 5, number> = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    const comments: TeacherPerformanceStat['comments'] = [];

    for (const sub of submittedOnly) {
      const ev = sub.evaluations[teacher.id];
      if (!ev) continue;

      const scoresForRow: number[] = [];
      for (const q of targetQuestions) {
        const s = getQuestionScore(ev, q.id);
        if (isRatingValid(s)) {
          sums[q.id] += s;
          counts[q.id]++;
          scoresForRow.push(s);
        }
      }

      if (scoresForRow.length === 0) continue;
      responseCount++;

      const avg = scoresForRow.reduce((a, b) => a + b, 0) / scoresForRow.length;
      const roundedBucket = Math.min(5, Math.max(1, Math.round(avg))) as 1 | 2 | 3 | 4 | 5;
      dist[roundedBucket]++;

      const trimmedComment = (ev.comment || '').trim();
      if (trimmedComment.length > 0) {
        comments.push({
          traineeId: sub.traineeId,
          comment: trimmedComment,
          averageRating: Number(avg.toFixed(2)),
          submittedAt: sub.submittedAt || '',
        });
      }
    }

    const criteriaAverages: Record<string, number> = {};
    let totalAvgSum = 0;
    let totalAvgCount = 0;

    for (const q of targetQuestions) {
      const c = counts[q.id];
      const avg = c > 0 ? Number((sums[q.id] / c).toFixed(2)) : 0;
      criteriaAverages[q.id] = avg;
      if (c > 0) {
        totalAvgSum += avg;
        totalAvgCount++;
      }
    }

    const overallAverage =
      totalAvgCount > 0 ? Number((totalAvgSum / totalAvgCount).toFixed(2)) : 0;

    comments.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

    return {
      teacher,
      responseCount,
      overallAverage,
      criteriaAverages,
      ratingDistribution: dist,
      performanceBand: getPerformanceBand(overallAverage, responseCount),
      rank: 0,
      comments,
    };
  });

  const ranked = [...rawStats].sort((a, b) => {
    if (a.responseCount === 0 && b.responseCount > 0) return 1;
    if (b.responseCount === 0 && a.responseCount > 0) return -1;
    if (b.overallAverage !== a.overallAverage) return b.overallAverage - a.overallAverage;
    return a.teacher.id.localeCompare(b.teacher.id);
  });

  const rankMap = new Map<string, number>();
  ranked.forEach((item, index) => {
    rankMap.set(item.teacher.id, index + 1);
  });

  return rawStats.map((item) => ({
    ...item,
    rank: rankMap.get(item.teacher.id) ?? 0,
  }));
}

export function calculatePaperStats(
  papers: PaperInfo[],
  teacherStats: TeacherPerformanceStat[],
): PaperPerformanceStat[] {
  return papers.map((paper) => {
    const group = teacherStats.filter((t) => t.teacher.paperNumber === paper.paperNumber);
    const active = group.filter((t) => t.responseCount > 0);
    const avgScore =
      active.length > 0
        ? Number((active.reduce((acc, item) => acc + item.overallAverage, 0) / active.length).toFixed(2))
        : 0;
    const totalResponses = group.reduce((acc, item) => acc + item.responseCount, 0);
    const sorted = [...active].sort((a, b) => b.overallAverage - a.overallAverage);

    return {
      paperNumber: paper.paperNumber,
      title: paper.title,
      teacherCount: group.length,
      totalResponses,
      averageScore: avgScore,
      topTeacherName: sorted[0]?.teacher.name ?? null,
      topTeacherScore: sorted[0]?.overallAverage ?? 0,
    };
  });
}

export function formatDurationHms(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

export function getSessionTimeState(session: SessionConfig, nowMs: number = Date.now()): SessionTimeState {
  const startMs = new Date(session.startTime).getTime();
  const endMs = new Date(session.endTime).getTime();

  if (session.isClosedManually || !Number.isFinite(endMs)) {
    return {
      status: 'expired',
      remainingMs: 0,
      formattedRemaining: '00:00:00',
      isOpen: false,
      isScheduled: false,
      isExpired: true,
      urgency: 'expired',
    };
  }

  if (Number.isFinite(startMs) && nowMs < startMs) {
    const untilStartMs = Math.max(0, startMs - nowMs);
    return {
      status: 'scheduled',
      remainingMs: untilStartMs,
      formattedRemaining: formatDurationHms(untilStartMs),
      isOpen: false,
      isScheduled: true,
      isExpired: false,
      urgency: 'scheduled',
    };
  }

  const remainingMs = Math.max(0, endMs - nowMs);
  const isExpired = remainingMs <= 0;
  const isOpen = !isExpired;

  let urgency: SessionTimeState['urgency'] = 'normal';
  if (isExpired) {
    urgency = 'expired';
  } else if (remainingMs <= 10 * 60 * 1000) {
    urgency = 'warning';
  }

  return {
    status: isExpired ? 'expired' : 'open',
    remainingMs,
    formattedRemaining: formatDurationHms(remainingMs),
    isOpen,
    isScheduled: false,
    isExpired,
    urgency,
  };
}
