import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createScene,
  dropCookie,
  poke,
  pokeEveryone,
  skateParty,
  snowballFight,
  startProcession,
  throwPlayerSnowball,
  tick,
  type ActorKind,
  type Point,
  type SceneRules,
  type SceneState,
} from './sceneModel';

export const MAX_COOKIES = 5;

export const CAST: { kind: ActorKind; look: number }[] = [
  { kind: 'nisse', look: 0 },
  { kind: 'nisse', look: 1 },
  { kind: 'reindeer', look: 0 },
  { kind: 'nisse', look: 2 },
  { kind: 'nisse', look: 3 },
  { kind: 'reindeer', look: 1 },
  { kind: 'nisse', look: 4 },
];

interface SceneOptions {
  /** Average time between Lucia processions. `undefined` = only when asked (demo). */
  processionEveryMs?: number;
  /** Whether today is a skating day and/or a snowball day. */
  rules: SceneRules;
}

export function useScene({ processionEveryMs, rules }: SceneOptions) {
  const [scene, setScene] = useState<SceneState>(() => createScene(CAST, Math.random, 0, rules));
  // A new day (or the time machine) can change what the nisser are up to – picked up on the next frame.
  const rulesRef = useRef(rules);
  /** The demo panel can force skating or snowball fights on any day. */
  const forced = useRef<Partial<SceneRules>>({});
  useEffect(() => {
    rulesRef.current = rules;
  }, [rules]);
  const nextProcession = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let frame = 0;
    let previous = performance.now();
    if (!nextProcession.current && processionEveryMs) {
      nextProcession.current = previous + processionEveryMs * (0.3 + Math.random() * 0.4);
    }

    const loop = (now: number) => {
      const elapsed = Math.min(now - previous, 100);
      previous = now;
      setScene((state) => {
        const wanted = { ...rulesRef.current, ...forced.current };
        const current =
          state.rules.skating === wanted.skating && state.rules.snowballFights === wanted.snowballFights
            ? state
            : { ...state, rules: wanted };
        let next = tick(current, elapsed, now, Math.random);
        if (processionEveryMs && now > nextProcession.current && !next.procession) {
          next = startProcession(next, now);
          nextProcession.current = now + processionEveryMs * (0.75 + Math.random() * 0.5);
        }
        return next;
      });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [processionEveryMs]);

  const pokeActor = useCallback((id: number) => setScene((s) => poke(s, id, performance.now(), Math.random)), []);

  const feed = useCallback(
    (at: Point) => setScene((s) => (s.cookies.length >= MAX_COOKIES ? s : dropCookie(s, at, performance.now()))),
    [],
  );

  const lucia = useCallback(() => {
    if (processionEveryMs) nextProcession.current = performance.now() + processionEveryMs;
    setScene((s) => startProcession(s, performance.now()));
  }, [processionEveryMs]);

  const throwSnowball = useCallback(
    (at: Point) => setScene((s) => throwPlayerSnowball(s, at, performance.now())),
    [],
  );

  const fight = useCallback(() => {
    forced.current.snowballFights = true;
    setScene((s) => snowballFight(s, performance.now(), Math.random));
  }, []);
  const skate = useCallback(() => {
    forced.current.skating = true;
    setScene((s) => skateParty(s, performance.now(), Math.random));
  }, []);
  const tickleAll = useCallback(() => setScene((s) => pokeEveryone(s, performance.now(), Math.random)), []);
  const cookieRain = useCallback(() => {
    setScene((s) => {
      let next = s;
      for (let i = next.cookies.length; i < MAX_COOKIES; i++) {
        next = dropCookie(next, { x: 10 + Math.random() * 80, y: 62 + Math.random() * 28 }, performance.now());
      }
      return next;
    });
  }, []);

  return { scene, pokeActor, feed, throwSnowball, lucia, fight, skate, tickleAll, cookieRain };
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
