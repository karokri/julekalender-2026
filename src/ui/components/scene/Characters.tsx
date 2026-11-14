import type { ReactNode } from 'react';
import { NISSE_LOOKS } from '../nisseLooks';
import type { Activity } from './sceneModel';

const OUTLINE = '#2a1b17';

interface CharacterProps {
  look: number;
  activity: Activity;
  facingLeft: boolean;
}

/**
 * Full-body nisse for the scene. Drawn facing right; the wrapper flips it.
 * Feet are at the bottom centre of the 100×120 viewBox.
 */
export function SceneNisse({ look, activity, facingLeft }: CharacterProps) {
  const colors = NISSE_LOOKS[look % NISSE_LOOKS.length];
  const lucia = activity === 'lucia';
  const happy = activity === 'cheering' || activity === 'eating' || activity === 'skating' || lucia;
  const hit = activity === 'hit';
  const tunic = lucia ? '#fffaf0' : colors.hat;

  return (
    <svg viewBox="0 0 100 120" className={`scene-char scene-nisse ${facingLeft ? 'is-left' : ''}`} aria-hidden="true">
      <g className="scene-char__flip">
        <g className="scene-char__body">
          {/* Legs */}
          <g className="scene-char__leg scene-char__leg--back">
            <rect x="38" y="88" width="10" height="20" rx="4" fill="#3b2a24" stroke={OUTLINE} strokeWidth="3" />
            <path d="M34 106 h16 a4 4 0 0 1 0 8 h-16 z" fill="#2a1b17" />
            {activity === 'skating' && <path d="M30 117 h24" stroke="#cfd8e3" strokeWidth="3" strokeLinecap="round" />}
          </g>
          <g className="scene-char__leg scene-char__leg--front">
            <rect x="52" y="88" width="10" height="20" rx="4" fill="#3b2a24" stroke={OUTLINE} strokeWidth="3" />
            <path d="M50 106 h16 a4 4 0 0 1 0 8 h-16 z" fill="#2a1b17" />
            {activity === 'skating' && <path d="M46 117 h24" stroke="#cfd8e3" strokeWidth="3" strokeLinecap="round" />}
          </g>
          {/* Body / tunic */}
          <path
            d="M30 92 C 28 72, 34 58, 50 58 C 66 58, 72 72, 70 92 Z"
            fill={tunic}
            stroke={OUTLINE}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {lucia ? (
            <path d="M33 78 L 67 74" stroke="#c8302c" strokeWidth="5" strokeLinecap="round" />
          ) : (
            <rect x="31" y="80" width="38" height="6" fill="#2a1b17" />
          )}
          {/* Back arm */}
          <path d="M38 64 C 30 70, 28 78, 30 84" fill="none" stroke={OUTLINE} strokeWidth="9" strokeLinecap="round" />
          <path d="M38 64 C 30 70, 28 78, 30 84" fill="none" stroke={tunic} strokeWidth="5" strokeLinecap="round" />
          {/* Head */}
          <ellipse cx="50" cy="44" rx="17" ry="15" fill={colors.skin} stroke={OUTLINE} strokeWidth="3.5" />
          <path
            d="M33 47 C 33 62, 42 70, 50 70 C 58 70, 67 62, 67 47 C 62 53, 57 55, 50 55 C 43 55, 38 53, 33 47 Z"
            fill={colors.beard}
            stroke={OUTLINE}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <Face happy={happy} hit={hit} />
          {lucia ? <CandleCrown /> : <Hat color={colors.hat} pompom={colors.pompom} />}
          {/* Front arm, posed per activity */}
          <FrontArm activity={activity} color={tunic} />
        </g>
      </g>
    </svg>
  );
}

function Face({ happy, hit }: { happy: boolean; hit: boolean }) {
  return (
    <g>
      {hit ? (
        <g stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round">
          <path d="M51 38 l5 5 M56 38 l-5 5" />
          <path d="M60 38 l5 5 M65 38 l-5 5" />
        </g>
      ) : happy ? (
        <g fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round">
          <path d="M51 42 q3 -4 6 0" />
          <path d="M60 42 q3 -4 6 0" />
        </g>
      ) : (
        <g fill={OUTLINE}>
          <circle cx="54" cy="41" r="2.3" />
          <circle cx="63" cy="41" r="2.3" />
        </g>
      )}
      <circle cx="62" cy="48" r="3.6" fill="#e2735e" stroke={OUTLINE} strokeWidth="2" />
      <circle cx="47" cy="48" r="3" fill="#ef8a80" opacity="0.6" />
    </g>
  );
}

function Hat({ color, pompom }: { color: string; pompom: string }) {
  return (
    <g className="scene-nisse__hat">
      <path d="M32 36 C 34 16, 52 6, 70 14 C 78 18, 80 26, 76 32 C 70 26, 62 30, 66 36 Z" fill={color} stroke={OUTLINE} strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="77" cy="32" r="6" fill={pompom} stroke={OUTLINE} strokeWidth="3" />
      <rect x="30" y="31" width="40" height="9" rx="4.5" fill="#fff" stroke={OUTLINE} strokeWidth="3" />
    </g>
  );
}

function CandleCrown() {
  return (
    <g>
      <path d="M32 34 q18 -6 36 0" fill="none" stroke="#2f7a3b" strokeWidth="6" strokeLinecap="round" />
      {[36, 44, 52, 60, 66].map((x, i) => (
        <g key={x}>
          <rect x={x - 2} y={18 + (i % 2) * 2} width="4" height="12" fill="#fffaf0" stroke={OUTLINE} strokeWidth="1.5" />
          <path className="scene-flame" d={`M${x} ${11 + (i % 2) * 2} q3 4 0 7 q-3 -3 0 -7 z`} fill="#f4c542" stroke="#e07a1f" strokeWidth="1" />
        </g>
      ))}
    </g>
  );
}

