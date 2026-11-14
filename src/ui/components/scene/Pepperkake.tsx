const OUTLINE = '#2a1b17';

/** A gingerbread man with white icing – what you throw to the nisser. */
export function Pepperkake({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 44" width={size} height={(size * 44) / 40} aria-hidden="true">
      <path d={PEPPERKAKE_PATH} fill="#b5651d" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <g fill="none" stroke="#fffaf0" strokeWidth="1.6" strokeLinecap="round">
        <path d="M5 19 q2 -2 4 0" />
        <path d="M31 19 q2 -2 4 0" />
        <path d="M11 39 q2 -2 4 0" />
        <path d="M25 39 q2 -2 4 0" />
        <path d="M16 12 q4 3 8 0" />
      </g>
      <g fill="#fffaf0">
        <circle cx="16" cy="8" r="1.4" />
        <circle cx="24" cy="8" r="1.4" />
        <circle cx="20" cy="20" r="1.5" />
        <circle cx="20" cy="26" r="1.5" />
      </g>
    </svg>
  );
}

export const PEPPERKAKE_PATH =
  'M20 2 a7 7 0 0 1 6 11 h7 a4 4 0 0 1 0 8 h-6 l2 9 l4 8 a4 4 0 0 1 -7 4 l-6 -9 l-6 9 a4 4 0 0 1 -7 -4 l4 -8 l2 -9 h-6 a4 4 0 0 1 0 -8 h7 a7 7 0 0 1 6 -11 z';

/** Same shape as a mouse cursor (data URI), so the pointer shows what you are about to throw. */
export const PEPPERKAKE_CURSOR = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='35' viewBox='0 0 40 44'><path d='${PEPPERKAKE_PATH}' fill='#b5651d' stroke='#2a1b17' stroke-width='2'/></svg>`,
)}") 16 16, pointer`;

export const SNOWBALL_CURSOR = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='9' fill='white' stroke='#2a1b17' stroke-width='2.5'/></svg>",
)}") 12 12, crosshair`;
