import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  BarChart3,
  Bell,
  CalendarClock,
  Clock,
  Download,
  FileSpreadsheet,
  KeyRound,
  LogOut,
  Printer,
  RotateCcw,
  Search,
  Send,
  Settings,
  Users,
  X,
} from 'lucide-react';
import {
  formatKolkataDateTime,
  formatKolkataTime,
  fromKolkataDatetimeLocalValue,
  getSessionTimeState,
  toKolkataDatetimeLocalValue,
} from '../shared/domain';
import type {
  AuthSessionUser,
  NotificationItem,
  PaperInfo,
  PaperPerformanceStat,
  QuestionItem,
  SessionConfig,
  SubmissionTimelinePoint,
  Teacher,
  TeacherPerformanceStat,
  TraineeRosterRow,
} from '../shared/types';
import {apiFetch, downloadWithAuth} from '../utils/api';
import {AdminSettingsPanel} from './AdminSettingsPanel';
import {ChangePasswordModal} from './ChangePasswordModal';
import {ResetFeedbackModal} from './ResetFeedbackModal';
import {
  PaperComparisonChart,
  SubmissionVelocityChart,
  TeacherPerformanceChart,
} from './PerformanceCharts';

interface AdminDashboardProps {
  user: AuthSessionUser;
  onLogout: () => void;
}

interface AdminDashboardResponse {
  session: SessionConfig;
  papers: PaperInfo[];
  teachers: Teacher[];
  questions: QuestionItem[];
  summary: {
    totalTrainees: number;
    submittedCount: number;
    draftCount: number;
    pendingCount: number;
    completionRate: number;
    overallAverageRating: number;
    avgCompletionDurationSeconds: number;
    topTeacher: TeacherPerformanceStat | null;
    lowestTeacher: TeacherPerformanceStat | null;
  };
  teacherStats: TeacherPerformanceStat[];
  paperStats: PaperPerformanceStat[];
  timeline: SubmissionTimelinePoint[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
}

interface RosterResponse {
  rows: TraineeRosterRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  activeTeacherCount: number;
}

type AdminTab = 'overview' | 'teachers' | 'roster' | 'session' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({user, onLogout}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Teacher inspection & filtering
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherPaperFilter, setTeacherPaperFilter] = useState<number | 'all'>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherPerformanceStat | null>(null);

