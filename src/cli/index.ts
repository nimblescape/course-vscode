// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The library of the npm package @nimblescape/course
 * ([R-COURSE-009](../../docs/requirements.md#r-course-009),
 * [R-COURSE-010](../../docs/requirements.md#r-course-010)): the reader of a
 * course for programs, for example the adapter of the reflection tool, the checks of its files, and the rules of the
 * topics for AI agents. Loading it runs nothing. Its types are in cli/index.d.ts, which names no type of other packages,
 * because the package has no dependencies.
 */

import * as path from 'node:path';
import { findCourseFolder, loadCourse } from '../course/course';
import { readCourseRules, topicText as textOfTopic } from '../course/instructions';
import type { Problem } from '../course/types';

export { readAssignment, readCourse, readFeedback } from '../course/course';

/**
 * topicText returns the rules of a topic as Markdown, as `cs instructions <topic>` prints them, or undefined for a topic
 * that neither the format nor the course knows. With a folder, the text ends with the own rules of the course of the
 * folder, from its .course/instructions/.
 * @param topic - The name of the topic.
 * @param folder - The folder of a course, or a folder or file inside it.
 */
export const topicText = (topic: string, folder?: string): string | undefined =>
  textOfTopic(topic, folder === undefined ? new Map() : readCourseRules(findCourseFolder(path.resolve(folder))));

/**
 * checkCourse returns each place where a file of a course differs from its form, as `cs check` reports it.
 * @param folder - The folder of the course, or a folder or file inside it.
 */
export const checkCourse = (folder: string): Problem[] => loadCourse(findCourseFolder(path.resolve(folder))).problems;
