// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The comments of the format of the README files of a course
 * ([R-COURSE-004](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-004),
 * [R-COURSE-005](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-005)): `course format` and
 * the command "Add Format Comments" of the course extension write the comment into each README of a course that has
 * none or has one of an older version. A course changes to its forms with this change, together with the removal of its
 * copies of the forms. The feedback files get their comment from the feedback program. The module uses no API of
 * VS Code.
 */

import * as path from 'node:path';
import { newerFormat, withComment } from './comment';
import { type Files, loadCourse, nodeFiles } from './course';
import { splitLines } from './markdown';

/** Change is the new text of a file of a course. */
export interface Change {
  /** file is the file, relative to the folder of the course. */
  file: string;
  /** text is the new text of the file. */
  text: string;
}

/**
 * commentChanges returns the new texts of the README files of a course whose comment of the format is missing or of an
 * older version. A file whose comment names a higher major version stays as it is.
 * @param folder - The folder of the course, an absolute path.
 * @param files - The files.
 */
export function commentChanges(folder: string, files: Files = nodeFiles): Change[] {
  const changes: Change[] = [];
  for (const each of loadCourse(folder, files).files) {
    if (each.kind === 'feedback') {
      continue;
    }
    const text = files.read(path.join(folder, each.file));
    if (text === undefined) {
      continue;
    }
    const lines = splitLines(text);
    if (newerFormat(lines)) {
      continue;
    }
    const changed = withComment(lines, each.kind);
    if (changed) {
      changes.push({ file: each.file, text: changed.join(text.includes('\r\n') ? '\r\n' : '\n') });
    }
  }
  return changes;
}
