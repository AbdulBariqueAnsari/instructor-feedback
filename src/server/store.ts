import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import {
  DEFAULT_QUESTIONS,
  DEFAULT_TEACHERS,
  TOTAL_TRAINEES,
  calculateTeacherStats,
  formatChestLoginId,
  getSessionTimeState,
} from '../shared/domain.ts';
import type {
  EvaluationMap,
  NotificationItem,
  QuestionItem,
  SessionConfig,
  Teacher,
  TraineeSubmission,
} from '../shared/types.ts';

export interface PasswordStore {
  adminHash?: string;
  traineeHashes: Record<string, string>;
}

const OFFICIAL_ROSTER_VERSION = 2;
const OFFICIAL_QUESTIONS_VERSION = 2;

export interface PortalDatabase {
  rosterVersion?: number;
  questionsVersion?: number;
  sessionSecret?: string;
  session: SessionConfig;
  teachers: Teacher[];
  questions: QuestionItem[];
  submissions: Record<string, TraineeSubmission>;
  notifications: NotificationItem[];
  passwords?: PasswordStore;
}

function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasswordHash(plain: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(plain, salt, 32);
  const expected = Buffer.from(keyHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function resolveDataDir(): string {
  const candidates = [
    process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : null,
    path.resolve(process.cwd(), 'data'),
    path.join(os.tmpdir(), 'stclrc-portal-data'),
  ].filter((p): p is string => Boolean(p));

  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, {recursive: true});
      fs.accessSync(dir, fs.constants.W_OK);
      return dir;
    } catch {
      // try next candidate
    }
  }

  const fallback = path.join(os.tmpdir(), 'stclrc-portal-data');
  fs.mkdirSync(fallback, {recursive: true});
  return fallback;
}

const DATA_DIR = resolveDataDir();
const DB_FILE = path.join(DATA_DIR, 'portal-db.json');

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEACHER_BASE_PROFILES: Record<string, number> = {
  'TCH-01': 4.65,
  'TCH-02': 4.15,
  'TCH-03': 3.55,
  'TCH-04': 4.72,
  'TCH-05': 4.35,
  'TCH-06': 3.85,
  'TCH-07': 3.15,
  'TCH-08': 4.5,
  'TCH-09': 4.25,
  'TCH-10': 3.4,
  'TCH-11': 4.78,
  'TCH-12': 4.42,
  'TCH-13': 3.62,
  'TCH-14': 4.58,
  'TCH-15': 3.92,
  'TCH-16': 4.1,
  'TCH-17': 4.3,
  'TCH-18': 4.52,
  'TCH-19': 3.72,
  'TCH-20': 4.28,
  'TCH-21': 4.48,
  'TCH-22': 3.25,
  'TCH-23': 3.95,
  'TCH-24': 4.82,
  'TCH-25': 4.38,
  'TCH-26': 3.88,
  'TCH-27': 4.44,
};

const SAMPLE_COMMENTS_HIGH = [
  'Very clear explanation with practical field examples.',
  'Doubt resolution was thorough and structured.',
  'Excellent command over the subject and well-paced slides.',
  'Case studies made the concepts easy to retain.',
];

const SAMPLE_COMMENTS_MID = [
  'Good session overall, slightly faster pace in the second half.',
  'Helpful notes provided; more Q&A time would be beneficial.',
  'Clear fundamentals, could add more practical scenarios.',
];

const SAMPLE_COMMENTS_LOW = [
  'Needs slower explanation on complex sections and more Q&A.',
  'Slides had dense text; more interactive examples would help.',
  'Audio pacing was rushed towards the conclusion.',
];

function clampScore(val: number): number {
  return Math.max(1, Math.min(5, Math.round(val)));
}

