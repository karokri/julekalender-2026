import { useEffect, type MouseEvent } from 'react';
import { isDemo, onDemo } from '../../../demo/demoBus';
import { SceneNisse, SceneReindeer } from './Characters';
import { isJumping, snowballPosition, type Actor } from './sceneModel';
import { MAX_COOKIES, useScene } from './useScene';
import './scene.css';

interface NisseSceneProps {
  /** On Lucia day the procession comes much more often. */
  isLuciaDay: boolean;
  /** Called for every tickle, cookie and Lucia procession – counted on the «Nissevenner» board. */
  onInteract?: () => void;
}

/** «Nissetunet»: a snowy farmyard where nisser and reindeer live their own lives. */
export function NisseScene({ isLuciaDay, onInteract }: NisseSceneProps) {
  const { scene, pokeActor, feed, lucia, fight, skate, tickleAll, cookieRain } = useScene({
    // In the demo the procession only starts when you press the button.
    processionEveryMs: isDemo ? undefined : isLuciaDay ? 25_000 : 75_000,
  });

  useEffect(() => {
    if (!isDemo) return undefined;
    const actions = { lucia, snowballs: fight, cookies: cookieRain, skate, tickle: tickleAll };
    return onDemo('scene', (action) => actions[action]());
  }, [lucia, fight, cookieRain, skate, tickleAll]);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (scene.cookies.length < MAX_COOKIES) onInteract?.();
    feed({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    });
  };

  return (
    <section className="scene" aria-label="Nissetunet">
      <div className="scene__stage" onClick={handleClick}>
        <Scenery />
        {scene.cookies.map((cookie) => (
          <span key={cookie.id} className="scene__cookie" style={{ left: `${cookie.x}%`, top: `${cookie.y}%` }}>
            🍪
          </span>
        ))}
        {[...scene.actors]
          .sort((a, b) => a.y - b.y)
          .map((actor) => (
            <ActorView
              key={actor.id}
              actor={actor}
              jumping={isJumping(actor, scene.now)}
              onPoke={(id) => {
                onInteract?.();
                pokeActor(id);
              }}
            />
          ))}
        {scene.snowballs
          .filter((ball) => ball.thrownAt <= scene.now)
          .map((ball) => {
            const p = snowballPosition(ball, scene.now);
            return <span key={ball.id} className="scene__snowball" style={{ left: `${p.x}%`, top: `${p.y}%` }} />;
          })}
      </div>
      <div className="scene__footer">
        <p className="scene__hint">Kil en nisse eller et reinsdyr, eller klikk i snøen for å kaste en pepperkake. Alt teller på nissevenn-tavla!</p>
        <button
          type="button"
          className="button button--small"
          onClick={() => {
            onInteract?.();
            lucia();
          }}
          disabled={!!scene.procession}
          title="Start et luciatog"
        >
          🕯️ Luciatog
        </button>
      </div>
    </section>
  );
}

