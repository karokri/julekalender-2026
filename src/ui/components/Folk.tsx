/** Folk-art ornaments: a rosemaling flourish and a knitted selburose band. */

interface RoseProps {
  size?: number;
  className?: string;
  color?: string;
  leaf?: string;
}

/** A small symmetric rosemaling flower with C-scrolls. */
export function Rosemaling({ size = 120, className, color = '#c8302c', leaf = '#1f5e3b' }: RoseProps) {
  return (
    <svg viewBox="0 0 200 110" width={size} height={(size * 110) / 200} className={className} aria-hidden="true">
      <g fill="none" stroke={leaf} strokeWidth="6" strokeLinecap="round">
        <path d="M100 70 C 70 70, 40 60, 28 40 C 20 26, 34 14, 46 22 C 56 30, 48 44, 38 40" />
        <path d="M100 70 C 130 70, 160 60, 172 40 C 180 26, 166 14, 154 22 C 144 30, 152 44, 162 40" />
      </g>
      <g fill={leaf}>
        <path d="M60 78 C 40 92, 22 92, 12 84 C 30 76, 46 74, 60 78 Z" />
        <path d="M140 78 C 160 92, 178 92, 188 84 C 170 76, 154 74, 140 78 Z" />
      </g>
      <g stroke="#2a1b17" strokeWidth="3">
        <path d="M100 26 C 84 26, 72 40, 74 58 C 76 76, 90 86, 100 86 C 110 86, 124 76, 126 58 C 128 40, 116 26, 100 26 Z" fill={color} />
        <path d="M100 40 C 90 42, 86 52, 88 62 C 90 72, 96 76, 100 76 C 104 76, 110 72, 112 62 C 114 52, 110 42, 100 40 Z" fill="#f4c542" />
        <circle cx="100" cy="60" r="7" fill={color} />
      </g>
      <g fill="#fffaf0">
        <circle cx="84" cy="50" r="2.5" />
        <circle cx="116" cy="50" r="2.5" />
        <circle cx="100" cy="32" r="2.5" />
      </g>
    </svg>
  );
}

/** The eight-petal "selburose" from Norwegian knitwear. */
export function Selburose({ size = 40, color = '#fffaf0', className }: { size?: number; color?: string; className?: string }) {
  // Built from pixels like a knitting chart, so it looks hand-knitted.
  const chart = [
    '....X....',
    '.X..X..X.',
    '..XXXXX..',
    '..XX.XX..',
    'XXX.X.XXX',
    '..XX.XX..',
    '..XXXXX..',
    '.X..X..X.',
    '....X....',
  ];
  return (
    <svg viewBox="0 0 9 9" width={size} height={size} className={className} aria-hidden="true" shapeRendering="crispEdges">
      {chart.flatMap((row, y) =>
        [...row].map((cell, x) => (cell === 'X' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={color} /> : null)),
      )}
    </svg>
  );
}

/** A knitted band of roses – used at the top and bottom of the page. */
export function KnitBand({ className }: { className?: string }) {
  return <div className={['knit-band', className].filter(Boolean).join(' ')} aria-hidden="true" />;
}
