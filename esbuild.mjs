// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// Bundle the extension into dist/extension.js, the command cs into cli/dist/cs.js, and the library of the
// course module into cli/dist/index.js, the files of the npm package @nimblescape/course of cli/, for Node.js 22 or
// later (engines of cli/package.json). The bundles hold markdown-it and yaml, so the npm package has no dependencies,
// and the text of docs/format.md, the source of `cs instructions`. npm puts the license of the folder of a package
// into the package, so the build copies LICENSE and THIRD-PARTY-NOTICES.md into cli/. The package of the extension
// holds no file of cli/. VS Code provides the module `vscode` at run time, so the bundle leaves it out. The bundles are
// readable JavaScript: not minified, so that they keep the names of the source and anyone can read the code of the
// packages and compare it with the source. Only a development build writes a source map; a production build
// (--production, which vscode:prepublish passes) has none.

import * as fs from 'fs';
import * as path from 'path';
import * as esbuild from 'esbuild';

// An import with the suffix ?raw is the text of its file, as in vitest: the instructions print docs/format.md.
const raw = {
  name: 'raw',
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, (args) => ({ path: path.resolve(args.resolveDir, args.path.replace(/\?raw$/, '')), namespace: 'raw' }));
    build.onLoad({ filter: /.*/, namespace: 'raw' }, (args) => ({ contents: fs.readFileSync(args.path, 'utf8'), loader: 'text' }));
  },
};

const production = process.argv.includes('--production');
const bundles = [
  { entryPoints: ['src/extension.ts'], outfile: 'dist/extension.js', target: 'node24' },
  { entryPoints: ['src/cli/main.ts'], outfile: 'cli/dist/cs.js', target: 'node22', banner: { js: '#!/usr/bin/env node' } },
  { entryPoints: ['src/cli/index.ts'], outfile: 'cli/dist/index.js', target: 'node22' },
];

fs.mkdirSync('cli/dist', { recursive: true });
fs.copyFileSync('LICENSE', 'cli/LICENSE');
fs.copyFileSync('THIRD-PARTY-NOTICES.md', 'cli/THIRD-PARTY-NOTICES.md');

for (const bundle of bundles) {
  // A production build writes no source map: remove the map of an earlier development build, so that no map that does
  // not match the bundle of the production build stays in dist/.
  if (production) {
    fs.rmSync(`${bundle.outfile}.map`, { force: true });
  }
  await esbuild.build({
    ...bundle,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['vscode'],
    sourcemap: !production,
    minify: false,
    plugins: [raw],
    logLevel: 'info',
  });
}
