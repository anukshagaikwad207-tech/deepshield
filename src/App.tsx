import { useState } from 'react';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Upload from '@/pages/Upload';
import Analysis from '@/pages/Analysis';
import Results from '@/pages/Results';
import About from '@/pages/About';
import type { Page } from '@/types';

interface NavState {
  page: Page;
  analysisId?: string;
}

export default function App() {
  const [nav, setNav] = useState<NavState>({ page: 'dashboard' });

  const handleNavigate = (page: Page, analysisId?: string) => {
    setNav({ page, analysisId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout currentPage={nav.page} onNavigate={handleNavigate}>
      {nav.page === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
      {nav.page === 'upload' && <Upload onNavigate={handleNavigate} />}
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
