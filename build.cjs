// build.js — versión válida como ES Module
import { build } from 'esbuild';
import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';

// glob.sync no necesita __dirname porque usamos rutas relativas
const files = glob.sync('src/*.js');

for (const file of files) {
  const filename = path.basename(file);
  await build({
    entryPoints: [file],
    outfile: `dist/${filename}`,
    bundle: true,
    format: 'esm',
  });
  console.log(`✅ Bundled: ${file}`);
}

// Copiar todo lo que hay en public/
await fs.copy('public', 'dist', { overwrite: true });
console.log('📁 Copied /public to /dist');
