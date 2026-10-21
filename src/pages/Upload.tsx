import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload as UploadIcon,
  FileImage,
  FileVideo,
  FileAudio,
  X,
  AlertCircle,
  ArrowRight,
  Cpu,
  FlaskConical,
} from 'lucide-react';
import type { Page } from '@/types';
import { supabase } from '@/lib/supabase';
import { analyzeFile } from '@/lib/api';

const ACCEPTED: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/mov'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4'],
};
const ALL_ACCEPTED = Object.values(ACCEPTED).flat();
const MAX_SIZE = 100 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectType(file: File): 'image' | 'video' | 'audio' | null {
  for (const [type, mimes] of Object.entries(ACCEPTED)) {
    if (mimes.includes(file.type)) return type as 'image' | 'video' | 'audio';
  }
  return null;
}

import type { User } from '@supabase/supabase-js';
import { checkBackendHealth } from '@/lib/api';

interface UploadProps {
  onNavigate: (page: Page, analysisId?: string) => void;
  user?: User | null;
}

type SubmitPhase = 'idle' | 'uploading' | 'analyzing' | 'saving';

const PHASE_LABELS: Record<SubmitPhase, string> = {
  idle: '',
  uploading: 'Uploading file…',
  analyzing: 'Running deepfake detection…',
  saving: 'Saving results to your vault…',
};

