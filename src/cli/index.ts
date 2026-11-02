// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The library of the npm package @nimblescape/course
 * ([R-COURSE-009](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-009),
 * [R-COURSE-010](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-010)): the reader of a
 * course for programs, for example the adapter of the reflection tool, the checks of its files, and the rules of the
 * topics for AI agents. Loading it runs nothing. Its types are in cli/index.d.ts, which names no type of other packages,
 * because the package has no dependencies.
 */

import * as path from 'node:path';
import { findCourseFolder, loadCourse } from '../course/course';
import type { Problem } from '../course/types';

export { readAssignment, readCourse, readFeedback } from '../course/course';
export { topicText } from '../course/instructions';

/**
 * checkCourse returns each place where a file of a course differs from its form, as `course check` reports it.
 * @param folder - The folder of the course, or a folder or file inside it.
 */
export const checkCourse = (folder: string): Problem[] => loadCourse(findCourseFolder(path.resolve(folder))).problems;
