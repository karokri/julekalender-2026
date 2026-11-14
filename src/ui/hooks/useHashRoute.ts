import { useEffect, useState } from 'react';

export type Route = 'calendar' | 'scoreboard' | 'admin';

const ROUTES: Record<string, Route> = {
  '': 'calendar',
  '#kalender': 'calendar',
  '#poeng': 'scoreboard',
  '#admin': 'admin',
  // Old style, still understood.
  '#/': 'calendar',
  '#/poeng': 'scoreboard',
  '#/admin': 'admin',
};

/** Plain #name hashes, so links also work when the page is embedded. */
export const ROUTE_HASH: Record<Route, string> = {
  calendar: '#kalender',
  scoreboard: '#poeng',
  admin: '#admin',
};

/** Hash-based routing works on GitHub Pages without server rewrites. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

function parse(hash: string): Route {
  return ROUTES[hash] ?? 'calendar';
}
