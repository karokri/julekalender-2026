/** Tiny event bus so the demo panel can poke the calendar and the scene. */
export type SceneAction = 'lucia' | 'snowballs' | 'cookies' | 'skate' | 'tickle';

type DemoEvents = {
  'open-door': number;
  scene: SceneAction;
};

export const isDemo = import.meta.env.VITE_DEMO === 'true';

export function emitDemo<K extends keyof DemoEvents>(type: K, detail: DemoEvents[K]): void {
  window.dispatchEvent(new CustomEvent(`demo:${type}`, { detail }));
}

export function onDemo<K extends keyof DemoEvents>(type: K, handler: (detail: DemoEvents[K]) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<DemoEvents[K]>).detail);
  window.addEventListener(`demo:${type}`, listener);
  return () => window.removeEventListener(`demo:${type}`, listener);
}
