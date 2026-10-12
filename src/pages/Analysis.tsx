import { useEffect, useState } from 'react';
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { generateDemoResult } from '@/lib/demo';
import type { Analysis as AnalysisType, Page } from '@/types';

interface AnalysisProps {
  analysisId: string;
  onNavigate: (page: Page, analysisId?: string) => void;
}

const STEPS = [
  'Loading file metadata',
  'Preprocessing media',
  'Running frequency analysis',
  'Evaluating neural signatures',
  'Checking temporal consistency',
  'Generating authenticity report',
];

export default function Analysis({ analysisId, onNavigate }: AnalysisProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let step = 0;
    let prog = 0;

    const interval = setInterval(() => {
      prog += 2.2;
      setProgress(Math.min(prog, 100));

      const newStep = Math.floor((prog / 100) * STEPS.length);
      if (newStep !== step && newStep < STEPS.length) {
        step = newStep;
        setStepIndex(step);
      }

      if (prog >= 100) {
        clearInterval(interval);
        setDone(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!done) return;

    async function finalize() {
      const { data } = await supabase
        .from('analyses')
        .select('file_type')
        .eq('id', analysisId)
        .maybeSingle();

      if (!data) return;

      const result = generateDemoResult(data.file_type);

      await supabase
        .from('analyses')
        .update({
          status: 'complete',
          authenticity_score: result.authenticity_score,
          verdict: result.verdict,
          indicators: result.indicators,
          explanation: result.explanation,
        })
        .eq('id', analysisId);

      setTimeout(() => onNavigate('results', analysisId), 600);
    }

    finalize();
  }, [done, analysisId, onNavigate]);

  const pct = Math.round(progress);

  return (
    <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
      {/* Animated shield */}
      <div className="relative">
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{
            background: 'conic-gradient(from 0deg, #0ea5e9 ' + pct + '%, #1e2d4a ' + pct + '%)',
            padding: 4,
          }}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{ background: '#080c1a' }}
          >
            <Shield
              size={44}
              style={{ color: done ? '#34d399' : '#0ea5e9' }}
              className="transition-colors duration-500"
            />
          </div>
        </div>
        {done && (
          <div
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#34d399' }}
          >
            <CheckCircle size={18} className="text-white" />
          </div>
        )}
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#f0f6ff' }}>
          {done ? 'Analysis Complete' : 'Analyzing Media'}
        </h1>
        <p className="text-sm" style={{ color: '#64748b' }}>
          {done ? 'Redirecting to your results...' : 'Running deepfake detection algorithms. Please wait.'}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full space-y-2">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e2d4a' }}>
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: pct + '%',
              background: 'linear-gradient(90deg, #0ea5e9, #06b6d4)',
            }}
          />
        </div>
        <div className="flex justify-between text-xs" style={{ color: '#475569' }}>
          <span>{STEPS[Math.min(stepIndex, STEPS.length - 1)]}</span>
          <span>{pct}%</span>
        </div>
      </div>

      {/* Steps */}
      <div className="w-full space-y-2">
        {STEPS.map((s, i) => {
          const complete = i < stepIndex;
          const active = i === stepIndex;
          return (
            <div
              key={s}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-300"
              style={{
                background: active ? 'rgba(14,165,233,0.08)' : 'transparent',
                border: active ? '1px solid rgba(14,165,233,0.2)' : '1px solid transparent',
                color: complete ? '#34d399' : active ? '#38bdf8' : '#334155',
              }}
            >
              <span className="flex-shrink-0">
                {complete ? <CheckCircle size={14} style={{ color: '#34d399' }} /> :
                 active ? <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" /> :
                 <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ background: '#1e2d4a' }} />}
              </span>
              {s}
            </div>
          );
        })}
      </div>

      {/* Demo notice */}
      <div
        className="flex items-start gap-2 px-4 py-3 rounded-xl text-xs text-left"
        style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}
      >
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <span>
          <strong>Demonstration mode:</strong> Results are simulated for showcase purposes. Real AI models will be integrated in a future release.
        </span>
      </div>
    </div>
  );
}
