import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import * as XLSX from 'xlsx';
import {
  DEFAULT_TRAINEE_PASSWORD,
  PAPERS,
  TOTAL_TRAINEES,
  calculatePaperStats,
  calculateTeacherStats,
  countCompletedTeachers,
  formatChestLoginId,
  formatKolkataDateTime,
  formatKolkataShortTime,
  getQuestionScore,
  getSessionTimeState,
  parseChestLoginId,
  validateAllTeacherEvaluations,
} from './src/shared/domain.ts';
import type {
  AuthSessionUser,
  EvaluationMap,
  QuestionItem,
  SubmissionTimelinePoint,
  Teacher,
  TraineeRosterRow,
} from './src/shared/types.ts';
import {store} from './src/server/store.ts';

const ADMIN_ID = 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const COOKIE_NAME = 'stclrc_sid';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const revokedTokens = new Set<string>();

interface SignedTokenPayload {
  user: AuthSessionUser;
  exp: number;
  jti: string;
}

function issueSessionToken(user: AuthSessionUser): string {
  const payload: SignedTokenPayload = {
    user,
    exp: Date.now() + TOKEN_TTL_MS,
    jti: crypto.randomBytes(12).toString('hex'),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', store.getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(token: string): AuthSessionUser | null {
  if (!token || revokedTokens.has(token)) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = crypto
    .createHmac('sha256', store.getSessionSecret())
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as SignedTokenPayload;
    if (!parsed?.user || typeof parsed.exp !== 'number' || Date.now() > parsed.exp) {
      return null;
    }
    return parsed.user;
  } catch {
    return null;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    result[key] = decodeURIComponent(val);
  }
  return result;
}

function getAuthenticatedUser(req: express.Request): AuthSessionUser | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const user = verifySessionToken(token);
    if (user) return user;
  }

  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[COOKIE_NAME];
  if (cookieToken) {
    const user = verifySessionToken(cookieToken);
    if (user) return user;
  }
  return null;
}

function requireRole(role: 'admin' | 'trainee'): express.RequestHandler {
  return (req, res, next) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({error: 'Authentication required. Please sign in.'});
      return;
    }
    if (user.role !== role) {
      res.status(403).json({error: `Access restricted to ${role} accounts.`});
      return;
    }
    (req as express.Request & {user: AuthSessionUser}).user = user;
    next();
  };
}

interface XlsxSheetSpec {
  name: string;
  rows: Record<string, string | number>[];
}

function buildWorksheet(rows: Record<string, string | number>[]): XLSX.WorkSheet {
  const sheet = XLSX.utils.json_to_sheet(rows);
  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    sheet['!cols'] = keys.map((key) => {
      let maxLen = key.length;
      for (const row of rows.slice(0, 200)) {
        const len = String(row[key] ?? '').length;
        if (len > maxLen) maxLen = len;
      }
      return {wch: Math.min(48, Math.max(12, maxLen + 2))};
    });
  }
  return sheet;
}

