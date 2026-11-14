export const THEMES = [
  { id: 'granskog', label: '🌲 Granskog' },
  { id: 'laaverod', label: '🏠 Låverød' },
  { id: 'nordlys', label: '🌌 Nordlys' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

const KEY = 'jul.theme';

export function isTheme(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

/** The background this person picked (remembered on the device), or the configured default. */
export function initialTheme(configured: string | undefined): ThemeId {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (isTheme(saved)) return saved;
  } catch {
    /* ignore */
  }
  return isTheme(configured) ? configured : 'granskog';
}

export function currentTheme(): ThemeId {
  const theme = document.documentElement.dataset.theme;
  return isTheme(theme) ? theme : 'granskog';
}

export function applyTheme(theme: ThemeId, remember = false): void {
  document.documentElement.dataset.theme = theme;
  if (!remember) return;
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
}
