import {
  Shield,
  Eye,
  AlertTriangle,
  BookOpen,
  Users,
  Lock,
  Cpu,
  ChevronRight,
} from 'lucide-react';

export default function About() {
  const sections = [
    {
      icon: <Eye size={20} />,
      color: '#38bdf8',
      title: 'What is a Deepfake?',
      content: `A deepfake is synthetic media — an image, video, or audio clip — in which a person's likeness, voice, or actions have been fabricated or altered using artificial intelligence. The term combines "deep learning" (the AI technique used) with "fake."

Modern deepfakes are created using generative adversarial networks (GANs) or diffusion models, which can produce near-photorealistic content. While some uses are harmless (entertainment, art), deepfakes pose serious risks when used to spread misinformation, create non-consensual intimate imagery, or commit fraud.`,
    },
    {
      icon: <Shield size={20} />,
      color: '#34d399',
      title: 'Project Purpose',
      content: `DeepShield AI is a college capstone project exploring the application of machine learning to media authenticity verification. The goal is to provide an accessible, user-friendly platform that helps individuals and organizations assess the likelihood that a piece of media has been synthetically generated or manipulated.

The platform is designed to demonstrate the architecture and user experience of a professional media forensics tool, with AI model integration planned for a future development phase.`,
    },
    {
      icon: <Cpu size={20} />,
      color: '#a78bfa',
      title: 'How Detection Works',
      content: `Deepfake detection typically relies on several complementary techniques:

• Frequency Analysis: GAN-generated images leave distinctive artifacts in the frequency domain that differ from real camera photos.

• Facial Landmark Geometry: AI-generated faces often show subtle asymmetries or unnaturally smooth transitions between facial regions.

• Temporal Consistency: In videos, deepfakes may show frame-to-frame inconsistencies in lighting, eye blinks, and facial motion.

• Spectral Analysis (Audio): Cloned voices exhibit unusual formant transitions and unnaturally consistent prosody patterns.

• Neural Fingerprinting: Different generative models leave identifiable "fingerprints" detectable by trained classifiers.`,
    },
    {
      icon: <AlertTriangle size={20} />,
      color: '#fbbf24',
      title: 'Current Limitations',
      content: `All deepfake detection systems have important limitations you should be aware of:

• No detection system is 100% accurate. High-quality deepfakes may evade detection, and real media may occasionally be flagged incorrectly.

• Detection models can become outdated as generative techniques improve. Continuous retraining is required to maintain effectiveness.

• Context matters. A low authenticity score does not definitively prove manipulation — it indicates signals that warrant further investigation.

• This platform is in demonstration mode. The results shown are simulated and should not be relied upon for any real-world decision-making.`,
    },
    {
      icon: <Users size={20} />,
      color: '#fb923c',
      title: 'Responsible Use',
      content: `DeepShield AI is designed to support media literacy and verification, not to make definitive legal or ethical judgments. Please keep in mind:

• Do not use this tool to harass, accuse, or defame individuals based on analysis results.

• Detection results should be treated as one input among many in a broader investigation process.

• Privacy is important — do not upload media of individuals without their consent.

• Share results responsibly. Labeling media as a "deepfake" based solely on this tool's output could cause real harm to innocent people.`,
    },
    {
      icon: <Lock size={20} />,
      color: '#22d3ee',
      title: 'Privacy & Data Policy',
      content: `We take privacy seriously. When you upload a file:

• The file content is NOT transmitted to any server. Only metadata (file name, type, and size) is stored.

• No uploaded media is displayed publicly or shared with third parties.

• Analysis results are stored locally in the project database for your dashboard history only.

• This is a demonstration project. Do not upload sensitive, private, or personal media.`,
    },
  ];

  const team = [
    { role: 'Project Lead', task: 'System architecture, AI model research' },
    { role: 'Frontend Developer', task: 'UI/UX design, React implementation' },
    { role: 'ML Engineer', task: 'Detection model training and evaluation' },
    { role: 'Backend Engineer', task: 'API design, database schema' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Hero */}
      <div
        className="rounded-2xl p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a, #0c1a3a)', border: '1px solid #1e3a5f' }}
      >
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(14,165,233,0.2) 0%, transparent 60%)' }} />
        <div className="relative flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)' }}
          >
            <BookOpen size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#f0f6ff' }}>About DeepShield AI</h1>
            <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
              A college capstone project exploring AI-assisted media verification and deepfake detection.
              Learn about the technology, its limitations, and how to use it responsibly.
            </p>
          </div>
        </div>
      </div>

      {/* Content sections */}
      <div className="space-y-4">
        {sections.map((s) => (
          <details key={s.title} className="group rounded-xl overflow-hidden" style={{ background: '#080c1a', border: '1px solid #1e2d4a' }}>
            <summary
              className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none list-none"
              style={{ color: '#f0f6ff' }}
            >
              <span style={{ color: s.color }}>{s.icon}</span>
              <span className="text-sm font-semibold flex-1">{s.title}</span>
              <ChevronRight size={16} style={{ color: '#475569' }} className="transition-transform group-open:rotate-90" />
            </summary>
            <div className="px-5 pb-5" style={{ borderTop: '1px solid #1e2d4a' }}>
              <p className="text-sm leading-relaxed whitespace-pre-line pt-4" style={{ color: '#94a3b8' }}>
                {s.content}
              </p>
            </div>
          </details>
        ))}
      </div>

      {/* Project team */}
      <div className="rounded-xl p-5" style={{ background: '#080c1a', border: '1px solid #1e2d4a' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#f0f6ff' }}>Project Team</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {team.map((m) => (
            <div key={m.role} className="rounded-lg p-3" style={{ background: '#0f172a', border: '1px solid #1e2d4a' }}>
              <div className="text-xs font-semibold mb-0.5" style={{ color: '#38bdf8' }}>{m.role}</div>
              <div className="text-xs" style={{ color: '#64748b' }}>{m.task}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <div className="rounded-xl p-5" style={{ background: '#080c1a', border: '1px solid #1e2d4a' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#f0f6ff' }}>Technology Stack</h2>
        <div className="flex flex-wrap gap-2">
          {['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'Supabase', 'Lucide React', 'Node.js'].map((t) => (
            <span
              key={t}
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', color: '#38bdf8' }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div
        className="flex items-start gap-3 px-4 py-4 rounded-xl text-xs"
        style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', color: '#fca5a5' }}
      >
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <span>
          <strong>Academic Disclaimer:</strong> DeepShield AI is a student project created for educational
          purposes. Results displayed are simulated demonstrations. This tool should NOT be used for
          any real-world legal, journalistic, or forensic purposes without proper AI model validation.
        </span>
      </div>
    </div>
  );
}