function createInitialDatabase(): PortalDatabase {
  const now = Date.now();
  const startTime = new Date(now - 25 * 60 * 1000).toISOString();
  const endTime = new Date(now + 95 * 60 * 1000).toISOString();

  const session: SessionConfig = {
    id: 'SESSION-2026-T1',
    title: 'Term-End Faculty Evaluation Window',
    batchName: 'STCLRC Induction Batch (Chest 0001 - 0920)',
    durationMinutes: 120,
    startTime,
    endTime,
    isClosedManually: false,
    completionNotifiedAt: null,
  };

  const teachers = DEFAULT_TEACHERS.map((t) => ({...t}));
  const questions = DEFAULT_QUESTIONS.map((q) => ({...q}));
  const submissions: Record<string, TraineeSubmission> = {};
  const rng = mulberry32(20261118);

  for (let chest = 1; chest <= TOTAL_TRAINEES; chest++) {
    const traineeId = formatChestLoginId(chest);
    submissions[traineeId] = {
      traineeId,
      chestNumber: chest,
      status: 'pending',
      evaluations: {},
      startedAt: null,
      updatedAt: null,
      submittedAt: null,
      durationSeconds: null,
    };
  }

  const notifications: NotificationItem[] = [];

  for (let chest = 21; chest <= 84; chest++) {
    const traineeId = formatChestLoginId(chest);
    const evaluations: EvaluationMap = {};

    for (const teacher of teachers) {
      const base = TEACHER_BASE_PROFILES[teacher.id] ?? 4.0;
      const jitter = () => (rng() - 0.5) * 1.1;
      const clarity = clampScore(base + jitter());
      const delivery = clampScore(base + jitter());
      const engagement = clampScore(base + jitter());
      const discipline = clampScore(base + 0.15 + jitter() * 0.8);
      const behavior = clampScore(base + 0.1 + jitter() * 0.85);

      let comment = '';
      if (rng() < 0.16) {
        const avg = (clarity + delivery + engagement + discipline + behavior) / 5;
        if (avg >= 4.2) {
          comment = SAMPLE_COMMENTS_HIGH[Math.floor(rng() * SAMPLE_COMMENTS_HIGH.length)];
        } else if (avg >= 3.4) {
          comment = SAMPLE_COMMENTS_MID[Math.floor(rng() * SAMPLE_COMMENTS_MID.length)];
        } else {
          comment = SAMPLE_COMMENTS_LOW[Math.floor(rng() * SAMPLE_COMMENTS_LOW.length)];
        }
      }

      evaluations[teacher.id] = {
        teacherId: teacher.id,
        ratings: {clarity, delivery, engagement, discipline, behavior},
        clarity,
        delivery,
        engagement,
        discipline,
        behavior,
        comment,
      };
    }

    const offsetMins = 24 - ((chest - 21) % 22);
    const durationSeconds = 240 + Math.floor(rng() * 380);
    const submittedMs = now - offsetMins * 60 * 1000 + Math.floor(rng() * 45000);
    const startedMs = submittedMs - durationSeconds * 1000;

    submissions[traineeId] = {
      traineeId,
      chestNumber: chest,
      status: 'submitted',
      evaluations,
      startedAt: new Date(startedMs).toISOString(),
      updatedAt: new Date(submittedMs).toISOString(),
      submittedAt: new Date(submittedMs).toISOString(),
      durationSeconds,
    };
  }

  for (let chest = 15; chest <= 20; chest++) {
    const traineeId = formatChestLoginId(chest);
    const partial: EvaluationMap = {};
    const count = 4 + (chest % 6);
    for (let i = 0; i < count; i++) {
      const teacher = teachers[i];
      partial[teacher.id] = {
        teacherId: teacher.id,
        ratings: {clarity: 4, delivery: 4, engagement: 4, discipline: 5, behavior: 5},
        clarity: 4,
        delivery: 4,
        engagement: 4,
        discipline: 5,
        behavior: 5,
        comment: '',
      };
    }
    const startedIso = new Date(now - 8 * 60 * 1000).toISOString();
    submissions[traineeId] = {
      traineeId,
      chestNumber: chest,
      status: 'draft',
      evaluations: partial,
      startedAt: startedIso,
      updatedAt: new Date(now - 2 * 60 * 1000).toISOString(),
      submittedAt: null,
      durationSeconds: null,
    };
  }

  notifications.push(
    {
      id: `NTF-${crypto.randomUUID().slice(0, 8)}`,
      type: 'session_started',
      audience: 'all',
      title: 'Feedback Window Open (27 Faculty Evaluations)',
      message:
        'Term-End Faculty Evaluation Window is active for Chest 0001–0920. Please submit evaluations before the IST deadline.',
      createdAt: startTime,
      readByAdmin: true,
    },
    {
      id: `NTF-${crypto.randomUUID().slice(0, 8)}`,
      type: 'trainee_submitted',
      audience: 'admin',
      title: 'Evaluation Batch Progress Milestone',
      message: 'STCLRC0084 submitted all faculty evaluations. 64 of 920 trainees have completed feedback.',
      createdAt: new Date(now - 2 * 60 * 1000).toISOString(),
      readByAdmin: false,
      metadata: {
        traineeId: 'STCLRC0084',
        submittedCount: 64,
        totalTrainees: TOTAL_TRAINEES,
      },
    },
  );

  return {
    rosterVersion: OFFICIAL_ROSTER_VERSION,
    questionsVersion: OFFICIAL_QUESTIONS_VERSION,
    sessionSecret: crypto.randomBytes(32).toString('hex'),
    session,
    teachers,
    questions,
    submissions,
    notifications,
    passwords: {traineeHashes: {}},
  };
}

