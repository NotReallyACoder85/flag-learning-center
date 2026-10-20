import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const walk = (dir, base = dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });

// After the build, write sw.js that precaches every emitted file (so the app works offline).
function precacheServiceWorker() {
  let outDir;
  return {
    name: 'precache-service-worker',
    apply: 'build',
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); },
    closeBundle() {
      const files = walk(outDir).filter((f) => f !== 'sw.js' && !f.split('/').some((p) => p.startsWith('.')));
      const tpl = fs.readFileSync(path.resolve('src/pwa/sw.template.js'), 'utf8');
      // the cache name changes whenever any file, or the worker itself, changes
      const hash = crypto.createHash('sha1').update(tpl);
      files.forEach((f) => hash.update(f).update(fs.readFileSync(path.join(outDir, f))));
      fs.writeFileSync(
        path.join(outDir, 'sw.js'),
        tpl.replace('__VERSION__', hash.digest('hex').slice(0, 10)).replace('__FILES__', JSON.stringify(files))
      );
    },
  };
}

// GitHub Pages serves the site from /<repo-name>/
export default defineConfig({
  base: '/flag-learning-center/',
  build: { outDir: 'dist', sourcemap: false },
  plugins: [precacheServiceWorker()],
  test: { include: ['tests/**/*.test.js'] },
});
