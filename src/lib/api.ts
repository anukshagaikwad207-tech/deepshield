/**
 * Bridge between the frontend and the FastAPI backend.
 *
 * If VITE_API_URL is not set (or empty), every call returns null and the
 * caller falls back to the local demo simulation.  This means the app
 * continues to work without the backend running.
 */
import type { Indicator, Verdict, FileType } from '@/types';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export interface BackendResult {
  file_name: string;
  file_type: FileType;
  verdict: Verdict;
  authenticity_score: number;
  raw_scores: { fake: number; real: number };
  indicators: Indicator[];
  explanation: string;
  limitations: string[];
  frame_results: Array<{
    frame_index: number;
    timestamp_seconds: number;
    fake_score: number;
    real_score: number;
  }> | null;
  is_demo: boolean;
}

/** Returns true only when the backend URL is configured and the server responds. */
export async function checkBackendHealth(): Promise<boolean> {
  if (!API_URL) return false;
  try {
    const resp = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Send a file to the backend for analysis.
 *
 * Returns a BackendResult on success, or null if:
 *   - VITE_API_URL is not configured
 *   - The backend is unreachable
 *   - The server returns an error
 *
 * The caller is responsible for showing the appropriate fallback (demo mode).
 */
export async function analyzeFile(file: File): Promise<BackendResult | null> {
  if (!API_URL) return null;

  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    // Network error — backend unreachable
    return null;
  }

  if (!response.ok) {
    let detail = `Backend returned ${response.status}`;
    try {
      const err = await response.json();
      if (err.detail) detail = err.detail;
    } catch { /* ignore JSON parse failure */ }
    throw new Error(detail);
  }

  const data = await response.json();

  // Guard: ensure the response has the expected shape before returning it
  if (
    typeof data.verdict !== 'string' ||
    typeof data.authenticity_score !== 'number' ||
    !Array.isArray(data.indicators)
  ) {
    throw new Error('Backend returned an unexpected response shape.');
  }

  return data as BackendResult;
}
