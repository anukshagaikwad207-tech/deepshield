export type FileType = 'image' | 'video' | 'audio';
export type AnalysisStatus = 'processing' | 'complete' | 'error';
export type Verdict = 'authentic' | 'suspicious' | 'likely_fake';

export interface Indicator {
  label: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface Analysis {
  id: string;
  user_id?: string | null;
  created_at: string;
  file_name: string;
  file_type: FileType;
  file_size: number;
  status: AnalysisStatus;
  authenticity_score: number | null;
  verdict: Verdict | null;
  indicators: Indicator[];
  explanation: string | null;
}

export type Page = 'dashboard' | 'upload' | 'analysis' | 'results' | 'about' | 'auth';
