import { build } from 'esbuild';
await build({ entryPoints: ['src/game.js'], bundle: true, outfile: 'dist/game.js', format: 'iife', target: 'es2020', minify: true, legalComments: 'eof' });
console.log('Built dist/game.js');
