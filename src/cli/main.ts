// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The start of the command cs in Node.js: it runs [cli.ts](cli.ts) with the arguments of the command line, the
 * files of the disk in UTF-8 and the standard streams, and ends with its exit code.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { nodeFiles } from '../course/course';
import { run } from './cli';

// A reader that stops early, for example `cs read | head`, closes the pipe: the command then ends without an error.
process.stdout.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EPIPE') {
    process.exit(process.exitCode ?? 0);
  }
  throw error;
});

process.exitCode = run(process.argv.slice(2), {
  files: nodeFiles,
  writeFile: (file, text) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text, 'utf8');
  },
  out: (line) => process.stdout.write(`${line}\n`),
  err: (line) => process.stderr.write(`${line}\n`),
  cwd: process.cwd(),
});
