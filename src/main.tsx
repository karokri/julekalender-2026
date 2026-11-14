import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { config } from './app/config';
import { Root } from './ui/Root';
import { applyTheme, initialTheme } from './ui/theme';
import './ui/styles/global.css';

applyTheme(initialTheme(config.theme));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
