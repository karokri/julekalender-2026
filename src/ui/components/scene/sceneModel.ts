/**
 * Pure state transitions for «Nissetunet»: nisser and reindeer that wander, run, skate on the
 * frozen pond, throw snowballs at each other, eat cookies and walk in a Lucia procession.
 * Coordinates are percentages of the scene; `y` is where the feet touch the ground.
 */

export interface Point {
  x: number;
  y: number;
}

export type ActorKind = 'nisse' | 'reindeer';
export type Activity = 'idle' | 'walking' | 'running' | 'skating' | 'throwing' | 'hit' | 'eating' | 'cheering' | 'lucia';

export interface Actor extends Point {
  id: number;
  kind: ActorKind;
  /** Index into the look palettes. */
  look: number;
  target: Point;
  facingLeft: boolean;
  activity: Activity;
  /** Until when the current activity (throwing, hit, eating …) lasts. */
  busyUntil: number;
  restUntil: number;
  speech?: string;
  speechUntil: number;
  jumpingUntil: number;
  chasingCookieId?: number;
  running: boolean;
}

export interface Snowball {
  id: number;
  from: Point;
  to: Point;
  targetId: number;
  throwerId: number;
  thrownAt: number;
}

export interface Cookie extends Point {
  id: number;
}

export interface Procession {
  startedAt: number;
  /** Actor ids, first one is Lucia herself. */
  members: number[];
}

/** What the nisser get up to today. Skating and snowball fights only happen on some days. */
export interface SceneRules {
  skating: boolean;
  snowballFights: boolean;
}

export const EVERYDAY: SceneRules = { skating: false, snowballFights: false };

export interface SceneState {
  rules: SceneRules;
  actors: Actor[];
  snowballs: Snowball[];
  cookies: Cookie[];
  procession?: Procession;
  nextId: number;
  now: number;
}

export type Random = () => number;

export const BOUNDS = { minX: 6, maxX: 94, minY: 58, maxY: 92 };
/** The frozen pond, as an ellipse (matches the scenery SVG). */
export const ICE = { cx: 62, cy: 80, rx: 20, ry: 8.5 };
/** The lane the Lucia procession walks along. */
const LUCIA_LANE_Y = 66;
const LUCIA_SPACING = 9;

const SPEED = { walk: 7, run: 17, skate: 15, lucia: 5, chase: 14 } as const;
const ARRIVAL_DISTANCE = 1.2;
const SNOWBALL_FLIGHT_MS = 750;
const THROW_MS = 500;
const HIT_MS = 1300;
const EAT_MS = 2000;
const JUMP_MS = 700;
const SPEECH_MS = 2200;
const RETALIATE_CHANCE = 0.45;

export const POKE_LINES = [
  'Ho ho hoo!',
  'Har du åpnet dagens luke?',
  'Kili-kili! 😆',
  'Har du en pepperkake?',
  'Jeg har sett deg, og du har vært snill!',
  'God jul!',
  'Psst … nissen hører alt.',
  'Har noen sett grøten min?',
];

const REINDEER_LINES = ['Mø!', 'Jeg øver til julaften!', 'Har du en gulrot?', 'Rudolf er ikke den eneste, altså.'];
const HIT_LINES = ['Au!', 'Hei!', 'Treff! ❄️', 'Nå skal du få!', 'Brrr!'];
const THROW_LINES = ['Fang!', 'Snøballkrig!', 'Hehe!'];
const LUCIA_LINES = ['♪ Sankta Lucia ♪', '♪ Natten går tunge fjed ♪', '♪ Svart senker natten seg ♪'];