function ActorView({ actor, jumping, onPoke }: { actor: Actor; jumping: boolean; onPoke: (id: number) => void }) {
  const depth = 0.7 + ((actor.y - 55) / 40) * 0.45;
  const classes = ['scene__actor', `is-${actor.activity}`, jumping && 'is-jumping', `scene__actor--${actor.kind}`];
  const Character = actor.kind === 'nisse' ? SceneNisse : SceneReindeer;

  return (
    <div
      className={classes.filter(Boolean).join(' ')}
      style={{ left: `${actor.x}%`, top: `${actor.y}%`, zIndex: Math.round(actor.y), ['--depth' as string]: depth }}
    >
      {actor.speech && <div className="speech-bubble">{actor.speech}</div>}
      <span className="scene__shadow" aria-hidden="true" />
      <button
        type="button"
        className="scene__actor-button"
        onClick={(event) => {
          event.stopPropagation();
          onPoke(actor.id);
        }}
        aria-label={actor.kind === 'nisse' ? 'Kile nissen' : 'Klappe reinsdyret'}
      >
        <Character look={actor.look} activity={actor.activity} facingLeft={actor.facingLeft} />
      </button>
      {actor.activity === 'hit' && <span className="scene__poof" aria-hidden="true" />}
      {jumping && (
        <span className="scene__particles" aria-hidden="true">
          {['✨', '❤️', '✨'].map((s, i) => (
            <span key={i} style={{ ['--i' as string]: i }}>
              {s}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

const STARS: [number, number, number][] = [
  [60, 40, 3], [180, 25, 2], [260, 70, 2.5], [400, 30, 3], [520, 55, 2], [640, 22, 2.5], [740, 45, 3], [960, 30, 2],
];

function Scenery() {
  return (
    <svg className="scene__scenery" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="scene-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14214a" />
          <stop offset="1" stopColor="#3b5596" />
        </linearGradient>
        <linearGradient id="scene-aurora" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5ef2b0" stopOpacity="0" />
          <stop offset="0.5" stopColor="#5ef2b0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#7fb6ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1000" height="400" fill="url(#scene-sky)" />
      <path className="scene__aurora" d="M0 90 C 200 30, 380 120, 560 60 S 860 20, 1000 70 L1000 110 C 840 70, 700 140, 540 100 S 200 80, 0 130 Z" fill="url(#scene-aurora)" />
      <g className="scene__stars" fill="#fff6c7">
        {STARS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} style={{ animationDelay: `${-i * 0.7}s` }} />
        ))}
      </g>
      <circle cx="880" cy="58" r="30" fill="#fff6c7" stroke="#2a1b17" strokeWidth="4" />
      {/* Mountains and hills */}
      <path d="M0 190 L110 100 L210 180 L330 80 L460 180 L590 110 L720 185 L850 120 L1000 180 V400 H0 Z" fill="#dfe8ff" stroke="#2a1b17" strokeWidth="4" />
      <path d="M0 215 Q250 175 500 210 T1000 205 V400 H0 Z" fill="#ffffff" stroke="#2a1b17" strokeWidth="4" />
      {/* Red barn (låve) */}
      <g stroke="#2a1b17" strokeWidth="4" strokeLinejoin="round">
        <path d="M120 230 V170 L170 130 L220 170 V230 Z" fill="#b8322e" />
        <path d="M110 176 L170 124 L230 176" fill="none" stroke="#fffaf0" strokeWidth="7" />
        <rect x="150" y="190" width="40" height="40" fill="#8c2f39" />
        <path d="M150 190 L190 230 M190 190 L150 230" stroke="#fffaf0" strokeWidth="3" />
        <circle cx="170" cy="160" r="8" fill="#f4c542" />
      </g>
      {/* Stabbur */}
      <g stroke="#2a1b17" strokeWidth="4" strokeLinejoin="round">
        <rect x="262" y="222" width="8" height="14" fill="#6b4a2b" />
        <rect x="312" y="222" width="8" height="14" fill="#6b4a2b" />
        <rect x="250" y="168" width="82" height="56" fill="#9a6a43" />
        <path d="M240 172 L291 132 L342 172 Z" fill="#fffaf0" />
        <rect x="282" y="186" width="18" height="24" fill="#6b4a2b" />
        <rect x="258" y="182" width="16" height="12" fill="#f4c542" />
      </g>
      {/* Frozen pond – must match ICE in sceneModel (62% / 80%) */}
      <ellipse cx="620" cy="322" rx="200" ry="38" fill="#bfe6f7" stroke="#2a1b17" strokeWidth="4" />
      <ellipse cx="620" cy="326" rx="176" ry="27" fill="#d9f2fb" />
      <g className="scene__ice-shine" stroke="#ffffff" strokeWidth="4" strokeLinecap="round">
        <path d="M520 312 l60 -4" />
        <path d="M660 334 l40 -3" />
        <path d="M590 340 l24 -2" />
      </g>
      <ChristmasTree x={60} y={205} scale={1.05} />
      <ChristmasTree x={930} y={210} scale={0.95} />
      <ChristmasTree x={840} y={195} scale={0.7} />
      <ChristmasTree x={420} y={200} scale={0.6} />
      {/* Snowman */}
      <g stroke="#2a1b17" strokeWidth="3">
        <circle cx="900" cy="330" r="22" fill="#fff" />
        <circle cx="900" cy="296" r="15" fill="#fff" />
        <path d="M900 296 l14 3 l-14 3 z" fill="#f08a24" />
        <rect x="888" y="272" width="24" height="10" fill="#2a1b17" />
      </g>
    </svg>
  );
}

function ChristmasTree({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} stroke="#2a1b17" strokeWidth="4" strokeLinejoin="round">
      <rect x="-10" y="70" width="20" height="24" fill="#6b4a2b" />
      <path d="M0 -60 L50 20 L25 20 L60 75 L-60 75 L-25 20 L-50 20 Z" fill="#1f5e3b" />
      <path d="M0 -78 l6 12 l13 1 l-10 9 l3 13 l-12 -7 l-12 7 l3 -13 l-10 -9 l13 -1 z" fill="#f4c542" />
      <g className="scene__lights">
        <circle cx="-18" cy="40" r="6" fill="#e23b3b" />
        <circle cx="22" cy="55" r="6" fill="#f4c542" />
        <circle cx="10" cy="5" r="5" fill="#e23b3b" />
        <circle cx="-30" cy="62" r="5" fill="#5b8def" />
        <circle cx="-8" cy="18" r="4.5" fill="#f4c542" />
      </g>
    </g>
  );
}
