// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// ESLint for the sources: the recommended rules of ESLint and of typescript-eslint,
// for the TypeScript of the extension, the library and the command, and the build
// and release scripts. CI runs it with npm run lint.

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // The built files, the installed packages and the work of the students in the test course are no sources.
    ignores: ['dist/', 'out/', 'cli/dist/', 'cli/index.d.ts', 'node_modules/', '.vscode-test/', 'test/fixtures/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // A parameter or a variable with a leading underscore is unused on purpose, for example the arguments of a
      // callback of VS Code that the code does not need.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    files: ['**/*.mjs', '**/*.mts', 'src/**/*.ts', 'test/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
);
