// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The tests in a real VS Code (npm run test:vscode): @vscode/test-cli downloads VS Code to .vscode-test/, starts it
// with the extension of the development build in dist/, and runs the bundled tests of out/test/vscode/
// (scripts/build-vscode-tests.mjs) with mocha in its extension host. The workspace is a copy of the test course
// test/fixtures/course-de in a temporary folder, so that the tests may change its files. VSCODE_TEST_VERSION selects the
// VS Code version: "stable" (the default), "insiders" or a version such as 1.125.0. On Linux without a display, run it
// under xvfb-run.
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { defineConfig } from '@vscode/test-cli';

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'course-vscode-test-'));
fs.cpSync('test/fixtures/course-de', workspace, { recursive: true });

export default defineConfig([
  {
    label: 'vscode',
    files: 'out/test/vscode/*.test.js',
    version: process.env.VSCODE_TEST_VERSION || 'stable',
    workspaceFolder: workspace,
    launchArgs: ['--disable-extensions', '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes'],
    mocha: {
      ui: 'bdd',
      // The first start of VS Code can be slow on CI runners.
      timeout: 60_000,
    },
  },
]);
