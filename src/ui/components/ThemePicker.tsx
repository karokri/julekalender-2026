import { useState } from 'react';
import { applyTheme, currentTheme, THEMES } from '../theme';

/** Lets everyone choose their own background – remembered on this device. */
export function ThemePicker() {
  const [theme, setTheme] = useState(currentTheme);

  return (
    <div className="theme-picker" role="group" aria-label="Bakgrunn">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`theme-picker__option ${theme === t.id ? 'is-active' : ''}`}
          aria-pressed={theme === t.id}
          title={t.label}
          onClick={() => {
            applyTheme(t.id, true);
            setTheme(t.id);
          }}
        >
          <span aria-hidden="true">{t.label.split(' ')[0]}</span>
          <span className="visually-hidden">{t.label.split(' ').slice(1).join(' ')}</span>
        </button>
      ))}
    </div>
  );
}
