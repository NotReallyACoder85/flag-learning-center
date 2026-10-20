import { defineConfig } from 'vite';

// GitHub Pages serves the site from /<repo-name>/
export default defineConfig({
  base: '/flag-learning-center/',
  build: { outDir: 'dist', sourcemap: false },
  test: { include: ['tests/**/*.test.js'] },
});
