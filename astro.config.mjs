// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Redesign 2027 (acuan visual: bambuindah.com, palet & font: Deck Arah Kampanye KSA Nov 2026).
// CSS di-inline supaya tidak ada request render-blocking; tanpa JS di sisi klien.
export default defineConfig({
  site: 'https://kampungsumberalam.com',
  build: { inlineStylesheets: 'always', format: 'directory' },
  compressHTML: true,
  integrations: [sitemap()],
});
