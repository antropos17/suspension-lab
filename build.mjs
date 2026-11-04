import { build } from 'esbuild';
await build({ entryPoints: ['src/game.js','src/physics-worker.js'], bundle: true, outdir: 'dist', format: 'iife', target: 'es2020', minify: true, legalComments: 'eof' });
console.log('Built game and physics worker');