export default function Upload({ onNavigate, user }: UploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SubmitPhase>('idle');
  const [backendAlive, setBackendAlive] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    checkBackendHealth().then((alive) => {
      if (mounted) setBackendAlive(alive);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleFile = useCallback((f: File) => {
    setError(null);
    if (!ALL_ACCEPTED.includes(f.type)) {
      setError(
        'Unsupported file type. Please upload an image (JPEG, PNG, WebP), video (MP4, WebM), or audio (MP3, WAV, FLAC).',
      );
      return;
    }
    if (f.size > MAX_SIZE) {
      setError(`File too large. Maximum size is 100 MB (your file is ${formatFileSize(f.size)}).`);
      return;
    }
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    const fileType = detectType(file);
    if (!fileType) return;

    setError(null);
    setPhase('uploading');

    // ── Ensure authenticated user ─────────────────────────────────────────
    let currentUser = user;
    if (!currentUser) {
      const { data: authData } = await supabase.auth.getUser();
      currentUser = authData?.user ?? null;
    }

    if (!currentUser) {
      setError('You must be signed in to submit an analysis.');
      setPhase('idle');
      return;
    }

    // ── Try real backend ──────────────────────────────────────────────────
    let backendResult: Awaited<ReturnType<typeof analyzeFile>> = null;
    let backendError: string | null = null;

    try {
      setPhase('analyzing');
      backendResult = await analyzeFile(file);
    } catch (err) {
      backendError = err instanceof Error ? err.message : 'Backend error';
      backendResult = null;
    }

    // ── Determine what to save ────────────────────────────────────────────
    setPhase('saving');

    if (backendResult) {
      // Real inference succeeded — save with authenticated user_id
      const { data, error: insertError } = await supabase
        .from('analyses')
        .insert({
          user_id: currentUser.id,
          file_name: file.name,
          file_type: backendResult.file_type,
          file_size: file.size,
          status: 'complete',
          authenticity_score: backendResult.authenticity_score,
          verdict: backendResult.verdict,
          indicators: backendResult.indicators,
          explanation: backendResult.explanation,
          is_demo: backendResult.is_demo,
          raw_scores: backendResult.raw_scores,
          frame_results: backendResult.frame_results ?? null,
          limitations: backendResult.limitations,
        })
        .select('id')
        .single();

      if (insertError || !data) {
        console.error('Failed to save analysis to Supabase:', insertError);
        setError(insertError?.message || 'Failed to save results. Please try again.');
        setPhase('idle');
        return;
      }

      onNavigate('results', data.id);
      return;
    }

    // ── Fall back to demo simulation ──────────────────────────────────────
    if (backendError) {
      console.warn(`Backend unavailable (${backendError}). Running in demo mode instead.`);
    }

    const { data, error: insertError } = await supabase
      .from('analyses')
      .insert({
        user_id: currentUser.id,
        file_name: file.name,
        file_type: fileType,
        file_size: file.size,
        status: 'processing',
        is_demo: true,
      })
      .select('id')
      .single();

    if (insertError || !data) {
      console.error('Failed to save demo analysis to Supabase:', insertError);
      setError(insertError?.message || 'Failed to start analysis. Please try again.');
      setPhase('idle');
      return;
    }

    onNavigate('analysis', data.id);
  };

  const detectedType = file ? detectType(file) : null;
  const submitting = phase !== 'idle';

  const typeCards = [
    { type: 'image', icon: <FileImage size={20} />, label: 'Images', exts: 'JPEG, PNG, WebP, GIF, BMP', color: '#38bdf8' },
    { type: 'video', icon: <FileVideo size={20} />, label: 'Videos', exts: 'MP4, WebM, MOV, AVI', color: '#a78bfa' },
    { type: 'audio', icon: <FileAudio size={20} />, label: 'Audio', exts: 'MP3, WAV, FLAC, OGG, AAC', color: '#34d399' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#f0f6ff' }}>Upload Media</h1>
        <p className="text-sm" style={{ color: '#64748b' }}>
          Select a file to begin deepfake analysis. Your file is processed locally and never stored
          publicly.
        </p>
      </div>

      {/* Backend status indicator */}
      <div
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs"
        style={{
          background: backendAlive ? 'rgba(52,211,153,0.07)' : 'rgba(251,191,36,0.07)',
          border: `1px solid ${backendAlive ? 'rgba(52,211,153,0.25)' : 'rgba(251,191,36,0.25)'}`,
          color: backendAlive ? '#34d399' : '#fbbf24',
        }}
      >
        {backendAlive ? <Cpu size={13} /> : <FlaskConical size={13} />}
        {backendAlive === true
          ? 'Real AI backend online — analysis will use the deepfake detection model.'
          : backendAlive === false
            ? 'Backend offline — results will run in demo simulation mode. Start the FastAPI backend for real inference.'
            : 'Connecting to AI detection backend…'}
      </div>

      {/* Drop zone */}
      <div
        onClick={() => !file && !submitting && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!submitting) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className="relative rounded-2xl transition-all duration-200"
        style={{
          border: `2px dashed ${dragOver ? '#38bdf8' : file ? '#1e3a5f' : '#1e2d4a'}`,
          background: dragOver ? 'rgba(56,189,248,0.04)' : '#080c1a',
          minHeight: 220,
          cursor: submitting ? 'default' : 'pointer',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALL_ACCEPTED.join(',')}
          onChange={onInputChange}
          className="hidden"
          disabled={submitting}
        />

        {submitting ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mb-4" />
            <p className="text-sm font-semibold mb-1" style={{ color: '#f0f6ff' }}>
              {PHASE_LABELS[phase]}
            </p>
            <p className="text-xs" style={{ color: '#475569' }}>
              {phase === 'analyzing' ? 'This may take 15–60 seconds on first run (model loading).' : 'Please wait…'}
            </p>
          </div>
        ) : !file ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: dragOver ? 'rgba(56,189,248,0.15)' : 'rgba(14,165,233,0.08)',
                border: '1px solid rgba(14,165,233,0.2)',
              }}
            >
              <UploadIcon size={28} style={{ color: dragOver ? '#38bdf8' : '#0ea5e9' }} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#cbd5e1' }}>
              {dragOver ? 'Drop your file here' : 'Drag & drop or click to select'}
            </p>
            <p className="text-xs" style={{ color: '#475569' }}>
              Images, videos, and audio up to 100 MB
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-4 p-6">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(14,165,233,0.1)',
                border: '1px solid rgba(14,165,233,0.2)',
              }}
            >
              {detectedType === 'video' ? (
                <FileVideo size={26} style={{ color: '#a78bfa' }} />
              ) : detectedType === 'audio' ? (
                <FileAudio size={26} style={{ color: '#34d399' }} />
              ) : (
                <FileImage size={26} style={{ color: '#38bdf8' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate" style={{ color: '#f0f6ff' }}>
                {file.name}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                {formatFileSize(file.size)} &bull; {detectedType} &bull; {file.type}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setError(null);
              }}
              className="p-2 rounded-lg transition hover:bg-white/5"
              style={{ color: '#475569' }}
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
          style={{
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            color: '#fca5a5',
          }}
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Supported types */}
      <div>
        <p
          className="text-xs font-semibold mb-3 tracking-wider uppercase"
          style={{ color: '#475569' }}
        >
          Supported Formats
        </p>
        <div className="grid grid-cols-3 gap-3">
          {typeCards.map((t) => (
            <div
              key={t.type}
              className="rounded-xl p-4"
              style={{
                background:
                  file && detectedType === t.type
                    ? `rgba(${
                        t.color === '#38bdf8'
                          ? '56,189,248'
                          : t.color === '#a78bfa'
                            ? '167,139,250'
                            : '52,211,153'
                      },0.08)`
                    : '#080c1a',
                border: `1px solid ${
                  file && detectedType === t.type ? t.color + '40' : '#1e2d4a'
                }`,
              }}
            >
              <div style={{ color: t.color }} className="mb-2">
                {t.icon}
              </div>
              <div className="text-xs font-semibold mb-0.5" style={{ color: '#cbd5e1' }}>
                {t.label}
              </div>
              <div className="text-xs" style={{ color: '#475569' }}>
                {t.exts}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy note */}
      <div
        className="rounded-xl px-4 py-3 text-xs"
        style={{ background: '#080c1a', border: '1px solid #1e2d4a', color: '#475569' }}
      >
        <strong style={{ color: '#64748b' }}>Privacy:</strong> Uploaded files are not stored or
        shared publicly. Only metadata (file name, type, size) is recorded. Do not upload sensitive
        personal media.
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!file || submitting}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 hover:scale-[1.01]"
        style={{ background: 'linear-gradient(90deg, #0ea5e9, #06b6d4)', color: '#fff' }}
      >
        {submitting ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            {PHASE_LABELS[phase]}
          </>
        ) : (
          <>
            Analyze File
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </div>
  );
}
