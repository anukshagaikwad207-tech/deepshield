import { useEffect, useState } from 'react';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileImage,
  FileVideo,
  FileAudio,
  Download,
  ArrowLeft,
  Clock,
  ChevronRight,
  Cpu,
  FlaskConical,
  Info,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Analysis, Indicator, Page } from '@/types';

interface ResultsProps {
  analysisId: string;
  onNavigate: (page: Page, analysisId?: string) => void;
}

interface FullAnalysis extends Analysis {
  is_demo: boolean;
  raw_scores: { fake: number; real: number } | null;
  frame_results: Array<{
    frame_index: number;
    timestamp_seconds: number;
    fake_score: number;
    real_score: number;
  }> | null;
  limitations: string[] | null;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ScoreArc({ score }: { score: number }) {
  const color = score > 65 ? '#34d399' : score > 40 ? '#fbbf24' : '#f87171';
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1e2d4a" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{ transition: 'stroke-dasharray 1.2s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs" style={{ color: '#64748b' }}>
          / 100
        </span>
      </div>
    </div>
  );
}

function SeverityBar({ severity }: { severity: 'low' | 'medium' | 'high' }) {
  const colors: Record<string, string> = {
    low: '#34d399',
    medium: '#fbbf24',
    high: '#f87171',
  };
  const widths: Record<string, string> = { low: '33%', medium: '66%', high: '100%' };
  return (
    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2d4a' }}>
      <div
        className="h-full rounded-full"
        style={{ width: widths[severity], background: colors[severity] }}
      />
    </div>
  );
}

function IndicatorCard({ indicator }: { indicator: Indicator }) {
  const severityColor: Record<string, string> = {
    low: '#34d399',
    medium: '#fbbf24',
    high: '#f87171',
  };
  const severityBg: Record<string, string> = {
    low: 'rgba(52,211,153,0.08)',
    medium: 'rgba(251,191,36,0.08)',
    high: 'rgba(248,113,113,0.08)',
  };
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: severityBg[indicator.severity],
        border: `1px solid ${severityColor[indicator.severity]}30`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-sm font-semibold" style={{ color: '#f0f6ff' }}>
          {indicator.label}
        </span>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className="text-xs font-medium capitalize"
            style={{ color: severityColor[indicator.severity] }}
          >
            {indicator.severity}
          </span>
          <SeverityBar severity={indicator.severity} />
        </div>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
        {indicator.description}
      </p>
    </div>
  );
}

