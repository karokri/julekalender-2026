import { describe, expect, it } from 'vitest';
import {
  createScene,
  dropCookie,
  isOnIce,
  poke,
  skateParty,
  snowballFight,
  snowballPosition,
  startProcession,
  tick,
  type SceneState,
} from './sceneModel';

const half = () => 0.5;
const cast = [
  { kind: 'nisse' as const, look: 0 },
  { kind: 'nisse' as const, look: 1 },
  { kind: 'reindeer' as const, look: 0 },
];

function run(scene: SceneState, from: number, ms: number, random: () => number = half): SceneState {
  let s = scene;
  for (let now = from; now < from + ms; now += 50) s = tick(s, 50, now, random);
  return s;
}

describe('nissetunet', () => {
  it('makes a poked nisse jump and talk', () => {
    const scene = poke(createScene(cast, half, 0), 0, 1000, half);
    expect(scene.actors[0]).toMatchObject({ activity: 'cheering', jumpingUntil: 1700 });
    expect(scene.actors[0].speech).toBeTruthy();
  });

  it('sends the nearest one to eat a dropped cookie', () => {
    let scene = dropCookie(createScene(cast, half, 0), { x: 20, y: 70 }, 0);
    expect(scene.actors.filter((a) => a.chasingCookieId !== undefined)).toHaveLength(1);
    scene = run(scene, 0, 20_000);
    expect(scene.cookies).toEqual([]);
  });

  it('throws snowballs that hit someone', () => {
    // A low roll means «throw a snowball» when an actor is rested.
    let calls = 0;
    const lowRolls = () => (calls++ % 3 === 0 ? 0.05 : 0.5);
    let scene = createScene(cast, half, 0);
    let sawSnowball = false;
    let sawHit = false;
    for (let now = 0; now < 15_000; now += 50) {
      scene = tick(scene, 50, now, lowRolls);
      sawSnowball ||= scene.snowballs.length > 0;
      sawHit ||= scene.actors.some((a) => a.activity === 'hit');
    }
    expect(sawSnowball).toBe(true);
    expect(sawHit).toBe(true);
  });

  it('flies snowballs in an arc', () => {
    const ball = { id: 1, from: { x: 10, y: 60 }, to: { x: 30, y: 60 }, targetId: 1, throwerId: 0, thrownAt: 0 };
    const mid = snowballPosition(ball, 375);
    expect(mid.x).toBeCloseTo(20);
    expect(mid.y).toBeLessThan(60);
  });

  it('runs a Lucia procession across the scene with all nisser, then ends it', () => {
    let scene = startProcession(createScene(cast, half, 0), 0);
    expect(scene.procession?.members).toEqual([0, 1]);
    expect(scene.actors.filter((a) => a.activity === 'lucia')).toHaveLength(2);
    expect(scene.actors[0].speech).toContain('Lucia');

    scene = run(scene, 0, 60_000);
    expect(scene.procession).toBeUndefined();
    expect(scene.actors.some((a) => a.activity === 'lucia')).toBe(false);
  });

  it('knows where the ice is', () => {
    expect(isOnIce({ x: 62, y: 80 })).toBe(true);
    expect(isOnIce({ x: 10, y: 70 })).toBe(false);
  });
});

describe('directed actions', () => {
  it('starts a snowball fight where every nisse throws', () => {
    const scene = snowballFight(createScene(cast, half, 0), 0, half);
    expect(scene.snowballs).toHaveLength(2);
    expect(scene.actors.filter((a) => a.activity === 'throwing')).toHaveLength(2);
  });

  it('sends everyone skating', () => {
    let scene = skateParty(createScene(cast, half, 0), 0, half);
    expect(scene.actors.every((a) => isOnIce(a.target))).toBe(true);
    scene = run(scene, 0, 400);
    expect(scene.actors.some((a) => a.activity === 'skating' || a.activity === 'running' || a.activity === 'walking')).toBe(true);
  });
});