  // Roster state (920 trainees)
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterStatus, setRosterStatus] = useState<'all' | 'submitted' | 'draft' | 'pending'>('all');
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterData, setRosterData] = useState<RosterResponse | null>(null);

  // Session & notification controls
  const [customMinutes, setCustomMinutes] = useState('60');
  const [startIstInput, setStartIstInput] = useState('');
  const [endIstInput, setEndIstInput] = useState('');
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [closeOnNotify, setCloseOnNotify] = useState(false);
  const [actionBanner, setActionBanner] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await apiFetch<AdminDashboardResponse>('/api/admin/dashboard');
      setDashboard(data);
      setStartIstInput((prev) => prev || toKolkataDatetimeLocalValue(data.session.startTime));
      setEndIstInput((prev) => prev || toKolkataDatetimeLocalValue(data.session.endTime));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRoster = useCallback(async () => {
    const params = new URLSearchParams({
      search: rosterSearch,
      status: rosterStatus,
      page: String(rosterPage),
      limit: '50',
    });
    const data = await apiFetch<RosterResponse>(`/api/admin/roster?${params.toString()}`);
    setRosterData(data);
  }, [rosterPage, rosterSearch, rosterStatus]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (activeTab === 'roster') {
      void loadRoster();
    }
  }, [activeTab, loadRoster]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadDashboard();
    }, 10000);
    return () => window.clearInterval(id);
  }, [loadDashboard]);

  const timeState = useMemo(() => {
    return dashboard ? getSessionTimeState(dashboard.session, nowMs) : null;
  }, [dashboard, nowMs]);

  const activeQuestions = useMemo(
    () => (dashboard?.questions ?? []).filter((q) => q.active),
    [dashboard?.questions],
  );

  const filteredTeachers = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.teacherStats
      .filter((t) =>
        teacherPaperFilter === 'all' ? true : t.teacher.paperNumber === teacherPaperFilter,
      )
      .filter((t) => {
        const q = teacherSearch.trim().toLowerCase();
        if (!q) return true;
        return (
          t.teacher.name.toLowerCase().includes(q) ||
          t.teacher.subjectTopic.toLowerCase().includes(q) ||
          t.teacher.code.toLowerCase().includes(q) ||
          (t.teacher.phone ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.rank - b.rank);
  }, [dashboard, teacherPaperFilter, teacherSearch]);

  const handleDownload = async (key: string, url: string, filename: string) => {
    setDownloadingKey(key);
    try {
      await downloadWithAuth(url, filename);
      setActionBanner(`Downloaded ${filename}.`);
    } catch (err) {
      setActionBanner(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleSaveFixedSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError(null);
    const startIso = fromKolkataDatetimeLocalValue(startIstInput);
    const endIso = fromKolkataDatetimeLocalValue(endIstInput);
    if (!startIso || !endIso) {
      setScheduleError('Please enter valid Start and End Date & Time in IST.');
      return;
    }
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setScheduleError('End Date & Time (IST) must be after Start Date & Time (IST).');
      return;
    }
    try {
      const res = await apiFetch<{session: SessionConfig}>('/api/admin/session/update', {
        method: 'POST',
        body: JSON.stringify({
          action: 'schedule',
          startTime: startIso,
          endTime: endIso,
        }),
      });
      setStartIstInput(toKolkataDatetimeLocalValue(res.session.startTime));
      setEndIstInput(toKolkataDatetimeLocalValue(res.session.endTime));
      setActionBanner(
        `Fixed IST schedule saved: ${formatKolkataDateTime(res.session.startTime)} to ${formatKolkataDateTime(res.session.endTime)}.`,
      );
      await loadDashboard();
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Unable to save schedule.');
    }
  };

  const handleSetFixedDuration = async (mins: number) => {
    const res = await apiFetch<{session: SessionConfig}>('/api/admin/session/update', {
      method: 'POST',
      body: JSON.stringify({durationMinutes: mins}),
    });
    setStartIstInput(toKolkataDatetimeLocalValue(res.session.startTime));
    setEndIstInput(toKolkataDatetimeLocalValue(res.session.endTime));
    setActionBanner(`Fixed feedback window set to ${mins} minutes (IST).`);
    await loadDashboard();
  };

  const handleExtendWindow = async (addMins: number) => {
    const res = await apiFetch<{session: SessionConfig}>('/api/admin/session/update', {
      method: 'POST',
      body: JSON.stringify({action: 'extend', extendMinutes: addMins}),
    });
    setEndIstInput(toKolkataDatetimeLocalValue(res.session.endTime));
    setActionBanner(`Feedback window extended by ${addMins} minutes.`);
    await loadDashboard();
  };

  const handleCloseWindow = async () => {
    await apiFetch('/api/admin/session/update', {
      method: 'POST',
      body: JSON.stringify({action: 'close'}),
    });
    setActionBanner('Feedback window closed and completion notification broadcast.');
    await loadDashboard();
  };

  const handleSendCompletionNotification = async () => {
    await apiFetch('/api/admin/session/complete-notify', {
      method: 'POST',
      body: JSON.stringify({closeWindow: closeOnNotify}),
    });
    setActionBanner('Session Completion Notification sent to Admin Console and all Trainees.');
    await loadDashboard();
  };

  const handleMarkNotificationsRead = async () => {
    await apiFetch('/api/admin/notifications/read', {method: 'POST'});
    await loadDashboard();
  };

  if (loading || !dashboard || !timeState) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm font-medium text-slate-600">Loading Admin Analytics Dashboard...</div>
      </div>
    );
  }

  const {summary, session} = dashboard;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Left Navigation Sidebar */}
      <aside className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto w-64 shrink-0 bg-white border-r border-slate-200 flex-col justify-between p-5 print:hidden">
        <div className="space-y-6">
          <div>
            <div className="font-display text-lg font-bold tracking-tight text-slate-900">
              STCLRC Admin
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Confidential Feedback Console</div>
          </div>

          <nav aria-label="Admin sections" className="space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" aria-hidden="true" />
              Overview & Graphs
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('teachers')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'teachers'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
              Teachers ({dashboard.teachers.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'roster'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
              Trainee Tracker (920)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('session')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'session'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 shrink-0" aria-hidden="true" />
                Timer & Alerts
              </span>
              {dashboard.unreadNotificationCount > 0 && (
                <span
                  className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                    activeTab === 'session' ? 'bg-blue-900 text-white' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {dashboard.unreadNotificationCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" aria-hidden="true" />
              Settings
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-200 space-y-2.5">
          <div className="text-xs text-slate-500">
            Signed in as <span className="font-semibold text-slate-800">{user.displayName}</span>
          </div>
          <button
            type="button"
            onClick={() => setPasswordModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
            Change Password
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-6 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-display text-base font-bold text-slate-900 lg:hidden whitespace-nowrap">
              STCLRC Admin
            </span>
            <span className="text-sm font-medium text-slate-600 truncate">{session.title}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden xl:inline-flex items-center gap-1.5 text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap">
              Kolkata: {formatKolkataTime(nowMs)}
            </span>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold tabular-nums whitespace-nowrap ${
                timeState.isScheduled
                  ? 'bg-amber-50 text-amber-800'
                  : timeState.isOpen
                    ? 'bg-slate-100 text-slate-900'
                    : 'bg-red-50 text-red-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              {timeState.isScheduled
                ? `Starts in: ${timeState.formattedRemaining}`
                : timeState.isOpen
                  ? `Timer: ${timeState.formattedRemaining}`
                  : 'Window Closed'}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('session')}
              aria-label={`Open notifications (${dashboard.unreadNotificationCount} unread)`}
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-slate-700" aria-hidden="true" />
              <span className="font-mono tabular-nums">{dashboard.unreadNotificationCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setPasswordModalOpen(true)}
              aria-label="Change password"
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
              Password
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Mobile Tab Switcher */}
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto print:hidden">
          {(
            [
              ['overview', 'Overview'],
              ['teachers', 'Teachers'],
              ['roster', 'Trainees'],
              ['session', 'Timer & Alerts'],
              ['settings', 'Settings'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                activeTab === key ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <main className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto space-y-6">
          {actionBanner && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-4 text-sm text-blue-950 print:hidden">
              <span>{actionBanner}</span>
              <button
                type="button"
                onClick={() => setActionBanner(null)}
                aria-label="Dismiss notification banner"
                className="p-1 text-blue-700 hover:text-blue-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 4-Column KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">Submitted Feedbacks</div>
                  <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                    {summary.submittedCount} / {summary.totalTrainees}
                  </div>
                  <div className="mt-1 text-xs text-slate-600 tabular-nums">
                    {summary.completionRate}% completed · {summary.draftCount} drafting
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">Faculty Overall Average</div>
                  <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                    {summary.overallAverageRating.toFixed(2)} / 5.00
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Across {dashboard.teachers.length} faculty · {activeQuestions.length} questions
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">Top Rated Faculty</div>
                  <div className="mt-1.5 font-display text-base font-bold text-slate-900 truncate">
                    {summary.topTeacher?.teacher.name ?? 'N/A'}
                  </div>
                  <div className="mt-1 text-xs text-green-700 font-mono font-semibold tabular-nums">
                    {summary.topTeacher
                      ? `${summary.topTeacher.overallAverage.toFixed(2)} / 5.0 · Paper ${summary.topTeacher.teacher.paperNumber}`
                      : 'Awaiting submissions'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">Lowest / Attention Needed</div>
                  <div className="mt-1.5 font-display text-base font-bold text-slate-900 truncate">
                    {summary.lowestTeacher?.teacher.name ?? 'N/A'}
                  </div>
                  <div className="mt-1 text-xs text-amber-700 font-mono font-semibold tabular-nums">
                    {summary.lowestTeacher
                      ? `${summary.lowestTeacher.overallAverage.toFixed(2)} / 5.0 · Paper ${summary.lowestTeacher.teacher.paperNumber}`
                      : 'Awaiting submissions'}
                  </div>
                </div>
              </div>

              {/* Download Various Results Hub */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900">
                      Download Feedback Results & Official Reports
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Export faculty rankings, paper-wise averages, raw trainee matrix, remarks, and completion roster (IST timestamps)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                    Print / Save PDF
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {[
                    {
                      key: 'teachers',
                      label: 'Teachers Performance Summary (XLSX)',
                      url: '/api/admin/export/teachers-summary',
                      file: 'stclrc-teachers-performance-summary.xlsx',
                    },
                    {
                      key: 'papers',
                      label: 'Paper-wise Summary (XLSX)',
                      url: '/api/admin/export/papers-summary',
                      file: 'stclrc-paper-wise-summary.xlsx',
                    },
                    {
                      key: 'detailed',
                      label: 'Detailed Trainee-by-Teacher Matrix (XLSX)',
                      url: '/api/admin/export/detailed-feedback',
                      file: 'stclrc-detailed-feedback-matrix.xlsx',
                    },
                    {
                      key: 'roster',
                      label: '920 Trainee Completion Roster (XLSX)',
                      url: '/api/admin/roster/export',
                      file: 'stclrc-trainee-roster-ist.xlsx',
                    },
                    {
                      key: 'comments',
                      label: 'Faculty Written Remarks (XLSX)',
                      url: '/api/admin/export/comments',
                      file: 'stclrc-faculty-comments.xlsx',
                    },
                    {
                      key: 'workbook',
                      label: 'Complete Multi-Sheet Workbook (XLSX)',
                      url: '/api/admin/export/full-workbook',
                      file: 'stclrc-complete-evaluation-report.xlsx',
                    },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      disabled={downloadingKey === item.key}
                      onClick={() => handleDownload(item.key, item.url, item.file)}
                      className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-medium text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <span className="inline-flex items-center gap-2 truncate">
                        <FileSpreadsheet className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {downloadingKey === item.key ? 'Preparing download...' : item.label}
                        </span>
                      </span>
                      <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>

              <TeacherPerformanceChart
                teacherStats={dashboard.teacherStats}
                questions={dashboard.questions}
                onSelectTeacher={(stat) => setSelectedTeacher(stat)}
              />

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <PaperComparisonChart paperStats={dashboard.paperStats} />
                <SubmissionVelocityChart
                  timeline={dashboard.timeline}
                  submittedCount={summary.submittedCount}
                  draftCount={summary.draftCount}
                  pendingCount={summary.pendingCount}
                  totalTrainees={summary.totalTrainees}
                />
              </div>
            </div>
          )}

          {activeTab === 'teachers' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    Individual Faculty Performance ({dashboard.teachers.length} Teachers)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dynamic scores across all {activeQuestions.length} configured evaluation questions
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="search"
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder="Search teacher or subject..."
                    aria-label="Search teachers"
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white w-52"
                  />
                  <select
                    value={teacherPaperFilter}
                    onChange={(e) =>
                      setTeacherPaperFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                    }
                    aria-label="Filter teachers by paper"
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="all">All Papers ({dashboard.teachers.length})</option>
                    {dashboard.papers.map((p) => (
                      <option key={p.paperNumber} value={p.paperNumber}>
                        Paper {p.paperNumber}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(
                        'teachers-tab',
                        '/api/admin/export/teachers-summary',
                        'stclrc-teachers-performance-summary.xlsx',
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    Export XLSX
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Teacher & Subject</th>
                      <th className="py-3 px-4">Paper</th>
                      {activeQuestions.map((q) => (
                        <th key={q.id} className="py-3 px-3 text-right whitespace-nowrap">
                          {q.shortLabel}
                        </th>
                      ))}
                      <th className="py-3 px-4 text-right">Overall Avg</th>
                      <th className="py-3 px-4">Band</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {filteredTeachers.map((stat) => (
                      <tr key={stat.teacher.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700 tabular-nums">
                          #{stat.rank}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{stat.teacher.name}</div>
                          <div className="text-xs text-slate-500">
                            {stat.teacher.code} · {stat.teacher.subjectTopic}
                            {stat.teacher.phone ? ` · ${stat.teacher.phone}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                          Paper-{stat.teacher.paperNumber}
                        </td>
                        {activeQuestions.map((q) => (
                          <td key={q.id} className="py-3 px-3 text-right font-mono tabular-nums">
                            {(stat.criteriaAverages[q.id] ?? 0).toFixed(2)}
                          </td>
                        ))}
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {stat.overallAverage.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
                          <span
                            className={
                              stat.performanceBand === 'Exemplary'
                                ? 'text-green-700'
                                : stat.performanceBand === 'Proficient'
                                  ? 'text-blue-700'
                                  : stat.performanceBand === 'Developing'
                                    ? 'text-amber-700'
                                    : 'text-red-700'
                            }
                          >
                            {stat.performanceBand}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTeacher(stat)}
                            className="px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md cursor-pointer"
                          >
                            Inspect ({stat.comments.length})
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'roster' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    Trainee Tracking Roster (STCLRC0001 – STCLRC0920)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time completion tracking across all 920 chest numbers (Kolkata Standard Time)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="search"
                    value={rosterSearch}
                    onChange={(e) => {
                      setRosterSearch(e.target.value);
                      setRosterPage(1);
                    }}
                    placeholder="Search STCLRC0001 or chest..."
                    aria-label="Search trainee chest number"
                    className="px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-lg bg-white w-60"
                  />

                  <div className="flex items-center p-0.5 bg-slate-100 rounded-lg">
                    {(
                      [
                        ['all', 'All'],
                        ['submitted', 'Submitted'],
                        ['draft', 'Drafting'],
                        ['pending', 'Pending'],
                      ] as const
                    ).map(([statusKey, label]) => (
                      <button
                        key={statusKey}
                        type="button"
                        onClick={() => {
                          setRosterStatus(statusKey);
                          setRosterPage(1);
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                          rosterStatus === statusKey
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(
                        'roster-xlsx',
                        '/api/admin/roster/export',
                        'stclrc-trainee-roster-ist.xlsx',
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    Export XLSX
                  </button>

                  <button
                    type="button"
                    onClick={() => setResetModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    Reset All Data
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">Trainee ID</th>
                      <th className="py-3 px-4">Chest #</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Faculty Rated</th>
                      <th className="py-3 px-4">Submitted At (IST)</th>
                      <th className="py-3 px-4 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {rosterData?.rows.map((row) => (
                      <tr key={row.traineeId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                          {row.traineeId}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600 tabular-nums">
                          {String(row.chestNumber).padStart(4, '0')}
                        </td>
                        <td className="py-2.5 px-4 text-xs font-semibold">
                          {row.status === 'submitted' ? (
                            <span className="text-green-700">Submitted</span>
                          ) : row.status === 'draft' ? (
                            <span className="text-amber-700">In Progress</span>
                          ) : (
                            <span className="text-slate-500">Pending</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                          {row.ratedCount} / {rosterData.activeTeacherCount}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-600 tabular-nums">
                          {row.submittedAt ? formatKolkataDateTime(row.submittedAt) : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                          {row.durationSeconds
                            ? `${Math.floor(row.durationSeconds / 60)}m ${row.durationSeconds % 60}s`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                    {rosterData && rosterData.rows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                          No trainees match the current filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {rosterData && (
                <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span className="font-mono tabular-nums">
                    Showing page {rosterData.page} of {rosterData.totalPages} ({rosterData.total} records)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={rosterData.page <= 1}
                      onClick={() => setRosterPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 border border-slate-300 rounded-md bg-white disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={rosterData.page >= rosterData.totalPages}
                      onClick={() => setRosterPage((p) => Math.min(rosterData.totalPages, p + 1))}
                      className="px-3 py-1.5 border border-slate-300 rounded-md bg-white disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'session' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Fixed Date & Time (IST) + Timer Controls */}
              <div className="xl:col-span-5 space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Fixed Date & Time Schedule (Kolkata · IST)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Set exact Start and End Date & Time in Asia/Kolkata Standard Time (+05:30)
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Current Status (IST)</span>
                      <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                        {timeState.formattedRemaining}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-700 space-y-0.5">
                      <div>Opens: {formatKolkataDateTime(session.startTime)}</div>
                      <div>Closes: {formatKolkataDateTime(session.endTime)}</div>
                    </div>
                  </div>

                  <form onSubmit={handleSaveFixedSchedule} className="space-y-3">
                    <div>
                      <label htmlFor="ist-start-input" className="block text-xs font-medium text-slate-700 mb-1">
                        Start Date & Time (Kolkata IST)
                      </label>
                      <input
                        id="ist-start-input"
                        type="datetime-local"
                        value={startIstInput}
                        onChange={(e) => setStartIstInput(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="ist-end-input" className="block text-xs font-medium text-slate-700 mb-1">
                        End Date & Time (Kolkata IST)
                      </label>
                      <input
                        id="ist-end-input"
                        type="datetime-local"
                        value={endIstInput}
                        onChange={(e) => setEndIstInput(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    {scheduleError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                        {scheduleError}
                      </div>
                    )}
                    <button
                      type="submit"
                      className="w-full py-2 px-4 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CalendarClock className="w-4 h-4" aria-hidden="true" />
                      Save Fixed Date & Time (IST)
                    </button>
                  </form>

                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="text-xs font-medium text-slate-700">Quick Duration From Now</div>
                    <div className="grid grid-cols-4 gap-2">
                      {[15, 30, 60, 120].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => handleSetFixedDuration(mins)}
                          className="py-2 px-2 text-xs font-mono font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg cursor-pointer"
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(e.target.value)}
                        aria-label="Custom session duration in minutes"
                        className="w-24 px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-lg bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSetFixedDuration(Number(customMinutes) || 60)}
                        className="flex-1 py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                      >
                        Set Custom Mins
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleExtendWindow(15)}
                      className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                    >
                      +15m Extend
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtendWindow(30)}
                      className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                    >
                      +30m Extend
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseWindow}
                      className="ml-auto px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                    >
                      Close Window Now
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Session Completion Notification
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sends full summary metrics to Admin Console and a confidential closure notice to Trainees
                    </p>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={closeOnNotify}
                      onChange={(e) => setCloseOnNotify(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Also lock/close trainee submission window on broadcast
                  </label>

                  <button
                    type="button"
                    onClick={handleSendCompletionNotification}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" aria-hidden="true" />
                    Send Session Completion Notification
                  </button>
                </div>

                <div className="bg-white border border-red-200 rounded-xl p-6 space-y-3">
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900">
                      Reset All Trainee Feedback Data
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Clear all {summary.submittedCount} submitted evaluations and {summary.draftCount} drafts
                      across all {summary.totalTrainees} trainees to start a fresh evaluation cycle. Instructors,
                      questions, and passwords remain unchanged.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(true)}
                    className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    Reset All Trainee Filled Data
                  </button>
                </div>
              </div>

              {/* Notification Feed */}
              <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Admin Notification Center ({dashboard.notifications.length})
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Real-time trainee submission alerts and session completion broadcasts (IST)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkNotificationsRead}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Mark All Read
                  </button>
                </div>

                <div className="divide-y divide-slate-200 max-h-[640px] overflow-y-auto">
                  {dashboard.notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 space-y-1 ${item.readByAdmin ? 'bg-white' : 'bg-blue-50/50'}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                        <span className="font-mono text-xs text-slate-500 tabular-nums shrink-0">
                          {formatKolkataDateTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <AdminSettingsPanel
                teachers={dashboard.teachers}
                questions={dashboard.questions}
                papers={dashboard.papers}
                onUpdated={async (msg) => {
                  setActionBanner(msg);
                  await loadDashboard();
                }}
              />

              <div className="bg-white border border-red-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-0.5 max-w-2xl">
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    Reset All Trainee Feedback Data
                  </h3>
                  <p className="text-xs text-slate-600">
                    Clears all submitted feedback ratings, remarks, and drafts for all {summary.totalTrainees}{' '}
                    trainees (STCLRC0001–0920). Instructors, questions, IST schedule, and passwords are kept intact.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  Reset All Trainee Data
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Teacher Deep-Dive Drawer */}
      {selectedTeacher && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Details for ${selectedTeacher.teacher.name}`}
          className="fixed inset-0 z-50 bg-slate-900/40 flex justify-end"
        >
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto p-6 space-y-6 border-l border-slate-200">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="font-mono text-xs text-slate-500">
                  Rank #{selectedTeacher.rank} · Paper-{selectedTeacher.teacher.paperNumber} ·{' '}
                  {selectedTeacher.teacher.code}
                </div>
                <h2 className="font-display text-xl font-bold text-slate-900 mt-1">
                  {selectedTeacher.teacher.name}
                </h2>
                <p className="text-sm text-slate-600">
                  {selectedTeacher.teacher.subjectTopic}
                  {selectedTeacher.teacher.phone ? ` · ${selectedTeacher.teacher.phone}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeacher(null)}
                aria-label="Close teacher detail drawer"
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs text-slate-500">Overall Average</div>
                <div className="font-mono text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                  {selectedTeacher.overallAverage.toFixed(2)} / 5.00
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs text-slate-500">Evaluations Received</div>
                <div className="font-mono text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                  {selectedTeacher.responseCount}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Question-by-Question Breakdown</h3>
              {activeQuestions.map((q) => {
                const score = selectedTeacher.criteriaAverages[q.id] ?? 0;
                return (
                  <div key={q.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{q.label}</span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {score.toFixed(2)} / 5.0
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-700 rounded-full"
                        style={{width: `${(score / 5) * 100}%`}}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Trainee Remarks ({selectedTeacher.comments.length})
              </h3>
              {selectedTeacher.comments.length === 0 ? (
                <p className="text-xs text-slate-500">No written remarks submitted for this teacher yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {selectedTeacher.comments.map((cm, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-slate-800">{cm.traineeId}</span>
                        <span className="font-mono text-slate-600 tabular-nums">
                          {cm.averageRating.toFixed(2)} / 5.0 ·{' '}
                          {cm.submittedAt ? formatKolkataDateTime(cm.submittedAt) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{cm.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal
        open={passwordModalOpen}
        userLabel={user.displayName}
        onClose={() => setPasswordModalOpen(false)}
      />

      <ResetFeedbackModal
        open={resetModalOpen}
        submittedCount={summary.submittedCount}
        draftCount={summary.draftCount}
        totalTrainees={summary.totalTrainees}
        onClose={() => setResetModalOpen(false)}
        onResetSuccess={async (message) => {
          setSelectedTeacher(null);
          setActionBanner(message);
          await loadDashboard();
          if (activeTab === 'roster') {
            await loadRoster();
          }
        }}
      />
    </div>
  );
};
