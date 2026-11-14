import { NISSE_LOOKS, type NisseLook } from './nisseLooks';

export type NisseMood = 'idle' | 'happy' | 'sad' | 'surprised';

interface NisseProps {
  mood?: NisseMood;
  look?: NisseLook;
  size?: number;
  className?: string;
}

const OUTLINE = '#2a1b17';

/** A round, friendly nisse – the mascot of the calendar. */
export function Nisse({ mood = 'idle', look = NISSE_LOOKS[0], size = 100, className }: NisseProps) {
  return (
    <svg
      viewBox="0 0 120 130"
      width={size}
      height={(size * 130) / 120}
      className={['nisse', `nisse--${mood}`, className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <g className="nisse__body">
        {/* Hat – flops to the side */}
        <path
          className="nisse__hat"
          d="M18 62 C 22 30, 50 6, 84 10 C 100 12, 108 24, 104 36 C 92 30, 84 42, 96 62 Z"
          fill={look.hat}
          stroke={OUTLINE}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <circle className="nisse__pompom" cx="104" cy="38" r="9" fill={look.pompom} stroke={OUTLINE} strokeWidth="4" />
        {/* Face */}
        <ellipse cx="58" cy="76" rx="34" ry="28" fill={look.skin} stroke={OUTLINE} strokeWidth="4" />
        {/* Beard */}
        <path
          d="M24 80 C 22 104, 40 124, 58 124 C 76 124, 94 104, 92 80 C 84 92, 74 96, 58 96 C 42 96, 32 92, 24 80 Z"
          fill={look.beard}
          stroke={OUTLINE}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* Hat brim */}
        <rect x="14" y="56" width="88" height="16" rx="8" fill="#fff" stroke={OUTLINE} strokeWidth="4" />
        {/* Cheeks */}
        <circle cx="36" cy="84" r="6" fill="#ef8a80" opacity="0.7" />
        <circle cx="80" cy="84" r="6" fill="#ef8a80" opacity="0.7" />
        <Eyes mood={mood} />
        {/* Nose */}
        <circle cx="58" cy="88" r="6" fill="#e2735e" stroke={OUTLINE} strokeWidth="3" />
        <Mouth mood={mood} />
      </g>
    </svg>
  );
}

function Eyes({ mood }: { mood: NisseMood }) {
  if (mood === 'happy') {
    return (
      <g fill="none" stroke={OUTLINE} strokeWidth="4" strokeLinecap="round">
        <path d="M40 80 Q 45 74, 50 80" />
        <path d="M66 80 Q 71 74, 76 80" />
      </g>
    );
  }
  const r = mood === 'surprised' ? 5 : 4;
  return (
    <g fill={OUTLINE} className="nisse__eyes">
      <circle cx="45" cy="80" r={r} />
      <circle cx="71" cy="80" r={r} />
      {mood === 'sad' && (
        <g stroke={OUTLINE} strokeWidth="3" strokeLinecap="round">
          <path d="M38 72 L 50 75" />
          <path d="M78 72 L 66 75" />
        </g>
      )}
    </g>
  );
}

function Mouth({ mood }: { mood: NisseMood }) {
  const common = { fill: 'none', stroke: OUTLINE, strokeWidth: 4, strokeLinecap: 'round' as const };
  switch (mood) {
    case 'happy':
      return <path d="M46 102 Q 58 116, 70 102 Z" fill="#9b2c2c" stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />;
    case 'sad':
      return <path d="M48 108 Q 58 100, 68 108" {...common} />;
    case 'surprised':
      return <ellipse cx="58" cy="106" rx="5" ry="6" fill="#9b2c2c" stroke={OUTLINE} strokeWidth="3" />;
    default:
      return <path d="M50 102 Q 58 108, 66 102" {...common} />;
  }
}
