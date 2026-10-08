import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (!env.VITE_STORAGE_PREFIX || !env.VITE_APP_NAME) throw new Error(`Manca VITE_STORAGE_PREFIX o VITE_APP_NAME per la modalità "${mode}"`);
  return {
    // percorsi relativi: la stessa build funziona sia in /Blobbino/ sia in /Blobbino-react/
    base: './',
    plugins: [react(), pwa(env)],
  };
});

/* manifest e service worker: li scrive la build, con il nome dell'app e l'elenco dei file da tenere offline */
function pwa(env){
  let outDir;
  return {
    name: 'blobbino-pwa',
    apply: 'build',
    configResolved(config){ outDir = resolve(config.root, config.build.outDir); },
    closeBundle(){
      const manifest = JSON.parse(readFileSync('pwa/manifest.webmanifest', 'utf8'));
      manifest.name = manifest.short_name = env.VITE_APP_NAME;
      writeFileSync(resolve(outDir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');

      // la versione cambia solo se cambia qualche file: niente più VERSION da aggiornare a mano
      const files = readdirSync(outDir, {recursive: true, withFileTypes: true})
        .filter(d => d.isFile())
        .map(d => resolve(d.parentPath, d.name).slice(outDir.length + 1).replaceAll('\\', '/'))
        .filter(f => f !== 'sw.js')
        .sort();
      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(readFileSync(resolve(outDir, f)));
      const prefix = `${env.VITE_STORAGE_PREFIX}-v`;
      const sw = readFileSync('pwa/sw.js', 'utf8')
        .replace(`'__CACHE_PREFIX__'`, JSON.stringify(prefix))
        .replace(`'__VERSION__'`, JSON.stringify(prefix + hash.digest('hex').slice(0, 10)))
        .replace('__SHELL__', JSON.stringify(['./', ...files.map(f => './' + f)]));
      writeFileSync(resolve(outDir, 'sw.js'), sw);
    },
  };
}
