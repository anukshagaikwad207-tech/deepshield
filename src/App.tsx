import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Shield } from 'lucide-react';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Upload from '@/pages/Upload';
import Analysis from '@/pages/Analysis';
import Results from '@/pages/Results';
import About from '@/pages/About';
import Auth from '@/pages/Auth';
import { supabase } from '@/lib/supabase';
import type { Page } from '@/types';

interface NavState {
  page: Page;
  analysisId?: string;
}

export default function App() {
  const [nav, setNav] = useState<NavState>({ page: 'dashboard' });
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    // 1. Restore persistent session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });

    // 2. Listen for auth changes (login, logout, token refresh, email confirmation)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleNavigate = (page: Page, analysisId?: string) => {
    setNav({ page, analysisId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setNav({ page: 'dashboard' });
  };

  // Loading state while checking session persistence
  if (loadingAuth) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: '#06091a', color: '#e2e8f0' }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)' }}
        >
          <Shield size={32} className="text-white animate-pulse" />
        </div>
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-medium" style={{ color: '#64748b' }}>
          Initializing DeepShield AI...
        </p>
      </div>
    );
  }

  // If user is not authenticated, render Auth screen
  if (!session) {
    return <Auth onAuthSuccess={() => handleNavigate('dashboard')} />;
  }

  return (
    <Layout
      currentPage={nav.page}
      onNavigate={handleNavigate}
      user={session.user}
      onSignOut={handleSignOut}
    >
      {nav.page === 'dashboard' && (
        <Dashboard onNavigate={handleNavigate} user={session.user} />
      )}
      {nav.page === 'upload' && (
        <Upload onNavigate={handleNavigate} user={session.user} />
      )}
      {nav.page === 'analysis' && nav.analysisId && (
        <Analysis analysisId={nav.analysisId} onNavigate={handleNavigate} />
      )}
      {nav.page === 'results' && nav.analysisId && (
        <Results analysisId={nav.analysisId} onNavigate={handleNavigate} />
      )}
      {nav.page === 'about' && <About />}
    </Layout>
  );
}