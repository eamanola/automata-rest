const esbuild = require('esbuild');

esbuild.build({
  bundle: true,
  entryPoints: ['src/index.js'],
  // minify: true,
  outfile: 'dist/index.bundle.js',
  packages: 'external',
  platform: 'node',
});
