// build.js
import { build } from 'esbuild';
import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';

// Buscar todos los JS en src/
const files = glob.sync('src/**/*.js');

async function runBuild() {
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

  // Copiar public/ completo a dist/
  await fs.copy('public', 'dist', { overwrite: true });
  console.log('📁 Copied /public to /dist');
}

runBuild().catch((err) => {
  console.error('❌ Build failed:', err);
});