function sendXlsx(res: express.Response, filename: string, sheets: XlsxSheetSpec[]): void {
  const workbook = XLSX.utils.book_new();
  for (const spec of sheets) {
    const safeRows = spec.rows.length > 0 ? spec.rows : [{Notice: 'No records available yet'}];
    const ws = buildWorksheet(safeRows);
    XLSX.utils.book_append_sheet(workbook, ws, spec.name.slice(0, 31));
  }
  const buffer = XLSX.write(workbook, {type: 'buffer', bookType: 'xlsx'}) as Buffer;
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

function buildSubmissionTimeline(
  submissions: ReturnType<typeof store.getDb>['submissions'],
): SubmissionTimelinePoint[] {
  const submitted = Object.values(submissions)
    .filter((s) => s.status === 'submitted' && s.submittedAt)
    .sort((a, b) => (a.submittedAt || '').localeCompare(b.submittedAt || ''));

  if (submitted.length === 0) {
    return [];
  }

  const minMs = new Date(submitted[0].submittedAt!).getTime();
  const maxMs = Math.max(minMs + 60000, new Date(submitted[submitted.length - 1].submittedAt!).getTime());
  const bucketCount = 8;
  const step = Math.max(60000, Math.ceil((maxMs - minMs) / bucketCount));

  const points: SubmissionTimelinePoint[] = [];
  let cumulative = 0;

  for (let i = 0; i < bucketCount; i++) {
    const start = minMs + i * step;
    const end = i === bucketCount - 1 ? maxMs + 1 : start + step;
    const count = submitted.filter((s) => {
      const t = new Date(s.submittedAt!).getTime();
      return t >= start && t < end;
    }).length;
    cumulative += count;

    points.push({
      label: formatKolkataShortTime(start),
      submittedCount: count,
      cumulativeCount: cumulative,
    });
  }

  return points;
}

async function startServer() {
  const app = express();
  app.use(express.json({limit: '2mb'}));

  app.get('/api/health', (_req, res) => {
    res.json({ok: true});
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const {role, loginId, password} = req.body ?? {};
    const rawId = String(loginId ?? '').trim();
    const rawPass = String(password ?? '');

    if (!rawId || !rawPass) {
      res.status(400).json({error: 'Login ID and password are required.'});
      return;
    }

    if (role === 'admin') {
      if (rawId.toLowerCase() !== ADMIN_ID || !store.verifyAdminPassword(rawPass, ADMIN_PASSWORD)) {
        res.status(401).json({error: 'Invalid admin ID or password.'});
        return;
      }

      const user: AuthSessionUser = {
        role: 'admin',
        id: 'ADMIN',
        displayName: 'STCLRC Administrator',
      };
      const token = issueSessionToken(user);
      res.cookie(COOKIE_NAME, token, {httpOnly: true, sameSite: 'lax', path: '/'});
      res.json({user, token});
      return;
    }

    const chestNumber = parseChestLoginId(rawId);
    if (!chestNumber) {
      res.status(401).json({
        error: 'Invalid Trainee ID. Format must be STCLRC0001 to STCLRC0920 (4-digit chest number).',
      });
      return;
    }

    const formattedId = formatChestLoginId(chestNumber);
    if (!store.verifyTraineePassword(formattedId, rawPass, DEFAULT_TRAINEE_PASSWORD)) {
      res.status(401).json({error: 'Incorrect trainee password.'});
      return;
    }

    const user: AuthSessionUser = {
      role: 'trainee',
      id: formattedId,
      displayName: `Trainee Chest #${String(chestNumber).padStart(4, '0')}`,
      chestNumber,
    };
    const token = issueSessionToken(user);
    res.cookie(COOKIE_NAME, token, {httpOnly: true, sameSite: 'lax', path: '/'});
    res.json({user, token});
  });

  // Auth: Change Password (available after login for both Admin & Trainee)
  app.post('/api/auth/change-password', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({error: 'Session expired. Please sign in again and retry.'});
      return;
    }

    const currentPassword = String(req.body?.currentPassword ?? '');
    const newPassword = String(req.body?.newPassword ?? '');
    const confirmPassword = String(req.body?.confirmPassword ?? '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({error: 'Current password, new password, and confirmation are required.'});
      return;
    }
    if (newPassword.length < 4) {
      res.status(400).json({error: 'New password must be at least 4 characters long.'});
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({error: 'New password and confirmation do not match.'});
      return;
    }
    if (newPassword === currentPassword) {
      res.status(400).json({error: 'New password must be different from your current password.'});
      return;
    }

    if (user.role === 'admin') {
      if (!store.verifyAdminPassword(currentPassword, ADMIN_PASSWORD)) {
        res.status(401).json({error: 'Current admin password is incorrect.'});
        return;
      }
      store.setAdminPassword(newPassword);
      const freshToken = issueSessionToken(user);
      res.cookie(COOKIE_NAME, freshToken, {httpOnly: true, sameSite: 'lax', path: '/'});
      res.json({
        ok: true,
        token: freshToken,
        message: 'Admin password updated successfully. Use your new password on your next sign-in.',
      });
      return;
    }

    if (!store.verifyTraineePassword(user.id, currentPassword, DEFAULT_TRAINEE_PASSWORD)) {
      res.status(401).json({error: 'Current password is incorrect.'});
      return;
    }
    store.setTraineePassword(user.id, newPassword);
    const freshToken = issueSessionToken(user);
    res.cookie(COOKIE_NAME, freshToken, {httpOnly: true, sameSite: 'lax', path: '/'});
    res.json({
      ok: true,
      token: freshToken,
      message: `Password updated successfully for ${user.id}.`,
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies[COOKIE_NAME]) {
      revokedTokens.add(cookies[COOKIE_NAME]);
    }
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      revokedTokens.add(authHeader.slice(7).trim());
    }
    res.clearCookie(COOKIE_NAME, {path: '/'});
    res.json({ok: true});
  });

  // Public auth/session info — never exposes feedback scores or submission counts
  app.get('/api/auth/me', (req, res) => {
    const user = getAuthenticatedUser(req);
    const db = store.getDb();
    res.json({
      user,
      session: db.session,
      activeTeacherCount: db.teachers.filter((t) => t.active !== false).length,
      activeQuestionCount: db.questions.filter((q) => q.active).length,
    });
  });

  // Trainee: Portal data (strictly NO aggregate feedback results or other trainees' data)
  app.get('/api/trainee/portal', requireRole('trainee'), (req, res) => {
    const user = (req as express.Request & {user: AuthSessionUser}).user;
    const db = store.getDb();
    const submission = db.submissions[user.id];
    const activeTeachers = db.teachers.filter((t) => t.active !== false);
    const activeQuestions = [...db.questions]
      .filter((q) => q.active)
      .sort((a, b) => a.order - b.order);

    const notifications = db.notifications
      .filter(
        (n) =>
          n.audience === 'all' ||
          (n.audience === 'trainee' && n.targetTraineeId === user.id),
      )
      .slice(0, 10)
      .map((n) => ({
        id: n.id,
        type: n.type,
        audience: n.audience,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt,
        readByAdmin: true,
      }));

    // Once submitted, trainee receives confirmation without exposing feedback data/scores
    const sanitizedSubmission =
      submission.status === 'submitted'
        ? {
            ...submission,
            evaluations: {},
          }
        : submission;

    res.json({
      session: db.session,
      papers: PAPERS,
      teachers: activeTeachers,
      questions: activeQuestions,
      submission: sanitizedSubmission,
      notifications,
    });
  });

  // Trainee: Save draft progress
  app.post('/api/trainee/draft', requireRole('trainee'), (req, res) => {
    const user = (req as express.Request & {user: AuthSessionUser}).user;
    const db = store.getDb();
    const timeState = getSessionTimeState(db.session);

    if (!timeState.isOpen) {
      res.status(403).json({
        error: timeState.isScheduled
          ? 'The evaluation window has not started yet.'
          : 'The feedback window has closed. Submissions are locked.',
      });
      return;
    }

    const existing = db.submissions[user.id];
    if (!existing) {
      res.status(404).json({error: 'Trainee record not found.'});
      return;
    }
    if (existing.status === 'submitted') {
      res.status(409).json({error: 'Feedback already submitted and locked.'});
      return;
    }

    const incoming = (req.body?.evaluations ?? {}) as EvaluationMap;
    const nowIso = new Date().toISOString();

    existing.evaluations = incoming;
    existing.status =
      countCompletedTeachers(incoming, db.teachers, db.questions) > 0 ||
      Object.keys(incoming).length > 0
        ? 'draft'
        : 'pending';
    if (!existing.startedAt) {
      existing.startedAt = nowIso;
    }
    existing.updatedAt = nowIso;
    store.save();

    res.json({
      submission: existing,
      completedCount: countCompletedTeachers(existing.evaluations, db.teachers, db.questions),
    });
  });

  // Trainee: Final submit all active teacher evaluations
  app.post('/api/trainee/submit', requireRole('trainee'), (req, res) => {
    const user = (req as express.Request & {user: AuthSessionUser}).user;
    const db = store.getDb();
    const timeState = getSessionTimeState(db.session);

    if (!timeState.isOpen) {
      res.status(403).json({
        error: timeState.isScheduled
          ? 'The evaluation window has not opened yet.'
          : 'Time expired! The feedback window is now closed.',
      });
      return;
    }

    const existing = db.submissions[user.id];
    if (!existing) {
      res.status(404).json({error: 'Trainee record not found.'});
      return;
    }
    if (existing.status === 'submitted') {
      res.status(409).json({error: 'You have already submitted your feedback.'});
      return;
    }

    const incoming = (req.body?.evaluations ?? existing.evaluations ?? {}) as EvaluationMap;
    const check = validateAllTeacherEvaluations(incoming, db.teachers, db.questions);
    if (!check.valid) {
      res.status(400).json({
        error: `Please complete ratings for all active faculty before submitting. ${check.missingTeacherIds.length} teacher(s) still remaining.`,
        missingTeacherIds: check.missingTeacherIds,
      });
      return;
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const startedMs = existing.startedAt ? new Date(existing.startedAt).getTime() : nowMs - 60000;
    const durationSeconds = Math.max(15, Math.round((nowMs - startedMs) / 1000));

    existing.evaluations = incoming;
    existing.status = 'submitted';
    if (!existing.startedAt) existing.startedAt = new Date(startedMs).toISOString();
    existing.updatedAt = nowIso;
    existing.submittedAt = nowIso;
    existing.durationSeconds = durationSeconds;

    const allSubs = Object.values(db.submissions);
    const submittedCount = allSubs.filter((s) => s.status === 'submitted').length;

    const traineeReceiptNotification = store.addNotification({
      type: 'trainee_submitted',
      audience: 'trainee',
      targetTraineeId: user.id,
      title: 'Evaluation Receipt Confirmed',
      message: `${user.id} successfully recorded feedback. Results are confidentially available only in the Admin Panel.`,
      readByAdmin: true,
    });

    store.addNotification({
      type: 'trainee_submitted',
      audience: 'admin',
      title: `Trainee ${user.id} Completed Feedback`,
      message: `${user.id} submitted all faculty ratings in ${Math.round(durationSeconds / 60)}m ${durationSeconds % 60}s (${submittedCount}/${TOTAL_TRAINEES} completed).`,
      readByAdmin: false,
      metadata: {
        traineeId: user.id,
        submittedCount,
        totalTrainees: TOTAL_TRAINEES,
      },
    });

    if (submittedCount === TOTAL_TRAINEES && !db.session.completionNotifiedAt) {
      store.triggerSessionCompletionNotification('all_submitted');
    }

    res.json({
      submission: {
        ...existing,
        evaluations: {},
      },
      receiptNotification: traineeReceiptNotification,
    });
  });

  // Admin: Dashboard analytics (ONLY place where feedback data & analytics live)
  app.get('/api/admin/dashboard', requireRole('admin'), (_req, res) => {
    const db = store.getDb();
    const allSubs = Object.values(db.submissions);

    const submittedSubs = allSubs.filter((s) => s.status === 'submitted');
    const draftCount = allSubs.filter((s) => s.status === 'draft').length;
    const pendingCount = TOTAL_TRAINEES - submittedSubs.length - draftCount;
    const completionRate = Number(((submittedSubs.length / TOTAL_TRAINEES) * 100).toFixed(1));

    const sortedQuestions = [...db.questions].sort((a, b) => a.order - b.order);
    const teacherStats = calculateTeacherStats(db.teachers, allSubs, sortedQuestions);
    const paperStats = calculatePaperStats(PAPERS, teacherStats);
    const activeTeachers = teacherStats.filter((t) => t.responseCount > 0);

    const overallAverageRating =
      activeTeachers.length > 0
        ? Number((activeTeachers.reduce((acc, t) => acc + t.overallAverage, 0) / activeTeachers.length).toFixed(2))
        : 0;

    const durations = submittedSubs
      .map((s) => s.durationSeconds)
      .filter((d): d is number => typeof d === 'number' && d > 0);
    const avgCompletionDurationSeconds =
      durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    const sortedByScore = [...activeTeachers].sort((a, b) => b.overallAverage - a.overallAverage);

    const adminNotifications = db.notifications.filter(
      (n) => n.audience === 'admin' || n.audience === 'all',
    );
    const unreadNotificationCount = adminNotifications.filter((n) => !n.readByAdmin).length;

    res.json({
      session: db.session,
      papers: PAPERS,
      teachers: db.teachers,
      questions: sortedQuestions,
      summary: {
        totalTrainees: TOTAL_TRAINEES,
        submittedCount: submittedSubs.length,
        draftCount,
        pendingCount,
        completionRate,
        overallAverageRating,
        avgCompletionDurationSeconds,
        topTeacher: sortedByScore[0] ?? null,
        lowestTeacher: sortedByScore[sortedByScore.length - 1] ?? null,
      },
      teacherStats,
      paperStats,
      timeline: buildSubmissionTimeline(db.submissions),
      notifications: adminNotifications.slice(0, 30),
      unreadNotificationCount,
    });
  });

  // Admin: Searchable 920-Trainee Roster
  app.get('/api/admin/roster', requireRole('admin'), (req, res) => {
    const db = store.getDb();
    const search = String(req.query.search ?? '').trim().toUpperCase();
    const statusFilter = String(req.query.status ?? 'all');
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(10, Number(req.query.limit ?? 50)));

    let rows: TraineeRosterRow[] = Object.values(db.submissions)
      .sort((a, b) => a.chestNumber - b.chestNumber)
      .map((s) => ({
        traineeId: s.traineeId,
        chestNumber: s.chestNumber,
        status: s.status,
        ratedCount: countCompletedTeachers(s.evaluations, db.teachers, db.questions),
        startedAt: s.startedAt,
        updatedAt: s.updatedAt,
        submittedAt: s.submittedAt,
        durationSeconds: s.durationSeconds,
      }));

    if (statusFilter === 'submitted' || statusFilter === 'draft' || statusFilter === 'pending') {
      rows = rows.filter((r) => r.status === statusFilter);
    }

    if (search) {
      rows = rows.filter(
        (r) =>
          r.traineeId.includes(search) ||
          String(r.chestNumber).padStart(4, '0').includes(search) ||
          String(r.chestNumber) === search,
      );
    }

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const slice = rows.slice((safePage - 1) * limit, safePage * limit);

    res.json({
      rows: slice,
      total,
      page: safePage,
      limit,
      totalPages,
      activeTeacherCount: db.teachers.filter((t) => t.active !== false).length,
    });
  });

  function buildRosterRows(db: ReturnType<typeof store.getDb>): Record<string, string | number>[] {
    const activeTeacherCount = db.teachers.filter((t) => t.active !== false).length;
    const ratedCol = `FacultyRatedOutOf_${activeTeacherCount}`;
    return Object.values(db.submissions)
      .sort((a, b) => a.chestNumber - b.chestNumber)
      .map((s) => ({
        TraineeID: s.traineeId,
        ChestNumber: String(s.chestNumber).padStart(4, '0'),
        Status: s.status,
        [ratedCol]: countCompletedTeachers(s.evaluations, db.teachers, db.questions),
        StartedAt_IST: s.startedAt ? formatKolkataDateTime(s.startedAt) : '',
        SubmittedAt_IST: s.submittedAt ? formatKolkataDateTime(s.submittedAt) : '',
        DurationSeconds: s.durationSeconds ?? '',
      }));
  }

  function buildTeacherSummaryRows(db: ReturnType<typeof store.getDb>): Record<string, string | number>[] {
    const activeQuestions = [...db.questions].filter((q) => q.active).sort((a, b) => a.order - b.order);
    const stats = calculateTeacherStats(db.teachers, Object.values(db.submissions), activeQuestions).sort(
      (a, b) => a.rank - b.rank,
    );
    return stats.map((st) => {
      const row: Record<string, string | number> = {
        Rank: st.rank,
        TeacherID: st.teacher.id,
        TeacherCode: st.teacher.code,
        PrimarySubjectCode: `Paper-${st.teacher.paperNumber}`,
        InstructorName: st.teacher.name,
        MobileNumber: st.teacher.phone ?? '',
        Designation: st.teacher.designation,
        SubjectTitle: st.teacher.subjectTopic,
        Features: st.teacher.features ?? '',
        Status: st.teacher.active === false ? 'Inactive' : 'Active',
        Responses: st.responseCount,
      };
      for (const q of activeQuestions) {
        row[`${q.shortLabel}_Avg`] = Number((st.criteriaAverages[q.id] ?? 0).toFixed(2));
      }
      row.OverallAverage = Number(st.overallAverage.toFixed(2));
      row.PerformanceBand = st.performanceBand;
      return row;
    });
  }

  function buildPaperSummaryRows(db: ReturnType<typeof store.getDb>): Record<string, string | number>[] {
    const activeQuestions = [...db.questions].filter((q) => q.active).sort((a, b) => a.order - b.order);
    const teacherStats = calculateTeacherStats(db.teachers, Object.values(db.submissions), activeQuestions);
    const paperStats = calculatePaperStats(PAPERS, teacherStats);
    return paperStats.map((p) => ({
      PaperNumber: p.paperNumber,
      PaperTitle: p.title,
      TeacherCount: p.teacherCount,
      TotalResponses: p.totalResponses,
      AverageScore: Number(p.averageScore.toFixed(2)),
      TopFaculty: p.topTeacherName ?? 'N/A',
      TopScore: Number(p.topTeacherScore.toFixed(2)),
    }));
  }

  function buildDetailedMatrixRows(db: ReturnType<typeof store.getDb>): Record<string, string | number>[] {
    const activeQuestions = [...db.questions].filter((q) => q.active).sort((a, b) => a.order - b.order);
    const submitted = Object.values(db.submissions)
      .filter((s) => s.status === 'submitted')
      .sort((a, b) => a.chestNumber - b.chestNumber);

    const rows: Record<string, string | number>[] = [];
    for (const sub of submitted) {
      const subIst = sub.submittedAt ? formatKolkataDateTime(sub.submittedAt) : '';
      for (const teacher of db.teachers) {
        const ev = sub.evaluations[teacher.id];
        if (!ev) continue;
        const scores = activeQuestions.map((q) => getQuestionScore(ev, q.id));
        const validScores = scores.filter((n) => n >= 1 && n <= 5);
        if (validScores.length === 0) continue;
        const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;

        const row: Record<string, string | number> = {
          TraineeID: sub.traineeId,
          ChestNumber: String(sub.chestNumber).padStart(4, '0'),
          SubmittedAt_IST: subIst,
          PaperNumber: teacher.paperNumber,
          TeacherID: teacher.id,
          TeacherCode: teacher.code,
          TeacherName: teacher.name,
        };
        activeQuestions.forEach((q, idx) => {
          row[q.shortLabel] = scores[idx];
        });
        row.AverageRating = Number(avg.toFixed(2));
        row.Comment = ev.comment ?? '';
        rows.push(row);
      }
    }
    return rows;
  }

  function buildCommentsRows(db: ReturnType<typeof store.getDb>): Record<string, string | number>[] {
    const activeQuestions = [...db.questions].filter((q) => q.active).sort((a, b) => a.order - b.order);
    const stats = calculateTeacherStats(db.teachers, Object.values(db.submissions), activeQuestions);
    const rows: Record<string, string | number>[] = [];
    for (const st of stats) {
      for (const cm of st.comments) {
        rows.push({
          PaperNumber: st.teacher.paperNumber,
          TeacherCode: st.teacher.code,
          TeacherName: st.teacher.name,
          TraineeID: cm.traineeId,
          AverageRating: Number(cm.averageRating.toFixed(2)),
          SubmittedAt_IST: cm.submittedAt ? formatKolkataDateTime(cm.submittedAt) : '',
          Comment: cm.comment,
        });
      }
    }
    return rows;
  }

  // Admin: Export 1 — Trainee Completion Roster XLSX (IST timestamps)
  app.get('/api/admin/roster/export', requireRole('admin'), (_req, res) => {
    const db = store.getDb();
    sendXlsx(res, 'stclrc-trainee-roster-ist.xlsx', [
      {name: 'Trainee Roster', rows: buildRosterRows(db)},
    ]);
  });

  // Admin: Export 2 — Teacher-wise Performance Summary XLSX
  app.get('/api/admin/export/teachers-summary', requireRole('admin'), (_req, res) => {
    const db = store.getDb();
    sendXlsx(res, 'stclrc-teachers-performance-summary.xlsx', [
      {name: 'Teachers Summary', rows: buildTeacherSummaryRows(db)},
    ]);
  });

  // Admin: Export 3 — Paper-wise Summary XLSX
  app.get('/api/admin/export/papers-summary', requireRole('admin'), (_req, res) => {
    const db = store.getDb();
    sendXlsx(res, 'stclrc-paper-wise-summary.xlsx', [
      {name: 'Paper Summary', rows: buildPaperSummaryRows(db)},
    ]);
  });

  // Admin: Export 4 — Detailed Raw Trainee-by-Teacher Feedback XLSX
  app.get('/api/admin/export/detailed-feedback', requireRole('admin'), (_req, res) => {
    const db = store.getDb();
    sendXlsx(res, 'stclrc-detailed-feedback-matrix.xlsx', [
      {name: 'Detailed Matrix', rows: buildDetailedMatrixRows(db)},
    ]);
  });

  // Admin: Export 5 — Written Remarks / Comments XLSX
  app.get('/api/admin/export/comments', requireRole('admin'), (_req, res) => {
    const db = store.getDb();
    sendXlsx(res, 'stclrc-faculty-comments.xlsx', [
      {name: 'Faculty Remarks', rows: buildCommentsRows(db)},
    ]);
  });

  // Admin: Export 6 — Complete Multi-Sheet Excel Workbook XLSX
  app.get('/api/admin/export/full-workbook', requireRole('admin'), (_req, res) => {
    const db = store.getDb();
    sendXlsx(res, 'stclrc-complete-evaluation-report.xlsx', [
      {name: 'Teachers Summary', rows: buildTeacherSummaryRows(db)},
      {name: 'Paper Summary', rows: buildPaperSummaryRows(db)},
      {name: 'Trainee Roster', rows: buildRosterRows(db)},
      {name: 'Faculty Remarks', rows: buildCommentsRows(db)},
      {name: 'Detailed Matrix', rows: buildDetailedMatrixRows(db)},
    ]);
  });

  // Admin: Export 7 — Complete JSON Report Archive (kept for API compatibility)
  app.get('/api/admin/export/full-report-json', requireRole('admin'), (_req, res) => {
    const db = store.getDb();
    const activeQuestions = [...db.questions].filter((q) => q.active).sort((a, b) => a.order - b.order);
    const allSubs = Object.values(db.submissions);
    const teacherStats = calculateTeacherStats(db.teachers, allSubs, activeQuestions);
    const paperStats = calculatePaperStats(PAPERS, teacherStats);

    const payload = {
      exportedAtIST: formatKolkataDateTime(new Date()),
      timezone: 'Asia/Kolkata',
      session: {
        ...db.session,
        startTimeIST: formatKolkataDateTime(db.session.startTime),
        endTimeIST: formatKolkataDateTime(db.session.endTime),
      },
      questions: db.questions,
      teachers: db.teachers,
      paperStats,
      teacherStats,
      submittedEvaluations: allSubs.filter((s) => s.status === 'submitted'),
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="stclrc-full-evaluation-report.json"');
    res.send(JSON.stringify(payload, null, 2));
  });

  // Admin: Session window management (supports fixed Kolkata Start/End Date & Time OR duration)
  app.post('/api/admin/session/update', requireRole('admin'), (req, res) => {
    const db = store.getDb();
    const {action, title, batchName, durationMinutes, extendMinutes, startTime, endTime} = req.body ?? {};
    const now = Date.now();

    if (typeof title === 'string' && title.trim()) {
      db.session.title = title.trim();
    }
    if (typeof batchName === 'string' && batchName.trim()) {
      db.session.batchName = batchName.trim();
    }

    if (action === 'close') {
      db.session.isClosedManually = true;
      store.save();
      const notification = store.triggerSessionCompletionNotification('manual');
      res.json({session: db.session, notification});
      return;
    }

    if (action === 'schedule' && typeof startTime === 'string' && typeof endTime === 'string') {
      const startMs = new Date(startTime).getTime();
      const endMs = new Date(endTime).getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        res.status(400).json({error: 'End Date & Time (IST) must be strictly after Start Date & Time (IST).'});
        return;
      }
      db.session.startTime = new Date(startMs).toISOString();
      db.session.endTime = new Date(endMs).toISOString();
      db.session.durationMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));
      db.session.isClosedManually = false;
      db.session.completionNotifiedAt = null;
      const notification = store.addNotification({
        type: 'session_started',
        audience: 'all',
        title: 'Fixed Evaluation Schedule Updated (IST)',
        message: `Schedule set from ${formatKolkataDateTime(db.session.startTime)} to ${formatKolkataDateTime(db.session.endTime)}.`,
        readByAdmin: true,
      });
      res.json({session: db.session, notification});
      return;
    }

    if (action === 'extend' && Number.isFinite(Number(extendMinutes))) {
      const addMins = Math.max(1, Math.min(480, Number(extendMinutes)));
      const currentEnd = Math.max(now, new Date(db.session.endTime).getTime());
      db.session.endTime = new Date(currentEnd + addMins * 60000).toISOString();
      db.session.durationMinutes += addMins;
      db.session.isClosedManually = false;
      db.session.completionNotifiedAt = null;
      const notification = store.addNotification({
        type: 'session_extended',
        audience: 'all',
        title: `Session Extended by ${addMins} Minutes`,
        message: `Admin extended the evaluation window by ${addMins} minutes. New deadline: ${formatKolkataDateTime(db.session.endTime)}.`,
        readByAdmin: true,
      });
      res.json({session: db.session, notification});
      return;
    }

    if (Number.isFinite(Number(durationMinutes))) {
      const mins = Math.max(1, Math.min(1440, Number(durationMinutes)));
      db.session.durationMinutes = mins;
      db.session.startTime = new Date(now).toISOString();
      db.session.endTime = new Date(now + mins * 60000).toISOString();
      db.session.isClosedManually = false;
      db.session.completionNotifiedAt = null;
      const notification = store.addNotification({
        type: 'session_started',
        audience: 'all',
        title: `Fixed Feedback Timer Set (${mins} Minutes)`,
        message: `Evaluation window "${db.session.title}" is open until ${formatKolkataDateTime(db.session.endTime)}.`,
        readByAdmin: true,
      });
      res.json({session: db.session, notification});
      return;
    }

    store.save();
    res.json({session: db.session});
  });

  // Admin: Explicitly send Session Completion Notification
  app.post('/api/admin/session/complete-notify', requireRole('admin'), (req, res) => {
    const db = store.getDb();
    const closeWindow = Boolean(req.body?.closeWindow);
    if (closeWindow) {
      db.session.isClosedManually = true;
    }
    const notification = store.triggerSessionCompletionNotification('manual');
    res.json({session: db.session, notification});
  });

  // Admin Settings: Create Instructor
  app.post('/api/admin/teachers', requireRole('admin'), (req, res) => {
    const db = store.getDb();
    const {name, code, phone, paperNumber, subjectTopic, designation, features, active} = req.body ?? {};
    const trimmedName = String(name ?? '').trim();
    const paperNum = Number(paperNumber);
    if (!trimmedName || !Number.isInteger(paperNum) || paperNum < 1 || paperNum > 12) {
      res.status(400).json({error: 'Instructor name and valid Paper (1–12) are required.'});
      return;
    }

    const nextNum = db.teachers.length + 1;
    const newTeacher: Teacher = {
      id: `TCH-${String(nextNum).padStart(2, '0')}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
      code: String(code ?? '').trim() || `T${nextNum}`,
      name: trimmedName,
      phone: String(phone ?? '').trim(),
      paperNumber: paperNum,
      subjectTopic: String(subjectTopic ?? '').trim() || 'Assigned Module',
      designation: String(designation ?? '').trim() || 'Faculty',
      features: String(features ?? '').trim(),
      active: active !== false,
    };

    db.teachers.push(newTeacher);
    store.save();
    res.json({teacher: newTeacher, teachers: db.teachers});
  });

  // Admin Settings: Update Instructor & Features
  app.post('/api/admin/teachers/:teacherId', requireRole('admin'), (req, res) => {
    const db = store.getDb();
    const teacher = db.teachers.find((t) => t.id === req.params.teacherId);
    if (!teacher) {
      res.status(404).json({error: 'Instructor not found.'});
      return;
    }
    const {name, code, phone, paperNumber, subjectTopic, designation, features, active} = req.body ?? {};
    if (typeof name === 'string' && name.trim()) teacher.name = name.trim();
    if (typeof code === 'string' && code.trim()) teacher.code = code.trim();
    if (typeof phone === 'string') teacher.phone = phone.trim();
    if (Number.isInteger(Number(paperNumber)) && Number(paperNumber) >= 1 && Number(paperNumber) <= 12) {
      teacher.paperNumber = Number(paperNumber);
    }
    if (typeof subjectTopic === 'string' && subjectTopic.trim()) teacher.subjectTopic = subjectTopic.trim();
    if (typeof designation === 'string' && designation.trim()) teacher.designation = designation.trim();
    if (typeof features === 'string') teacher.features = features.trim();
    if (typeof active === 'boolean') teacher.active = active;
    store.save();
    res.json({teacher, teachers: db.teachers});
  });

  // Admin Settings: Delete Instructor
  app.delete('/api/admin/teachers/:teacherId', requireRole('admin'), (req, res) => {
    const db = store.getDb();
    const idx = db.teachers.findIndex((t) => t.id === req.params.teacherId);
    if (idx === -1) {
      res.status(404).json({error: 'Instructor not found.'});
      return;
    }
    if (db.teachers.length <= 1) {
      res.status(400).json({error: 'At least one instructor must remain configured.'});
      return;
    }
    db.teachers.splice(idx, 1);
    store.save();
    res.json({ok: true, teachers: db.teachers});
  });

  // Admin Settings: Create Evaluation Question
  app.post('/api/admin/questions', requireRole('admin'), (req, res) => {
    const db = store.getDb();
    const {label, labelBn, labelHi, shortLabel, description, descriptionBn, descriptionHi, active} =
      req.body ?? {};
    const trimmedLabel = String(label ?? '').trim();
    if (!trimmedLabel) {
      res.status(400).json({error: 'Question label is required.'});
      return;
    }

    const newQuestion: QuestionItem = {
      id: `q_${crypto.randomUUID().slice(0, 8)}`,
      label: trimmedLabel,
      labelBn: String(labelBn ?? '').trim() || undefined,
      labelHi: String(labelHi ?? '').trim() || undefined,
      shortLabel: String(shortLabel ?? '').trim() || trimmedLabel.slice(0, 14),
      description: String(description ?? '').trim() || 'Rate on a 1 (Poor) to 5 (Excellent) scale.',
      descriptionBn: String(descriptionBn ?? '').trim() || undefined,
      descriptionHi: String(descriptionHi ?? '').trim() || undefined,
      active: active !== false,
      order: db.questions.length + 1,
    };

    db.questions.push(newQuestion);
    store.save();
    res.json({question: newQuestion, questions: db.questions});
  });

  // Admin Settings: Update Evaluation Question
  app.post('/api/admin/questions/:questionId', requireRole('admin'), (req, res) => {
    const db = store.getDb();
    const question = db.questions.find((q) => q.id === req.params.questionId);
    if (!question) {
      res.status(404).json({error: 'Question not found.'});
      return;
    }

    const {label, labelBn, labelHi, shortLabel, description, descriptionBn, descriptionHi, active, order} =
      req.body ?? {};
    if (typeof active === 'boolean' && active === false) {
      const remainingActive = db.questions.filter((q) => q.id !== question.id && q.active).length;
      if (remainingActive < 1) {
        res.status(400).json({error: 'At least 1 active evaluation question is required.'});
        return;
      }
      question.active = false;
    } else if (typeof active === 'boolean') {
      question.active = true;
    }

    if (typeof label === 'string' && label.trim()) question.label = label.trim();
    if (typeof labelBn === 'string') question.labelBn = labelBn.trim() || undefined;
    if (typeof labelHi === 'string') question.labelHi = labelHi.trim() || undefined;
    if (typeof shortLabel === 'string' && shortLabel.trim()) question.shortLabel = shortLabel.trim();
    if (typeof description === 'string') question.description = description.trim();
    if (typeof descriptionBn === 'string') question.descriptionBn = descriptionBn.trim() || undefined;
    if (typeof descriptionHi === 'string') question.descriptionHi = descriptionHi.trim() || undefined;
    if (Number.isFinite(Number(order))) question.order = Number(order);

    store.save();
    res.json({question, questions: db.questions});
  });

  // Admin Settings: Delete Evaluation Question
  app.delete('/api/admin/questions/:questionId', requireRole('admin'), (req, res) => {
    const db = store.getDb();
    const target = db.questions.find((q) => q.id === req.params.questionId);
    if (!target) {
      res.status(404).json({error: 'Question not found.'});
      return;
    }
    const remainingActive = db.questions.filter((q) => q.id !== target.id && q.active).length;
    if (remainingActive < 1) {
      res.status(400).json({error: 'At least 1 active evaluation question must remain.'});
      return;
    }
    db.questions = db.questions
      .filter((q) => q.id !== target.id)
      .map((q, idx) => ({...q, order: idx + 1}));
    store.save();
    res.json({ok: true, questions: db.questions});
  });

  // Admin: Mark notifications read
  app.post('/api/admin/notifications/read', requireRole('admin'), (_req, res) => {
    const db = store.getDb();
    for (const item of db.notifications) {
      item.readByAdmin = true;
    }
    store.save();
    res.json({ok: true});
  });

  // Admin: Reset all trainee-filled feedback data (submissions + drafts)
  app.post('/api/admin/feedback/reset', requireRole('admin'), (req, res) => {
    const confirmText = String(req.body?.confirmText ?? '').trim().toUpperCase();
    if (confirmText !== 'RESET') {
      res.status(400).json({error: 'Confirmation required. Send confirmText: "RESET".'});
      return;
    }
    const {clearedSubmitted, clearedDrafts} = store.resetAllTraineeFeedback();
    res.json({
      ok: true,
      clearedSubmitted,
      clearedDrafts,
      message: `All trainee feedback data reset (${clearedSubmitted} submitted and ${clearedDrafts} draft records cleared). All ${TOTAL_TRAINEES} trainees are now Pending.`,
    });
  });

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.resolve(currentDir, 'dist');
  const indexHtmlPath = path.join(distPath, 'index.html');
  const hasBuiltDist = fs.existsSync(indexHtmlPath);
  const isDevMode =
    process.env.NODE_ENV === 'development' || process.env.npm_lifecycle_event === 'dev';
  const useProductionStatic = hasBuiltDist && !isDevMode;

  if (!useProductionStatic) {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(indexHtmlPath);
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`STCLRC Portal server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
