import { useEffect, useState } from 'react';
import {
  Shield,
  Upload,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  FileImage,
  FileVideo,
  FileAudio,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Analysis, Page } from '@/types';

import type { User } from '@supabase/supabase-js';

interface DashboardProps {
  onNavigate: (page: Page, analysisId?: string) => void;
  user?: User | null;
}


function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function FileTypeIcon({ type }: { type: string }) {
  if (type === 'video') return <FileVideo size={16} style={{ color: '#a78bfa' }} />;
  if (type === 'audio') return <FileAudio size={16} style={{ color: '#34d399' }} />;
  return <FileImage size={16} style={{ color: '#38bdf8' }} />;
}

function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return <span style={{ color: '#475569', fontSize: 12 }}>—</span>;
  const styles: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    authentic: { color: '#34d399', bg: 'rgba(52,211,153,0.1)', icon: <CheckCircle size={12} />, label: 'Authentic' },
    suspicious: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', icon: <AlertTriangle size={12} />, label: 'Suspicious' },
    likely_fake: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', icon: <XCircle size={12} />, label: 'Likely Fake' },
  };
  const s = styles[verdict];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: s.color, background: s.bg }}
    >
      {s.icon} {s.label}
    </span>
  );
}

export default function Dashboard({ onNavigate, user }: DashboardProps) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let currentUser = user;
      if (!currentUser) {
        const { data: authData } = await supabase.auth.getUser();
        currentUser = authData?.user ?? null;
      }

      let query = supabase.from('analyses').select('*');
      if (currentUser?.id) {
        query = query.eq('user_id', currentUser.id);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching dashboard records:', error);
      }
      if (data) setAnalyses(data as Analysis[]);
      setLoading(false);
    }
    load();
  }, [user]);

  const completed = analyses.filter((a) => a.status === 'complete');
  const fakeCount = completed.filter((a) => a.verdict === 'likely_fake').length;
  const suspiciousCount = completed.filter((a) => a.verdict === 'suspicious').length;
  const authenticCount = completed.filter((a) => a.verdict === 'authentic').length;

  const stats = [
    { label: 'Total Analyzed', value: completed.length, icon: <Activity size={20} />, color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
    { label: 'Authentic', value: authenticCount, icon: <CheckCircle size={20} />, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
    { label: 'Suspicious', value: suspiciousCount, icon: <AlertTriangle size={20} />, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
    { label: 'Likely Fake', value: fakeCount, icon: <XCircle size={20} />, color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  ];

  const features = [
    { icon: <FileImage size={22} />, title: 'Image Detection', desc: 'Analyze photos for GAN artifacts, facial anomalies, and manipulation traces.', color: '#38bdf8' },
    { icon: <FileVideo size={22} />, title: 'Video Analysis', desc: 'Frame-by-frame deepfake detection including face-swap and temporal inconsistency checks.', color: '#a78bfa' },
    { icon: <FileAudio size={22} />, title: 'Audio Verification', desc: 'Detect AI-cloned voices and synthetic speech through spectral pattern analysis.', color: '#34d399' },
    { icon: <TrendingUp size={22} />, title: 'Confidence Scoring', desc: 'Get a 0–100 authenticity score with a breakdown of detected indicators.', color: '#fb923c' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero */}
      <div
        className="rounded-2xl p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0c1a3a 50%, #061224 100%)', border: '1px solid #1e3a5f' }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(14,165,233,0.15) 0%, transparent 60%)' }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} style={{ color: '#38bdf8' }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#38bdf8' }}>DeepShield AI</span>
            </div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#f0f6ff' }}>
              Building Trust in the Digital World
            </h1>
            <p className="text-sm leading-relaxed mb-6" style={{ color: '#64748b', maxWidth: 480 }}>
              Upload images, videos, or audio to receive an AI-assisted deepfake analysis. Get clear
              authenticity scores, suspicious indicator breakdowns, and a downloadable report.
            </p>
            <button
              onClick={() => onNavigate('upload')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:scale-105"
              style={{ background: 'linear-gradient(90deg, #0ea5e9, #06b6d4)', color: '#fff' }}
            >
              <Upload size={16} />
              Start Analysis
            </button>
          </div>
          <div className="flex-shrink-0 hidden md:flex items-center justify-center w-32 h-32 rounded-2xl" style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.2)' }}>
            <Shield size={56} style={{ color: '#0ea5e9', opacity: 0.7 }} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#080c1a', border: '1px solid #1e2d4a' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: s.bg, color: s.color }}>
                {s.icon}
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: '#f0f6ff' }}>
              {loading ? <span className="inline-block w-8 h-6 rounded animate-pulse" style={{ background: '#1e2d4a' }} /> : s.value}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#f0f6ff' }}>Platform Capabilities</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl p-5 transition-all duration-200 hover:border-opacity-60" style={{ background: '#080c1a', border: '1px solid #1e2d4a' }}>
              <div className="mb-3" style={{ color: f.color }}>{f.icon}</div>
              <div className="text-sm font-semibold mb-1" style={{ color: '#f0f6ff' }}>{f.title}</div>
              <div className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent history */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: '#f0f6ff' }}>Recent Analyses</h2>
          <button onClick={() => onNavigate('upload')} className="flex items-center gap-1 text-xs font-medium transition hover:opacity-80" style={{ color: '#38bdf8' }}>
            New Analysis <ChevronRight size={14} />
          </button>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: '#080c1a', border: '1px solid #1e2d4a' }}>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: '#475569' }}>
              <Clock size={24} className="mx-auto mb-2 opacity-40" />
              Loading history...
            </div>
          ) : analyses.length === 0 ? (
            <div className="p-12 text-center">
              <Shield size={36} className="mx-auto mb-3 opacity-20" style={{ color: '#64748b' }} />
              <p className="text-sm font-medium mb-1" style={{ color: '#64748b' }}>No analyses yet</p>
              <p className="text-xs" style={{ color: '#334155' }}>Upload a file to get started.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #1e2d4a' }}>
                  {['File', 'Type', 'Score', 'Verdict', 'Date', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold tracking-wider" style={{ color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analyses.map((a, i) => (
                  <tr
                    key={a.id}
                    style={{ borderBottom: i < analyses.length - 1 ? '1px solid #0f172a' : 'none' }}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileTypeIcon type={a.file_type} />
                        <span className="truncate max-w-[160px]" style={{ color: '#cbd5e1' }}>{a.file_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize" style={{ color: '#64748b' }}>{a.file_type}</td>
                    <td className="px-4 py-3">
                      {a.authenticity_score != null ? (
                        <span className="font-semibold" style={{ color: a.authenticity_score > 65 ? '#34d399' : a.authenticity_score > 40 ? '#fbbf24' : '#f87171' }}>
                          {a.authenticity_score}%
                        </span>
                      ) : <span style={{ color: '#475569' }}>—</span>}
                    </td>
                    <td className="px-4 py-3"><VerdictBadge verdict={a.verdict} /></td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#475569', fontSize: 12 }}>{timeAgo(a.created_at)}</td>
                    <td className="px-4 py-3">
                      {a.status === 'complete' && (
                        <button
                          onClick={() => onNavigate('results', a.id)}
                          className="text-xs px-2.5 py-1 rounded-md transition hover:opacity-80"
                          style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
