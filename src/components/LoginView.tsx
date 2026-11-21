import React, {useEffect, useState} from 'react';
import {Clock, Eye, EyeOff, Languages, Lock, ShieldCheck, UserCheck} from 'lucide-react';
import {
  PAPERS,
  TOTAL_TRAINEES,
  formatKolkataDateTime,
  formatKolkataTime,
  getSessionTimeState,
} from '../shared/domain';
import {LANGUAGE_OPTIONS, PORTAL_COPY} from '../shared/i18n';
import type {AppLanguage, AuthSessionUser, SessionConfig, UserRole} from '../shared/types';
import {apiFetch, setStoredToken} from '../utils/api';

interface LoginViewProps {
  session: SessionConfig | null;
  activeTeacherCount?: number;
  activeQuestionCount?: number;
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  onSuccess: (user: AuthSessionUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  session,
  activeTeacherCount = 27,
  activeQuestionCount = 4,
  language,
  onLanguageChange,
  onSuccess,
}) => {
  const [role, setRole] = useState<UserRole>('trainee');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const t = PORTAL_COPY[language];

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const timeState = session ? getSessionTimeState(session, nowMs) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginId.trim() || !password) {
      setError(t.bothRequiredError);
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{user: AuthSessionUser; token: string}>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          role,
          loginId: loginId.trim(),
          password,
        }),
      });
      setStoredToken(data.token);
      onSuccess(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 lg:px-10 py-4 flex items-center justify-between gap-6">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          {t.brandTitle}
        </span>

        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
          <span className="whitespace-nowrap shrink-0">12 {t.papersLabel}</span>
          <span className="whitespace-nowrap shrink-0">
            {activeTeacherCount} {t.facultyLabel}
          </span>
          <span className="whitespace-nowrap shrink-0">920 {t.traineesLabel}</span>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div
            role="group"
            aria-label="Select page language"
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

          <span className="hidden xl:inline-flex items-center gap-1.5 text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap">
            {t.kolkataLabel}: {formatKolkataTime(nowMs)}
          </span>
          {timeState && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 font-mono tabular-nums whitespace-nowrap shrink-0">
              <Clock className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
              {timeState.isScheduled
                ? `${t.startsIn} ${timeState.formattedRemaining}`
                : timeState.isOpen
                  ? `${t.windowOpen} · ${timeState.formattedRemaining}`
                  : t.windowClosed}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Informational Panel (Strictly no feedback scores/results shown publicly) */}
        <section className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-medium text-blue-700">
              {session?.batchName ?? 'STCLRC Induction Batch (Chest 0001 – 0920)'}
            </p>
            <h1
              className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-slate-900 leading-[1.2]"
              style={{textWrap: 'balance'}}
            >
              {t.heroTitle}
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-xl">{t.heroSubtitle}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 border-y border-slate-200 py-5">
            <div>
              <div className="text-xs text-slate-500">{t.statTraineeStrength}</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                {TOTAL_TRAINEES}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 font-mono">STCLRC0001–0920</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">{t.statActiveFaculty}</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                {activeTeacherCount}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{t.statIndividualEvals}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">{t.statEvalCriteria}</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                {activeQuestionCount} {t.statQuestionsWord}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{t.statAcrossPapers(PAPERS.length)}</div>
            </div>
          </div>

          {session && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="text-xs font-semibold text-slate-700">{t.scheduleBoxTitle}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                  <div className="text-slate-500">{t.opensIst}</div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                    {formatKolkataDateTime(session.startTime)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                  <div className="text-slate-500">{t.closesIst}</div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                    {formatKolkataDateTime(session.endTime)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right Authentication Card */}
        <section className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="font-display text-xl font-bold text-slate-900">{t.signInTitle}</h2>
              <p className="text-sm text-slate-500 mt-1">{t.signInSubtitle}</p>
            </div>

            <div
              role="tablist"
              aria-label="Login role selector"
              className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-6"
            >
              <button
                type="button"
                role="tab"
                aria-selected={role === 'trainee'}
                onClick={() => {
                  setRole('trainee');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  role === 'trainee'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                {t.traineeLoginTab}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={role === 'admin'}
                onClick={() => {
                  setRole('admin');
                  setError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  role === 'admin'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                {t.adminLoginTab}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-id-input" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {role === 'trainee' ? t.traineeChestIdLabel : t.adminIdLabel}
                </label>
                <input
                  id="login-id-input"
                  type="text"
                  autoComplete="username"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder={role === 'trainee' ? t.traineeChestIdPlaceholder : t.adminIdPlaceholder}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                />
                {role === 'trainee' && (
                  <p className="mt-1.5 text-xs text-slate-500">{t.traineeChestIdHelp}</p>
                )}
              </div>

              <div>
                <label htmlFor="login-password-input" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t.passwordLabel}
                </label>
                <div className="relative">
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    className="w-full px-3.5 py-2.5 pr-10 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" aria-hidden="true" />
                {loading ? t.verifying : role === 'trainee' ? t.signInAsTrainee : t.signInAsAdmin}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};