export function createScene(
  cast: { kind: ActorKind; look: number }[],
  random: Random,
  now: number,
  rules: SceneRules = { skating: true, snowballFights: true },
): SceneState {
  return {
    rules,
    actors: cast.map(({ kind, look }, id) => {
      const start = randomGroundPoint(random);
      return {
        id,
        kind,
        look,
        ...start,
        target: start,
        facingLeft: random() < 0.5,
        activity: 'idle',
        busyUntil: 0,
        restUntil: now + random() * 2500,
        speechUntil: 0,
        jumpingUntil: 0,
        running: false,
      };
    }),
    snowballs: [],
    cookies: [],
    nextId: 1,
    now,
  };
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

export function tick(state: SceneState, elapsedMs: number, now: number, random: Random): SceneState {
  let next: SceneState = { ...state, now };
  next = landSnowballs(next, now, random);
  next = { ...next, actors: next.actors.map((a) => expire(a, now)) };
  next = advanceProcession(next, now);

  let cookies = next.cookies;
  let snowballs = next.snowballs;
  let nextId = next.nextId;

  const actors = next.actors.map((actor) => {
    if (actor.busyUntil > now || actor.activity === 'lucia') return move(actor, elapsedMs, now, next.rules.skating);

    let moved = move(actor, elapsedMs, now, next.rules.skating);

    // Reached a cookie?
    if (moved.chasingCookieId !== undefined && arrived(moved)) {
      const id = moved.chasingCookieId;
      cookies = cookies.filter((c) => c.id !== id);
      return {
        ...say({ ...moved, activity: 'eating' as const, chasingCookieId: undefined }, 'Nam nam!', now),
        busyUntil: now + EAT_MS,
        restUntil: now + EAT_MS + 600,
      };
    }

    if (moved.restUntil > now || !arrived(moved) || moved.chasingCookieId !== undefined) return moved;

    // Idle and rested: choose what to do next.
    const roll = random();
    const others = next.actors.filter((o) => o.id !== moved.id && o.activity !== 'lucia');
    if (next.rules.snowballFights && roll < 0.22 && others.length && moved.kind === 'nisse' && !isOnIce(moved)) {
      const victim = others[Math.floor(random() * others.length)];
      const ball: Snowball = {
        id: nextId++,
        from: hand(moved, victim),
        to: { x: victim.x, y: victim.y - 6 },
        targetId: victim.id,
        throwerId: moved.id,
        thrownAt: now,
      };
      snowballs = [...snowballs, ball];
      moved = say(
        { ...moved, activity: 'throwing', facingLeft: victim.x < moved.x, busyUntil: now + THROW_MS },
        pick(THROW_LINES, random),
        now,
        random() < 0.5,
      );
      return { ...moved, restUntil: now + THROW_MS + 400 + random() * 1500 };
    }
    if (next.rules.skating && roll < 0.42) {
      return { ...moved, target: randomIcePoint(random), running: false, restUntil: 0 };
    }
    const running = moved.kind === 'reindeer' ? random() < 0.6 : random() < 0.25;
    return { ...moved, target: randomGroundPoint(random), running, restUntil: 0 };
  });

  return { ...next, actors: retargetOrphans(actors, cookies), cookies, snowballs, nextId };
}

function move(actor: Actor, elapsedMs: number, now: number, skating: boolean): Actor {
  if (actor.restUntil > now && actor.activity !== 'lucia') return settle(actor, now);
  if (arrived(actor)) {
    if (actor.activity === 'lucia') return actor;
    const settled = settle(actor, now);
    return actor.activity === 'walking' || actor.activity === 'running' || actor.activity === 'skating'
      ? { ...settled, restUntil: now + 800 + ((actor.id * 977) % 3000) }
      : settled;
  }
  if (['throwing', 'hit', 'eating', 'cheering'].includes(actor.activity) && actor.busyUntil > now) return actor;

  const onIce = skating && isOnIce(actor);
  const speed =
    actor.activity === 'lucia'
      ? SPEED.lucia
      : actor.chasingCookieId !== undefined
        ? SPEED.chase
        : onIce
          ? SPEED.skate
          : actor.running
            ? SPEED.run
            : SPEED.walk;
  const dx = actor.target.x - actor.x;
  const dy = actor.target.y - actor.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.min(dist, (speed * elapsedMs) / 1000);
  const position = { x: actor.x + (dx / dist) * step, y: actor.y + (dy / dist) * step };

  return {
    ...actor,
    ...position,
    facingLeft: Math.abs(dx) > 0.2 ? dx < 0 : actor.facingLeft,
    activity:
      actor.activity === 'lucia'
        ? 'lucia'
        : skating && isOnIce(position)
          ? 'skating'
          : actor.running || actor.chasingCookieId !== undefined
            ? 'running'
            : 'walking',
  };
}

/** Standing still: back to idle (or keep gliding pose on ice). */
function settle(actor: Actor, now: number): Actor {
  if (actor.busyUntil > now) return actor;
  if (actor.activity === 'lucia') return actor;
  return actor.activity === 'idle' ? actor : { ...actor, activity: 'idle', running: false };
}

function expire(actor: Actor, now: number): Actor {
  let next = actor;
  if (next.speechUntil && next.speechUntil <= now) next = { ...next, speech: undefined, speechUntil: 0 };
  if (next.busyUntil && next.busyUntil <= now && ['throwing', 'hit', 'eating', 'cheering'].includes(next.activity)) {
    next = { ...next, activity: 'idle', busyUntil: 0 };
  }
  return next;
}

// ---------------------------------------------------------------------------
// Snowballs
// ---------------------------------------------------------------------------

export function snowballProgress(ball: Snowball, now: number): number {
  return Math.min(1, Math.max(0, (now - ball.thrownAt) / SNOWBALL_FLIGHT_MS));
}

/** Position along a little arc. */
export function snowballPosition(ball: Snowball, now: number): Point {
  const t = snowballProgress(ball, now);
  const lift = Math.sin(Math.PI * t) * 14;
  return { x: ball.from.x + (ball.to.x - ball.from.x) * t, y: ball.from.y + (ball.to.y - ball.from.y) * t - lift };
}

function landSnowballs(state: SceneState, now: number, random: Random): SceneState {
  const landed = state.snowballs.filter((b) => snowballProgress(b, now) >= 1);
  if (!landed.length) return state;

  let snowballs = state.snowballs.filter((b) => snowballProgress(b, now) < 1);
  let nextId = state.nextId;
  const actors = state.actors.map((actor) => {
    const hit = landed.find((b) => b.targetId === actor.id);
    if (!hit || actor.activity === 'lucia') return actor;
    const thrower = state.actors.find((a) => a.id === hit.throwerId);
    let next = say({ ...actor, activity: 'hit' as const, busyUntil: now + HIT_MS, target: { x: actor.x, y: actor.y } }, pick(HIT_LINES, random), now, true);
    // Revenge!
    if (thrower && actor.kind === 'nisse' && random() < RETALIATE_CHANCE) {
      snowballs = [
        ...snowballs,
        {
          id: nextId++,
          from: hand(actor, thrower),
          to: { x: thrower.x, y: thrower.y - 6 },
          targetId: thrower.id,
          throwerId: actor.id,
          thrownAt: now + HIT_MS * 0.6,
        },
      ];
      next = { ...next, facingLeft: thrower.x < actor.x };
    }
    return { ...next, restUntil: now + HIT_MS + 300 };
  });
  return { ...state, actors, snowballs, nextId };
}

/** Where the snowball leaves the hand – roughly shoulder height. */
function hand(thrower: Point, target: Point): Point {
  return { x: thrower.x + (target.x < thrower.x ? -2 : 2), y: thrower.y - 9 };
}

// ---------------------------------------------------------------------------
// Cookies & poking
// ---------------------------------------------------------------------------

export function dropCookie(state: SceneState, at: Point, now: number): SceneState {
  const cookie: Cookie = { id: state.nextId, ...clampToGround(at) };
  const hungry = state.actors.filter((a) => a.chasingCookieId === undefined && a.activity !== 'lucia');
  const nearest = [...hungry].sort((a, b) => dist(a, cookie) - dist(b, cookie))[0];
  const base = { ...state, now, nextId: state.nextId + 1, cookies: [...state.cookies, cookie] };
  if (!nearest) return base;

  return {
    ...base,
    actors: state.actors.map((a) =>
      a.id === nearest.id
        ? {
            ...say(a, a.kind === 'reindeer' ? 'Pepperkake?! 😍' : 'Pepperkake!', now),
            target: besideCookie(cookie, a),
            chasingCookieId: cookie.id,
            restUntil: 0,
            busyUntil: 0,
            running: true,
          }
        : a,
    ),
  };
}

export function poke(state: SceneState, actorId: number, now: number, random: Random): SceneState {
  return {
    ...state,
    now,
    actors: state.actors.map((a) => {
      if (a.id !== actorId) return a;
      const line = a.activity === 'lucia' ? pick(LUCIA_LINES, random) : pick(a.kind === 'reindeer' ? REINDEER_LINES : POKE_LINES, random);
      const poked = say(a, line, now);
      return a.activity === 'lucia'
        ? poked
        : { ...poked, activity: 'cheering', busyUntil: now + JUMP_MS, jumpingUntil: now + JUMP_MS, restUntil: now + 1500, target: { x: a.x, y: a.y } };
    }),
  };
}

export function isJumping(actor: Actor, now: number): boolean {
  return actor.jumpingUntil > now;
}

// ---------------------------------------------------------------------------
// Lucia procession
// ---------------------------------------------------------------------------

/** All nisser line up off-screen to the left and walk across the scene singing. */
export function startProcession(state: SceneState, now: number): SceneState {
  if (state.procession) return state;
  const members = state.actors.filter((a) => a.kind === 'nisse').map((a) => a.id);
  if (!members.length) return state;

  return {
    ...state,
    now,
    cookies: [],
    snowballs: [],
    procession: { startedAt: now, members },
    actors: state.actors.map((a) => {
      const index = members.indexOf(a.id);
      if (index < 0) return { ...a, target: { x: a.x, y: Math.max(a.y, LUCIA_LANE_Y + 10) }, restUntil: 0 };
      const start = { x: -6 - index * LUCIA_SPACING, y: LUCIA_LANE_Y };
      return {
        ...a,
        ...start,
        target: { x: 112 - index * LUCIA_SPACING, y: LUCIA_LANE_Y },
        activity: 'lucia' as const,
        facingLeft: false,
        chasingCookieId: undefined,
        busyUntil: 0,
        restUntil: 0,
        running: false,
        speech: index === 0 ? LUCIA_LINES[0] : undefined,
        speechUntil: index === 0 ? now + 6000 : 0,
      };
    }),
  };
}

function advanceProcession(state: SceneState, now: number): SceneState {
  const procession = state.procession;
  if (!procession) return state;
  const members = state.actors.filter((a) => procession.members.includes(a.id));
  const done = members.every((a) => arrived(a));
  if (!done) {
    // Lucia keeps singing.
    const singing = Math.floor((now - procession.startedAt) / 4500) % LUCIA_LINES.length;
    return {
      ...state,
      actors: state.actors.map((a) =>
        a.id === procession.members[0] && !a.speech ? { ...a, speech: LUCIA_LINES[singing], speechUntil: now + 3500 } : a,
      ),
    };
  }
  // Everyone walks back in from the right.
  return {
    ...state,
    procession: undefined,
    actors: state.actors.map((a) =>
      procession.members.includes(a.id)
        ? { ...a, activity: 'walking' as const, target: { x: 60 + (a.id % 5) * 7, y: 62 + (a.id % 4) * 7 }, restUntil: 0, speech: undefined }
        : a,
    ),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isOnIce(p: Point): boolean {
  const dx = (p.x - ICE.cx) / ICE.rx;
  const dy = (p.y - ICE.cy) / ICE.ry;
  return dx * dx + dy * dy < 0.8;
}

function say(actor: Actor, speech: string, now: number, onlyIfQuiet = false): Actor {
  if (onlyIfQuiet && actor.speech) return actor;
  return { ...actor, speech, speechUntil: now + SPEECH_MS };
}

function arrived(actor: Actor): boolean {
  return dist(actor, actor.target) < ARRIVAL_DISTANCE;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pick<T>(items: readonly T[], random: Random): T {
  return items[Math.floor(random() * items.length) % items.length];
}

function retargetOrphans(actors: Actor[], cookies: Cookie[]): Actor[] {
  return actors.map((a) =>
    a.chasingCookieId !== undefined && !cookies.some((c) => c.id === a.chasingCookieId)
      ? { ...a, chasingCookieId: undefined, target: { x: a.x, y: a.y } }
      : a,
  );
}

function besideCookie(cookie: Point, actor: Point): Point {
  const side = actor.x < cookie.x ? -1 : 1;
  return clampToGround({ x: cookie.x + side * 4, y: cookie.y + 1 });
}

function randomGroundPoint(random: Random): Point {
  for (let i = 0; i < 8; i++) {
    const p = {
      x: BOUNDS.minX + random() * (BOUNDS.maxX - BOUNDS.minX),
      y: BOUNDS.minY + random() * (BOUNDS.maxY - BOUNDS.minY),
    };
    if (!isOnIce(p)) return p;
  }
  return { x: 20, y: 75 };
}

function randomIcePoint(random: Random): Point {
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(random()) * 0.75;
  return { x: ICE.cx + Math.cos(angle) * radius * ICE.rx, y: ICE.cy + Math.sin(angle) * radius * ICE.ry };
}

function clampToGround(p: Point): Point {
  return {
    x: Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, p.x)),
    y: Math.min(BOUNDS.maxY, Math.max(BOUNDS.minY, p.y)),
  };
}

// ---------------------------------------------------------------------------
// Directed actions (used by clicks and the demo panel)
// ---------------------------------------------------------------------------

export function throwSnowball(state: SceneState, throwerId: number, targetId: number, now: number, delayMs = 0): SceneState {
  const thrower = state.actors.find((a) => a.id === throwerId);
  const target = state.actors.find((a) => a.id === targetId);
  if (!thrower || !target || thrower.id === target.id || thrower.activity === 'lucia') return state;
  const ball: Snowball = {
    id: state.nextId,
    from: hand(thrower, target),
    to: { x: target.x, y: target.y - 6 },
    targetId,
    throwerId,
    thrownAt: now + delayMs,
  };
  return {
    ...state,
    now,
    nextId: state.nextId + 1,
    snowballs: [...state.snowballs, ball],
    actors: state.actors.map((a) =>
      a.id === throwerId
        ? {
            ...say(a, 'Snøballkrig! ❄️', now),
            activity: 'throwing' as const,
            facingLeft: target.x < a.x,
            busyUntil: now + delayMs + THROW_MS,
            restUntil: now + delayMs + THROW_MS + 800,
            target: { x: a.x, y: a.y },
            chasingCookieId: undefined,
          }
        : a,
    ),
  };
}

/** Every nisse throws a snowball at someone else, slightly staggered. */
export function snowballFight(state: SceneState, now: number, random: Random): SceneState {
  if (state.procession) return state;
  state = { ...state, rules: { ...state.rules, snowballFights: true } };
  const throwers = state.actors.filter((a) => a.kind === 'nisse');
  return throwers.reduce((s, thrower, index) => {
    const others = s.actors.filter((a) => a.id !== thrower.id);
    const target = others[Math.floor(random() * others.length) % others.length];
    return target ? throwSnowball(s, thrower.id, target.id, now, index * 250) : s;
  }, state);
}

/** Send everyone out on the ice. */
export function skateParty(state: SceneState, now: number, random: Random): SceneState {
  if (state.procession) return state;
  return {
    ...state,
    now,
    rules: { ...state.rules, skating: true },
    actors: state.actors.map((a) => ({ ...a, target: randomIcePoint(random), restUntil: 0, busyUntil: 0, chasingCookieId: undefined })),
  };
}

export function pokeEveryone(state: SceneState, now: number, random: Random): SceneState {
  return state.actors.reduce((s, a) => poke(s, a.id, now, random), state);
}

/** The player throws a snowball from the bottom of the scene. Hits whoever is close to where it lands. */
export const PLAYER = -1;
const HIT_RADIUS = 7;

export function throwPlayerSnowball(state: SceneState, at: Point, now: number): SceneState {
  const to = clampToScene(at);
  const victim = [...state.actors]
    .filter((a) => a.activity !== 'lucia')
    .map((a) => ({ a, d: dist({ x: a.x, y: a.y - 6 }, to) }))
    .filter(({ d }) => d < HIT_RADIUS)
    .sort((x, y) => x.d - y.d)[0]?.a;
  const ball: Snowball = {
    id: state.nextId,
    from: { x: 50, y: 104 },
    to: victim ? { x: victim.x, y: victim.y - 6 } : to,
    targetId: victim ? victim.id : PLAYER,
    throwerId: PLAYER,
    thrownAt: now,
  };
  return { ...state, now, nextId: state.nextId + 1, snowballs: [...state.snowballs, ball] };
}

function clampToScene(p: Point): Point {
  return { x: Math.min(98, Math.max(2, p.x)), y: Math.min(96, Math.max(30, p.y)) };
}