class StoreManager {
  private db: PortalDatabase;

  constructor() {
    this.db = this.loadOrInitialize();
  }

  private loadOrInitialize(): PortalDatabase {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as PortalDatabase;
        if (parsed && parsed.session && Array.isArray(parsed.teachers) && parsed.submissions) {
          // Backfill questions and teacher defaults if upgrading from older schema
          let needsPersist = false;
          if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
            parsed.questions = DEFAULT_QUESTIONS.map((q) => ({...q}));
            needsPersist = true;
          } else {
            const defaultQById = new Map(DEFAULT_QUESTIONS.map((q) => [q.id, q]));
            parsed.questions = parsed.questions.map((q) => {
              const def = defaultQById.get(q.id);
              if (!def) return q;
              const updated: QuestionItem = {
                ...q,
                labelBn: q.labelBn ?? def.labelBn,
                labelHi: q.labelHi ?? def.labelHi,
                descriptionBn: q.descriptionBn ?? def.descriptionBn,
                descriptionHi: q.descriptionHi ?? def.descriptionHi,
              };
              if (
                updated.labelBn !== q.labelBn ||
                updated.labelHi !== q.labelHi ||
                updated.descriptionBn !== q.descriptionBn ||
                updated.descriptionHi !== q.descriptionHi
              ) {
                needsPersist = true;
              }
              return updated;
            });
          }

          if (parsed.questionsVersion !== OFFICIAL_QUESTIONS_VERSION) {
            const hasBehavior = parsed.questions.some((q) => q.id === 'behavior');
            const defaultBehavior = DEFAULT_QUESTIONS.find((q) => q.id === 'behavior');
            if (!hasBehavior && defaultBehavior) {
              parsed.questions.push({
                ...defaultBehavior,
                order: parsed.questions.length + 1,
              });
            }
            for (const sub of Object.values(parsed.submissions)) {
              if (sub.status !== 'submitted' && sub.status !== 'draft') continue;
              for (const ev of Object.values(sub.evaluations)) {
                if (!ev) continue;
                const existing = ev.ratings?.behavior ?? ev.behavior;
                if (typeof existing === 'number' && existing >= 1 && existing <= 5) continue;
                const nums = [
                  ev.ratings?.clarity ?? ev.clarity,
                  ev.ratings?.delivery ?? ev.delivery,
                  ev.ratings?.engagement ?? ev.engagement,
                  ev.ratings?.discipline ?? ev.discipline,
                ].filter((n): n is number => typeof n === 'number' && n >= 1 && n <= 5);
                if (nums.length > 0) {
                  const avg = clampScore(nums.reduce((a, b) => a + b, 0) / nums.length);
                  ev.ratings = {...(ev.ratings ?? {}), behavior: avg};
                  ev.behavior = avg;
                }
              }
            }
            parsed.questionsVersion = OFFICIAL_QUESTIONS_VERSION;
            needsPersist = true;
          }
          const defaultById = new Map(DEFAULT_TEACHERS.map((t) => [t.id, t]));

          if (parsed.rosterVersion !== OFFICIAL_ROSTER_VERSION) {
            const customTeachers = parsed.teachers.filter((t) => !defaultById.has(t.id));
            parsed.teachers = [
              ...DEFAULT_TEACHERS.map((t) => ({...t})),
              ...customTeachers.map((t) => ({...t, active: t.active ?? true})),
            ];
            parsed.rosterVersion = OFFICIAL_ROSTER_VERSION;
            needsPersist = true;
          } else {
            parsed.teachers = parsed.teachers.map((t) => ({
              ...t,
              active: t.active ?? true,
              phone: t.phone ?? defaultById.get(t.id)?.phone ?? '',
              features: t.features ?? defaultById.get(t.id)?.features ?? '',
            }));
          }

          if (!parsed.passwords) {
            parsed.passwords = {traineeHashes: {}};
            needsPersist = true;
          }
          if (!parsed.sessionSecret) {
            parsed.sessionSecret = crypto.randomBytes(32).toString('hex');
            needsPersist = true;
          }
          if (needsPersist) {
            this.persist(parsed);
          }
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to load existing portal DB, re-initializing:', err);
    }

