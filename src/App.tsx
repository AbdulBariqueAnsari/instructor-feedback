import {useCallback, useEffect, useState} from 'react';
import {AdminDashboard} from './components/AdminDashboard';
import {LoginView} from './components/LoginView';
import {TraineePortal} from './components/TraineePortal';
import type {AppLanguage, AuthSessionUser, SessionConfig} from './shared/types';
import {apiFetch, setStoredToken} from './utils/api';

const LANG_STORAGE_KEY = 'stclrc_ui_lang';

function getInitialLanguage(): AppLanguage {
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'bn' || saved === 'hi') return saved;
  } catch {
    // ignore storage errors
  }
  return 'en';
}

export default function App() {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [session, setSession] = useState<SessionConfig | null>(null);
  const [activeTeacherCount, setActiveTeacherCount] = useState<number>(27);
  const [activeQuestionCount, setActiveQuestionCount] = useState<number>(4);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [language, setLanguage] = useState<AppLanguage>(getInitialLanguage);

  const handleLanguageChange = useCallback((nextLang: AppLanguage) => {
    setLanguage(nextLang);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    } catch {
      // ignore storage errors
    }
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const data = await apiFetch<{
        user: AuthSessionUser | null;
        session: SessionConfig;
        activeTeacherCount?: number;
        activeQuestionCount?: number;
      }>('/api/auth/me');
      setUser(data.user);
      setSession(data.session);
      if (typeof data.activeTeacherCount === 'number') setActiveTeacherCount(data.activeTeacherCount);
      if (typeof data.activeQuestionCount === 'number') setActiveQuestionCount(data.activeQuestionCount);
    } catch {
      setUser(null);
    } finally {
      setBootstrapping(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', {method: 'POST'});
    } catch {
      // ignore
    }
    setStoredToken(null);
    setUser(null);
    void restoreSession();
  };

  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm font-medium text-slate-600">Initializing STCLRC Portal...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginView
        session={session}
        activeTeacherCount={activeTeacherCount}
        activeQuestionCount={activeQuestionCount}
        language={language}
        onLanguageChange={handleLanguageChange}
        onSuccess={(loggedInUser) => {
          setUser(loggedInUser);
        }}
      />
    );
  }

  if (user.role === 'admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <TraineePortal
      user={user}
      language={language}
      onLanguageChange={handleLanguageChange}
      onLogout={handleLogout}
    />
  );
}
