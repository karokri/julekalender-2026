/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Demo mode (`npm run demo` / `npm run build:demo`): doors.json and the dingbat images are
 * inlined, so the whole demo works as one self-contained HTML file.
 */
function demoDoors(isDemo: boolean): Plugin {
  const id = 'virtual:demo-doors';
  return {
    name: 'demo-doors',
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    load(resolved) {
      if (resolved !== `\0${id}`) return undefined;
      // Outside the demo build the module is empty, so no demo content ships to production.
      if (!isDemo) return 'export default null;';
      const file = JSON.parse(readFileSync('public/doors.json', 'utf8'));
      for (const door of file.doors) {
        if (door.image) {
          const svg = readFileSync(`public/${door.image}`);
          door.image = `data:image/svg+xml;base64,${svg.toString('base64')}`;
        }
      }
      return `export default ${JSON.stringify(file)};`;
    },
  };
}

// Relative base so the build works under https://<org>.github.io/<repo>/ without configuration.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), demoDoors(mode === 'demo'), ...(mode === 'demo' ? [viteSingleFile()] : [])],
  build: mode === 'demo' ? { outDir: 'dist-demo' } : undefined,
  test: {
    environment: 'jsdom',
  },
}));