    const fresh = createInitialDatabase();
    this.persist(fresh);
    return fresh;
  }

  private persist(target: PortalDatabase = this.db): void {
    const payload = JSON.stringify(target);
    try {
      fs.mkdirSync(DATA_DIR, {recursive: true});
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, payload, 'utf-8');
      try {
        fs.renameSync(tempFile, DB_FILE);
      } catch {
        fs.writeFileSync(DB_FILE, payload, 'utf-8');
        try {
          fs.unlinkSync(tempFile);
        } catch {
          // ignore cleanup error
        }
      }
    } catch (err) {
      console.error('Warning: failed to persist portal DB to disk:', err);
    }
  }

  getDb(): PortalDatabase {
    this.checkAutoSessionCompletion();
    return this.db;
  }

  getSessionSecret(): string {
    if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16) {
      return process.env.SESSION_SECRET.trim();
    }
    if (!this.db.sessionSecret) {
      this.db.sessionSecret = crypto.randomBytes(32).toString('hex');
      this.save();
    }
    return this.db.sessionSecret;
  }

  save(): void {
    this.persist(this.db);
  }

  private ensurePasswordStore(): PasswordStore {
    if (!this.db.passwords) {
      this.db.passwords = {traineeHashes: {}};
    }
    if (!this.db.passwords.traineeHashes) {
      this.db.passwords.traineeHashes = {};
    }
    return this.db.passwords;
  }

  verifyAdminPassword(candidate: string, defaultAdminPassword: string): boolean {
    const storePwd = this.ensurePasswordStore();
    if (storePwd.adminHash) {
      return verifyPasswordHash(candidate, storePwd.adminHash);
    }
    return candidate === defaultAdminPassword;
  }

  setAdminPassword(newPlainPassword: string): void {
    const storePwd = this.ensurePasswordStore();
    storePwd.adminHash = hashPassword(newPlainPassword);
    this.save();
  }

  verifyTraineePassword(traineeId: string, candidate: string, defaultTraineePassword: string): boolean {
    const storePwd = this.ensurePasswordStore();
    const customHash = storePwd.traineeHashes[traineeId];
    if (customHash) {
      return verifyPasswordHash(candidate, customHash);
    }
    return candidate === defaultTraineePassword;
  }

  setTraineePassword(traineeId: string, newPlainPassword: string): void {
    const storePwd = this.ensurePasswordStore();
    storePwd.traineeHashes[traineeId] = hashPassword(newPlainPassword);
    this.save();
  }

  addNotification(item: Omit<NotificationItem, 'id' | 'createdAt'>): NotificationItem {
    const full: NotificationItem = {
      ...item,
      id: `NTF-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.db.notifications.unshift(full);
    if (this.db.notifications.length > 150) {
      this.db.notifications = this.db.notifications.slice(0, 150);
    }
    this.save();
    return full;
  }

  resetAllTraineeFeedback(): {clearedSubmitted: number; clearedDrafts: number} {
    let clearedSubmitted = 0;
    let clearedDrafts = 0;

    for (const sub of Object.values(this.db.submissions)) {
      if (sub.status === 'submitted') clearedSubmitted++;
      else if (sub.status === 'draft') clearedDrafts++;
    }

    const freshSubmissions: Record<string, TraineeSubmission> = {};
    for (let chest = 1; chest <= TOTAL_TRAINEES; chest++) {
      const traineeId = formatChestLoginId(chest);
      freshSubmissions[traineeId] = {
        traineeId,
        chestNumber: chest,
        status: 'pending',
        evaluations: {},
        startedAt: null,
        updatedAt: null,
        submittedAt: null,
        durationSeconds: null,
      };
    }

    this.db.submissions = freshSubmissions;
    this.db.session.completionNotifiedAt = null;
    this.db.notifications = this.db.notifications.filter(
      (n) => n.type !== 'trainee_submitted' && n.type !== 'session_completed',
    );

    this.addNotification({
      type: 'session_started',
      audience: 'admin',
      title: 'All Trainee Feedback Data Reset',
      message: `Administrator cleared ${clearedSubmitted} submitted evaluation(s) and ${clearedDrafts} in-progress draft(s). All ${TOTAL_TRAINEES} trainees (STCLRC0001–0920) are now reset to Pending.`,
      readByAdmin: false,
      metadata: {
        submittedCount: 0,
        totalTrainees: TOTAL_TRAINEES,
      },
    });

    return {clearedSubmitted, clearedDrafts};
  }

  triggerSessionCompletionNotification(reason: 'manual' | 'expired' | 'all_submitted'): NotificationItem {
    const allSubs = Object.values(this.db.submissions);
    const submittedCount = allSubs.filter((s) => s.status === 'submitted').length;
    const stats = calculateTeacherStats(this.db.teachers, allSubs, this.db.questions);
    const sorted = [...stats].sort((a, b) => b.overallAverage - a.overallAverage);
    const top = sorted[0];

    const reasonText =
      reason === 'all_submitted'
        ? 'All 920 trainees completed their evaluations.'
        : reason === 'expired'
          ? 'The fixed feedback timer (IST) has expired.'
          : 'Admin finalized and broadcast the session completion summary.';

    this.db.session.completionNotifiedAt = new Date().toISOString();

    // Detailed results notification strictly for Admin Panel
    const adminNotice = this.addNotification({
      type: 'session_completed',
      audience: 'admin',
      title: 'Session Completion Summary (Admin)',
      message: `${reasonText} ${submittedCount} of ${TOTAL_TRAINEES} trainees submitted (${((submittedCount / TOTAL_TRAINEES) * 100).toFixed(1)}%). Top-rated faculty: ${top?.teacher.name ?? 'N/A'} (${top?.overallAverage.toFixed(2) ?? '0.00'}/5.0).`,
      readByAdmin: false,
      metadata: {
        submittedCount,
        totalTrainees: TOTAL_TRAINEES,
        topTeacherName: top?.teacher.name,
        topTeacherScore: top?.overallAverage,
      },
    });

    // Non-analytical completion notice for Trainees (no feedback scores/results leaked)
    this.addNotification({
      type: 'session_completed',
      audience: 'trainee',
      title: 'Evaluation Session Concluded',
      message:
        'The faculty evaluation session has concluded. All submitted responses are confidentially stored in the Admin Panel.',
      readByAdmin: true,
    });

    return adminNotice;
  }

  private checkAutoSessionCompletion(): void {
    const timeState = getSessionTimeState(this.db.session);
    if (timeState.isExpired && !this.db.session.completionNotifiedAt) {
      this.triggerSessionCompletionNotification('expired');
    }
  }
}

export const store = new StoreManager();
