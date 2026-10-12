import type { FileType, Indicator, Verdict } from '@/types';

interface DemoResult {
  authenticity_score: number;
  verdict: Verdict;
  indicators: Indicator[];
  explanation: string;
}

const IMAGE_RESULTS: DemoResult[] = [
  {
    authenticity_score: 23,
    verdict: 'likely_fake',
    indicators: [
      { label: 'GAN Fingerprint Detected', severity: 'high', description: 'Generative adversarial network artifacts found in pixel frequency spectrum.' },
      { label: 'Facial Landmark Anomaly', severity: 'high', description: 'Asymmetric facial landmarks inconsistent with natural human geometry.' },
      { label: 'Compression Artifacts', severity: 'medium', description: 'Unusual JPEG compression patterns around facial boundaries.' },
      { label: 'Eye Reflection Inconsistency', severity: 'medium', description: 'Light reflections in pupils do not match the scene lighting direction.' },
    ],
    explanation: 'This image shows strong indicators of AI-generated content. Multiple high-confidence signals were detected including GAN fingerprints and facial geometry anomalies. The pixel-level analysis reveals patterns consistent with modern diffusion or GAN-based synthesis models.',
  },
  {
    authenticity_score: 81,
    verdict: 'authentic',
    indicators: [
      { label: 'Natural Noise Pattern', severity: 'low', description: 'Image noise distribution matches organic camera sensor behavior.' },
    ],
    explanation: 'This image appears to be authentic based on available analysis signals. Pixel frequency patterns, noise distribution, and facial geometry are consistent with natural camera captures. No significant GAN artifacts were detected.',
  },
  {
    authenticity_score: 52,
    verdict: 'suspicious',
    indicators: [
      { label: 'Texture Smoothing', severity: 'medium', description: 'Skin texture shows unusual smoothing patterns potentially from AI enhancement.' },
      { label: 'Background Inconsistency', severity: 'medium', description: 'Background depth-of-field transition does not match foreground focus.' },
    ],
    explanation: 'Several moderate-confidence signals indicate possible manipulation. The image may have been partially AI-enhanced or composited. A definitive conclusion cannot be made without additional metadata analysis.',
  },
];

const VIDEO_RESULTS: DemoResult[] = [
  {
    authenticity_score: 18,
    verdict: 'likely_fake',
    indicators: [
      { label: 'Face Swap Detected', severity: 'high', description: 'Frame-to-frame face region analysis indicates a deepfake face swap.' },
      { label: 'Temporal Inconsistency', severity: 'high', description: 'Facial motion vectors do not follow natural biological movement curves.' },
      { label: 'Blending Boundary', severity: 'medium', description: 'Visible blending artifacts detected at the hairline and jaw boundaries in 67% of frames.' },
      { label: 'Eye Blink Anomaly', severity: 'medium', description: 'Eye blink frequency and duration are statistically abnormal compared to natural rates.' },
    ],
    explanation: 'This video contains strong evidence of deepfake manipulation. Frame-by-frame analysis detected a face-swap operation consistent with neural network-based video synthesis. The facial motion and blending patterns are characteristic of current deepfake generation methods.',
  },
  {
    authenticity_score: 74,
    verdict: 'authentic',
    indicators: [
      { label: 'Consistent Lighting', severity: 'low', description: 'Scene lighting direction is consistent across all frames.' },
    ],
    explanation: 'This video appears authentic. Temporal consistency checks, facial motion analysis, and compression artifact evaluation found no significant indicators of synthetic manipulation.',
  },
];

const AUDIO_RESULTS: DemoResult[] = [
  {
    authenticity_score: 31,
    verdict: 'likely_fake',
    indicators: [
      { label: 'Voice Cloning Signature', severity: 'high', description: 'Spectral patterns match known voice synthesis model outputs.' },
      { label: 'Prosody Abnormality', severity: 'high', description: 'Unnatural stress and intonation patterns detected in the speech rhythm.' },
      { label: 'Formant Irregularity', severity: 'medium', description: 'Formant transitions between phonemes are smoother than typical human speech.' },
    ],
    explanation: 'The audio exhibits strong indicators of AI voice synthesis. The spectral and prosodic analysis suggests this recording was generated using a text-to-speech or voice cloning model rather than recorded from a real person.',
  },
  {
    authenticity_score: 88,
    verdict: 'authentic',
    indicators: [],
    explanation: 'This audio recording appears authentic. Natural background noise, organic prosody patterns, and normal formant transitions were detected. No voice cloning artifacts were found.',
  },
];

function pickResult(type: FileType): DemoResult {
  const pool = type === 'image' ? IMAGE_RESULTS : type === 'video' ? VIDEO_RESULTS : AUDIO_RESULTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateDemoResult(type: FileType): DemoResult {
  return pickResult(type);
}
