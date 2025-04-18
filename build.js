// build.js (versión CommonJS)
const esbuild = require('esbuild');
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');

const files = glob.sync('src/**/*.js');

async function runBuild() {
  for (const file of files) {
    const filename = path.basename(file);
    await esbuild.build({
      entryPoints: [file],
      outfile: `dist/${filename}`,
      bundle: true,
      format: 'esm',
    });
    console.log(`✅ Bundled: ${file}`);
  }

  await fs.copy('public', 'dist', { overwrite: true });
  console.log('📁 Copied /public to /dist');
}

runBuild().catch((err) => {
  console.error('❌ Build failed:', err);
});