function FrameTimeline({
  frames,
}: {
  frames: NonNullable<FullAnalysis['frame_results']>;
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#080c1a', border: '1px solid #1e2d4a' }}>
      <h3 className="text-sm font-semibold mb-3" style={{ color: '#f0f6ff' }}>
        Frame-by-Frame Scores ({frames.length} frames sampled)
      </h3>
      <div className="space-y-2">
        {frames.map((fr) => {
          const fakeColor =
            fr.fake_score >= 0.65
              ? '#f87171'
              : fr.fake_score >= 0.35
                ? '#fbbf24'
                : '#34d399';
          return (
            <div key={fr.frame_index} className="flex items-center gap-3">
              <span className="text-xs w-16 flex-shrink-0" style={{ color: '#475569' }}>
                {fr.timestamp_seconds.toFixed(1)}s
              </span>
              <div
                className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ background: '#1e2d4a' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${fr.fake_score * 100}%`,
                    background: fakeColor,
                  }}
                />
              </div>
              <span className="text-xs w-12 text-right flex-shrink-0" style={{ color: fakeColor }}>
                {(fr.fake_score * 100).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs mt-3" style={{ color: '#475569' }}>
        Bar length = fake-class score for that frame. Higher = more suspicious.
      </p>
    </div>
  );
}

export default function Results({ analysisId, onNavigate }: ResultsProps) {
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .maybeSingle();
      if (data) setAnalysis(data as FullAnalysis);
      setLoading(false);
    }
    load();
  }, [analysisId]);

  const handleDownload = () => {
    if (!analysis) return;
    const isDemo = analysis.is_demo ?? true;
    const lines = [
      'DEEPSHIELD AI — ANALYSIS REPORT',
      '================================',
      isDemo
        ? '[DEMO DATA — Results are simulated for demonstration purposes]'
        : '[REAL ANALYSIS — Results produced by dima806/deepfake_vs_real_image_detection (ViT)]',
      '',
      `File     : ${analysis.file_name}`,
      `Type     : ${analysis.file_type}`,
      `Size     : ${formatFileSize(analysis.file_size)}`,
      `Analyzed : ${formatDate(analysis.created_at)}`,
      `Mode     : ${isDemo ? 'Demo (simulated)' : 'Real AI inference'}`,
      '',
      'AUTHENTICITY ASSESSMENT',
      '-----------------------',
      `Score   : ${analysis.authenticity_score}/100`,
      `Verdict : ${analysis.verdict?.replace('_', ' ').toUpperCase()}`,
      ...(analysis.raw_scores
        ? [
            `Raw scores (softmax, NOT calibrated probabilities):`,
            `  Fake : ${(analysis.raw_scores.fake * 100).toFixed(2)}%`,
            `  Real : ${(analysis.raw_scores.real * 100).toFixed(2)}%`,
          ]
        : []),
      '',
      'EXPLANATION',
      '-----------',
      analysis.explanation ?? '',
      '',
      'SUSPICIOUS INDICATORS',
      '---------------------',
      ...(analysis.indicators ?? []).map(
        (ind: Indicator) =>
          `[${ind.severity.toUpperCase()}] ${ind.label}\n  ${ind.description}`,
      ),
      '',
      ...(analysis.limitations?.length
        ? [
            'KNOWN LIMITATIONS',
            '-----------------',
            ...(analysis.limitations as string[]).map((l, i) => `${i + 1}. ${l}`),
            '',
          ]
        : []),
      '--- END OF REPORT ---',
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deepshield-report-${analysis.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <Shield size={40} className="mx-auto mb-4 opacity-30" style={{ color: '#64748b' }} />
        <h2 className="text-lg font-semibold mb-2" style={{ color: '#f0f6ff' }}>
          Analysis not found
        </h2>
        <p className="text-xs mb-4" style={{ color: '#64748b' }}>
          This record either does not exist or belongs to another user vault.
        </p>
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-sm px-4 py-2 rounded-lg transition"
          style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const score = analysis.authenticity_score ?? 0;
  const verdict = analysis.verdict;
  const isDemo = analysis.is_demo ?? true;

  const verdictMeta: Record<
    string,
    { label: string; color: string; bg: string; icon: React.ReactNode; tagline: string }
  > = {
    authentic: {
      label: 'Authentic',
      color: '#34d399',
      bg: 'rgba(52,211,153,0.08)',
      icon: <CheckCircle size={20} />,
      tagline: 'No significant manipulation detected.',
    },
    suspicious: {
      label: 'Suspicious',
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.08)',
      icon: <AlertTriangle size={20} />,
      tagline: 'Possible manipulation — further review recommended.',
    },
    likely_fake: {
      label: 'Likely Fake',
      color: '#f87171',
      bg: 'rgba(248,113,113,0.08)',
      icon: <XCircle size={20} />,
      tagline: 'Strong indicators of AI-generated or manipulated content.',
    },
  };

  const meta = verdict ? verdictMeta[verdict] : verdictMeta.suspicious;

  const FileIcon =
    analysis.file_type === 'video'
      ? FileVideo
      : analysis.file_type === 'audio'
        ? FileAudio
        : FileImage;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-1.5 text-sm transition hover:opacity-80"
          style={{ color: '#64748b' }}
        >
          <ArrowLeft size={15} />
          Dashboard
        </button>
        <ChevronRight size={13} style={{ color: '#334155' }} />
        <span className="text-sm" style={{ color: '#94a3b8' }}>
          Results
        </span>
      </div>

      {/* Mode banner */}
      {isDemo ? (
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-medium"
          style={{
            background: 'rgba(251,191,36,0.07)',
            border: '1px solid rgba(251,191,36,0.25)',
            color: '#fbbf24',
          }}
        >
          <FlaskConical size={13} />
          DEMONSTRATION DATA — These results are simulated. Set up the backend for real AI analysis.
        </div>
      ) : (
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-medium"
          style={{
            background: 'rgba(52,211,153,0.07)',
            border: '1px solid rgba(52,211,153,0.25)',
            color: '#34d399',
          }}
        >
          <Cpu size={13} />
          REAL AI ANALYSIS — Produced by dima806/deepfake_vs_real_image_detection (ViT). Scores are
          not calibrated probabilities.
        </div>
      )}

      {/* Score + verdict */}
      <div className="rounded-2xl p-6" style={{ background: '#080c1a', border: '1px solid #1e2d4a' }}>
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <ScoreArc score={score} />

          <div className="flex-1 text-center md:text-left">
            <p
              className="text-xs font-semibold tracking-wider uppercase mb-2"
              style={{ color: '#475569' }}
            >
              Authenticity Score
            </p>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-lg mb-3"
              style={{
                background: meta.bg,
                color: meta.color,
                border: `1px solid ${meta.color}30`,
              }}
            >
              {meta.icon}
              {meta.label}
            </div>
            <p className="text-sm" style={{ color: '#64748b' }}>
              {meta.tagline}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <div
                className="rounded-lg px-3 py-2"
                style={{ background: '#0f172a', border: '1px solid #1e2d4a' }}
              >
                <div className="font-semibold mb-0.5 capitalize" style={{ color: '#f0f6ff' }}>
                  {analysis.file_type}
                </div>
                <div style={{ color: '#475569' }}>Type</div>
              </div>
              <div
                className="rounded-lg px-3 py-2"
                style={{ background: '#0f172a', border: '1px solid #1e2d4a' }}
              >
                <div className="font-semibold mb-0.5" style={{ color: '#f0f6ff' }}>
                  {formatFileSize(analysis.file_size)}
                </div>
                <div style={{ color: '#475569' }}>Size</div>
              </div>
              <div
                className="rounded-lg px-3 py-2"
                style={{ background: '#0f172a', border: '1px solid #1e2d4a' }}
              >
                <div className="font-semibold mb-0.5" style={{ color: '#f0f6ff' }}>
                  {(analysis.indicators ?? []).length}
                </div>
                <div style={{ color: '#475569' }}>Indicators</div>
              </div>
            </div>

            {/* Raw scores — only for real analysis */}
            {!isDemo && analysis.raw_scores && (
              <div
                className="mt-3 px-3 py-2 rounded-lg text-xs"
                style={{ background: '#0f172a', border: '1px solid #1e2d4a' }}
              >
                <p className="font-semibold mb-1" style={{ color: '#64748b' }}>
                  Raw model scores (softmax)
                </p>
                <div className="flex gap-4">
                  <span style={{ color: '#f87171' }}>
                    Fake: {(analysis.raw_scores.fake * 100).toFixed(1)}%
                  </span>
                  <span style={{ color: '#34d399' }}>
                    Real: {(analysis.raw_scores.real * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File info */}
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{ background: '#080c1a', border: '1px solid #1e2d4a' }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            background: 'rgba(14,165,233,0.1)',
            border: '1px solid rgba(14,165,233,0.2)',
          }}
        >
          <FileIcon size={20} style={{ color: '#0ea5e9' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate" style={{ color: '#f0f6ff' }}>
            {analysis.file_name}
          </div>
          <div
            className="flex items-center gap-1.5 text-xs mt-0.5"
            style={{ color: '#475569' }}
          >
            <Clock size={11} />
            {formatDate(analysis.created_at)}
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition hover:opacity-80"
          style={{
            background: 'rgba(14,165,233,0.1)',
            border: '1px solid rgba(14,165,233,0.2)',
            color: '#38bdf8',
          }}
        >
          <Download size={14} />
          Download Report
        </button>
      </div>

      {/* Explanation */}
      <div className="rounded-xl p-5" style={{ background: '#080c1a', border: '1px solid #1e2d4a' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#f0f6ff' }}>
          Analysis Explanation
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
          {analysis.explanation}
        </p>
      </div>

      {/* Indicators */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#f0f6ff' }}>
          Suspicious Indicators ({(analysis.indicators ?? []).length})
        </h3>
        {(analysis.indicators ?? []).length === 0 ? (
          <div
            className="rounded-xl p-6 text-center text-sm"
            style={{
              background: '#080c1a',
              border: '1px solid #1e2d4a',
              color: '#475569',
            }}
          >
            <CheckCircle size={24} className="mx-auto mb-2" style={{ color: '#34d399' }} />
            No suspicious indicators detected.
          </div>
        ) : (
          <div className="space-y-3">
            {(analysis.indicators as Indicator[]).map((ind, i) => (
              <IndicatorCard key={i} indicator={ind} />
            ))}
          </div>
        )}
      </div>

      {/* Frame timeline — video only */}
      {analysis.frame_results && analysis.frame_results.length > 0 && (
        <FrameTimeline frames={analysis.frame_results} />
      )}

      {/* Limitations — real analysis only */}
      {!isDemo && analysis.limitations && analysis.limitations.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ background: '#080c1a', border: '1px solid #1e3a5f' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Info size={15} style={{ color: '#38bdf8' }} />
            <h3 className="text-sm font-semibold" style={{ color: '#f0f6ff' }}>
              Known Model Limitations
            </h3>
          </div>
          <ul className="space-y-2">
            {(analysis.limitations as string[]).map((lim, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed">
                <span className="flex-shrink-0 mt-0.5" style={{ color: '#475569' }}>
                  {i + 1}.
                </span>
                <span style={{ color: '#64748b' }}>{lim}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      <div className="flex gap-3">
        <button
          onClick={() => onNavigate('upload')}
          className="flex-1 py-3 rounded-xl text-sm font-semibold transition hover:opacity-90"
          style={{ background: 'linear-gradient(90deg, #0ea5e9, #06b6d4)', color: '#fff' }}
        >
          Analyze Another File
        </button>
        <button
          onClick={() => onNavigate('dashboard')}
          className="py-3 px-5 rounded-xl text-sm font-medium transition hover:opacity-80"
          style={{
            background: '#080c1a',
            border: '1px solid #1e2d4a',
            color: '#94a3b8',
          }}
        >
          Dashboard
        </button>
      </div>
    </div>
  );
}
