// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * Files in the memory, for the tests: a course from a map of its paths to their texts, without the disk. The module
 * uses no API of VS Code.
 */

import * as path from 'node:path';
import type { Files } from './course';

/**
 * memoryFiles returns the files of a map of absolute paths with `/` to their texts.
 * @param texts - The texts by their paths.
 */
export function memoryFiles(texts: Readonly<Record<string, string>>): Files & { texts: Record<string, string> } {
  const all: Record<string, string> = { ...texts };
  const normal = (file: string): string => path.resolve(file).split(path.sep).join('/');
  return {
    texts: all,
    read: (file) => all[normal(file)],
    list: (folder) => {
      const prefix = `${normal(folder).replace(/\/$/, '')}/`;
      const entries = new Map<string, boolean>();
      for (const file of Object.keys(all)) {
        if (file.startsWith(prefix)) {
          const [name, ...rest] = file.slice(prefix.length).split('/');
          entries.set(name, rest.length > 0 || entries.get(name) === true);
        }
      }
      return [...entries].map(([name, folderEntry]) => ({ name, folder: folderEntry }));
    },
  };
}
