// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * Paths inside a course: relative to the folder of the course, with `/` between their names on every platform, and
 * the patterns of the settings of a course. The module uses no API of VS Code.
 */

import * as path from 'node:path';

/**
 * resolveLink returns the file that a link of a file names, relative to the folder of the course, without its anchor;
 * undefined for a link to a web address, a link to an anchor of the same file, or a link out of the folder of the course.
 * @param file - The file of the link, relative to the folder of the course.
 * @param target - The target of the link.
 */
export function resolveLink(file: string, target: string): string | undefined {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#') || target.startsWith('/')) {
    return undefined;
  }
  let name = target.replace(/[#?].*$/, '');
  try {
    name = decodeURIComponent(name);
  } catch {
    // A target with a lone % stays as it is.
  }
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), name));
  return resolved.startsWith('../') || resolved === '..' ? undefined : resolved.replace(/\/$/, '');
}

/**
 * patternRegExp returns the regular expression of a pattern: `*` stands for any part of one name, `?` for one
 * character of a name, and `**` for any number of folders.
 * @param pattern - The pattern, relative to the folder of the course.
 */
export function patternRegExp(pattern: string): RegExp {
  const parts = pattern.replace(/^\.\//, '').split('/');
  const source = parts
    .map((part, index) => {
      if (part === '**') {
        return index === parts.length - 1 ? '.*' : '(?:[^/]+/)*';
      }
      const text = part.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
      return index === parts.length - 1 ? text : `${text}/`;
    })
    .join('');
  return new RegExp(`^${source}$`);
}

/**
 * matches tells whether a file matches one of the patterns.
 * @param file - The file, relative to the folder of the course.
 * @param patterns - The patterns.
 */
export const matches = (file: string, patterns: readonly string[]): boolean => patterns.some((pattern) => patternRegExp(pattern).test(file));

/**
 * compareNumbers compares two numbers of chapters, objectives or assignments part by part, for example `08.10` after
 * `08.9`. A text without a number comes last.
 * @param a - The first number.
 * @param b - The second number.
 */
export function compareNumbers(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let index = 0; index < Math.max(partsA.length, partsB.length); index++) {
    const x = partsA[index] ?? -1;
    const y = partsB[index] ?? -1;
    if (Number.isNaN(x) || Number.isNaN(y)) {
      return Number.isNaN(x) ? (Number.isNaN(y) ? a.localeCompare(b) : 1) : -1;
    }
    if (x !== y) {
      return x - y;
    }
  }
  return 0;
}
