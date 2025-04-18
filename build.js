import fs from 'fs-extra';

// Borrar y crear dist desde cero
await fs.emptyDir('dist');

// Copiar todo el contenido de src/ a dist/
await fs.copy('src', 'dist');
console.log('✅ Copiado src/ a dist/');

// Copiar todo el contenido de public/ a dist/
await fs.copy('public', 'dist');
console.log('✅ Copiado public/ a dist/');
