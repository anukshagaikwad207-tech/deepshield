import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  Shield,
  LayoutDashboard,
  Upload,
  ScanLine,
  Info,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Cpu,
} from 'lucide-react';
import type { Page } from '@/types';
import { checkBackendHealth } from '@/lib/api';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'upload', label: 'Upload Media', icon: <Upload size={18} /> },
  { id: 'about', label: 'About', icon: <Info size={18} /> },
];

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page, analysisId?: string) => void;
  user?: User | null;
  onSignOut?: () => void;
  children: React.ReactNode;
}

export default function Layout({
  currentPage,
  onNavigate,
  user,
  onSignOut,
  children,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    let mounted = true;
    checkBackendHealth().then((online) => {
      if (mounted) setBackendOnline(online);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const navItems = NAV_ITEMS;

  return (
    <div className="min-h-screen flex" style={{ background: '#06091a', color: '#e2e8f0' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col w-64 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#080c1a', borderRight: '1px solid #1e2d4a' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid #1e2d4a' }}>
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)' }}
          >
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight" style={{ color: '#f0f6ff' }}>DeepShield AI</div>
            <div className="text-xs" style={{ color: '#64748b' }}>Media Verification</div>
          </div>
          <button
            className="ml-auto lg:hidden p-1 rounded"
            style={{ color: '#64748b' }}
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = currentPage === item.id || (currentPage === 'analysis' && item.id === 'upload') || (currentPage === 'results' && item.id === 'upload');
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group"
                style={{
                  background: active ? 'linear-gradient(90deg, rgba(14,165,233,0.18), rgba(6,182,212,0.08))' : 'transparent',
                  color: active ? '#38bdf8' : '#94a3b8',
                  borderLeft: active ? '2px solid #38bdf8' : '2px solid transparent',
                }}
              >
                <span style={{ color: active ? '#38bdf8' : '#64748b' }}>{item.icon}</span>
                {item.label}
                {active && <ChevronRight size={14} className="ml-auto" style={{ color: '#38bdf8' }} />}
              </button>
            );
          })}
        </nav>

        {/* User Card */}
        {user && (
          <div className="px-4 pb-3">
            <div
              className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: '#0f172a', border: '1px solid #1e2d4a' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', color: '#fff' }}
              >
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: '#f0f6ff' }}>
                  {user.email}
                </div>
                <div className="text-[10px]" style={{ color: '#64748b' }}>
                  Private Vault
                </div>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                >
                  <LogOut size={15} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* System status badge */}
        <div className="px-4 pb-6">
          <div
            className="rounded-lg px-3 py-3 text-xs"
            style={{
              background: backendOnline ? 'rgba(52,211,153,0.05)' : '#0f172a',
              border: `1px solid ${backendOnline ? 'rgba(52,211,153,0.25)' : '#1e3a5f'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              {backendOnline ? (
                <>
                  <Cpu size={13} style={{ color: '#34d399' }} />
                  <span className="font-semibold" style={{ color: '#34d399' }}>AI Backend Online</span>
                </>
              ) : (
                <>
                  <ScanLine size={13} style={{ color: '#f59e0b' }} />
                  <span className="font-semibold" style={{ color: '#f59e0b' }}>Demo Mode</span>
                </>
              )}
            </div>
            <p style={{ color: '#64748b' }}>
              {backendOnline
                ? 'FastAPI ViT deepfake detection model active.'
                : 'Results are simulated. Connect FastAPI backend for live inference.'}
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center gap-4 px-6 py-4 sticky top-0 z-10"
          style={{ background: 'rgba(6,9,26,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e2d4a' }}
        >
          <button
            className="lg:hidden p-2 rounded-lg transition"
            style={{ color: '#64748b' }}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="flex-1">
            <nav className="text-xs flex items-center gap-1.5" style={{ color: '#475569' }}>
              <Shield size={12} style={{ color: '#0ea5e9' }} />
              <span>DeepShield AI</span>
              <ChevronRight size={12} />
              <span style={{ color: '#94a3b8' }}>
                {currentPage === 'dashboard' && 'Dashboard'}
                {currentPage === 'upload' && 'Upload Media'}
                {currentPage === 'analysis' && 'Analysis'}
                {currentPage === 'results' && 'Results'}
                {currentPage === 'about' && 'About'}
              </span>
            </nav>
          </div>

          {/* System status pill */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: backendOnline ? 'rgba(52,211,153,0.1)' : 'rgba(6,182,212,0.1)',
              border: `1px solid ${backendOnline ? 'rgba(52,211,153,0.25)' : 'rgba(6,182,212,0.25)'}`,
              color: backendOnline ? '#34d399' : '#22d3ee',
            }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse`}
            />
            {backendOnline ? 'AI Model Online' : 'System Online'}
          </div>

          {/* User Sign Out Header Action */}
          {user && onSignOut && (
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
              style={{ border: '1px solid #1e2d4a' }}
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