function FrontArm({ activity, color }: { activity: Activity; color: string }) {
  const arm = (d: string, extra?: ReactNode) => (
    <g className="scene-char__arm">
      <path d={d} fill="none" stroke={OUTLINE} strokeWidth="9" strokeLinecap="round" />
      <path d={d} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
      {extra}
    </g>
  );
  switch (activity) {
    case 'throwing':
      return arm('M60 64 C 68 56, 74 46, 76 36', <circle cx="78" cy="32" r="6" fill="#fff" stroke={OUTLINE} strokeWidth="2.5" />);
    case 'eating':
      return arm(
        'M60 64 C 68 66, 70 58, 66 52',
        <g className="scene-cookie-bite">
          <circle cx="66" cy="52" r="6.5" fill="#c98a4b" stroke={OUTLINE} strokeWidth="2.5" />
          <circle cx="64" cy="51" r="1" fill={OUTLINE} />
          <circle cx="68" cy="54" r="1" fill={OUTLINE} />
        </g>,
      );
    case 'cheering':
      return arm('M60 64 C 66 56, 70 48, 70 40');
    case 'lucia':
      return arm(
        'M60 64 C 68 68, 72 70, 74 66',
        <g>
          <rect x="72" y="52" width="5" height="14" fill="#fffaf0" stroke={OUTLINE} strokeWidth="1.5" />
          <path className="scene-flame" d="M74.5 44 q4 5 0 8 q-4 -3 0 -8 z" fill="#f4c542" stroke="#e07a1f" strokeWidth="1" />
        </g>,
      );
    case 'skating':
      return arm('M60 64 C 70 62, 78 60, 84 56');
    case 'hit':
      return arm('M60 64 C 68 60, 70 52, 64 46');
    default:
      return arm('M60 64 C 66 70, 68 78, 66 84');
  }
}

/** A reindeer – the first one has a shiny red nose. Feet at the bottom of the 130×110 viewBox. */
export function SceneReindeer({ look, activity, facingLeft }: CharacterProps) {
  const rudolf = look === 0;
  const happy = activity === 'cheering' || activity === 'eating' || activity === 'skating';
  const body = look % 2 === 0 ? '#9a6a43' : '#7d5435';
  return (
    <svg viewBox="0 0 130 110" className={`scene-char scene-reindeer ${facingLeft ? 'is-left' : ''}`} aria-hidden="true">
      <g className="scene-char__flip">
        <g className="scene-char__body">
          {/* Legs */}
          {[30, 44, 76, 90].map((x, i) => (
            <g key={x} className={`scene-char__leg ${i % 2 ? 'scene-char__leg--front' : 'scene-char__leg--back'}`}>
              <rect x={x} y="68" width="9" height="34" rx="4" fill={body} stroke={OUTLINE} strokeWidth="3" />
              <rect x={x - 1} y="96" width="11" height="7" rx="2" fill={OUTLINE} />
              {activity === 'skating' && <path d={`M${x - 4} 107 h18`} stroke="#cfd8e3" strokeWidth="3" strokeLinecap="round" />}
            </g>
          ))}
          {/* Body */}
          <ellipse cx="62" cy="64" rx="42" ry="20" fill={body} stroke={OUTLINE} strokeWidth="3.5" />
          <ellipse cx="66" cy="72" rx="26" ry="9" fill="#e9d2b0" />
          <path d="M22 56 q-8 -6 -4 -14 q6 4 8 10" fill="#e9d2b0" stroke={OUTLINE} strokeWidth="3" />
          {/* Neck & head */}
          <path d="M90 58 C 96 46, 100 38, 104 30" fill="none" stroke={OUTLINE} strokeWidth="16" strokeLinecap="round" />
          <path d="M90 58 C 96 46, 100 38, 104 30" fill="none" stroke={body} strokeWidth="10" strokeLinecap="round" />
          {/* Scarf wrapped around the neck, with a tail hanging down */}
          <g stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" fill="#c8302c">
            <path d="M86 44 L 104 51 L 101 57 L 83 50 Z" />
            <path d="M88 50 L 84 64 L 90 65 L 93 52 Z" />
          </g>
          <g className="scene-reindeer__head">
            {/* Antlers */}
            <g fill="none" stroke="#6b4a2b" strokeWidth="4" strokeLinecap="round">
              <path d="M100 18 C 96 8, 92 4, 86 2 M95 9 l-8 2" />
              <path d="M108 16 C 110 6, 116 2, 122 2 M113 7 l6 4" />
            </g>
            <ellipse cx="108" cy="26" rx="14" ry="11" fill={body} stroke={OUTLINE} strokeWidth="3.5" />
            <ellipse cx="96" cy="20" rx="5" ry="3" fill={body} stroke={OUTLINE} strokeWidth="2.5" transform="rotate(-30 96 20)" />
            {happy ? (
              <path d="M106 22 q3 -4 6 0" fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round" />
            ) : (
              <circle cx="109" cy="22" r="2.4" fill={OUTLINE} />
            )}
            <circle
              cx="121"
              cy="29"
              r={rudolf ? 5.5 : 4}
              fill={rudolf ? '#e3261f' : '#3b2a24'}
              stroke={OUTLINE}
              strokeWidth="2"
              className={rudolf ? 'scene-reindeer__nose--shiny' : undefined}
            />
            {activity === 'eating' && <circle cx="118" cy="36" r="5" fill="#c98a4b" stroke={OUTLINE} strokeWidth="2" />}
          </g>
        </g>
      </g>
    </svg>
  );
}
