// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The items of the view "Course"
 * ([R-COURSE-012](../../docs/requirements.md#r-course-012)): the structure of a
 * course, its chapters with their learning objectives and assignments, and each assignment with its learning
 * objectives, requirements, criteria and feedback, each item with the file and the line that it opens. The module uses
 * no API of VS Code, so that the tests run it without VS Code.
 */

import * as path from 'node:path';
import type { Loaded } from '../course/course';
import type { Assignment, Chapter } from '../course/types';

/** CourseOfView is a course of the view: its folder and what the reader read. */
export interface CourseOfView {
  /** folder is the folder of the course, an absolute path. */
  folder: string;
  loaded: Loaded;
}

/** Node is an item of the view. */
export interface Node {
  label: string;
  description?: string;
  tooltip?: string;
  /** file is the file that the item opens, an absolute path, with its line from 1. */
  file?: string;
  line?: number;
  icon?: string;
  contextValue?: string;
  /** feedback is the feedback file of an assignment, an absolute path. */
  feedback?: string;
  children?: () => Node[];
}

/**
 * chapterObjectiveNodes returns the items of the learning objectives of a chapter.
 * @param folder - The folder of the course.
 * @param chapter - The chapter.
 */
function chapterObjectiveNodes(folder: string, chapter: Chapter): Node[] {
  return chapter.objectives.map((objective) => ({
    label: objective.number,
    description: `${objective.levelText} · ${objective.text}`,
    tooltip: `${objective.number} (${objective.levelText}): ${objective.text}\n\n${objective.description}`,
    file: path.join(folder, chapter.file),
    line: objective.line,
    icon: 'target',
  }));
}

/**
 * assignmentNode returns the item of an assignment.
 * @param folder - The folder of the course.
 * @param assignment - The assignment.
 */
export function assignmentNode(folder: string, assignment: Assignment): Node {
  const readme = path.join(folder, assignment.file);
  const last = assignment.feedback?.entries.at(-1);
  return {
    label: `${assignment.number} – ${assignment.title}`,
    description: last?.score !== undefined ? `${last.score} %` : undefined,
    tooltip: assignment.scenario,
    file: readme,
    line: 1,
    icon: 'tasklist',
    contextValue: assignment.feedback ? 'assignmentWithFeedback' : 'assignment',
    feedback: assignment.feedback ? path.join(folder, assignment.feedback.file) : undefined,
    children: () => [
      {
        label: 'Learning objectives',
        icon: 'target',
        children: () =>
          assignment.objectives.map((objective) => ({
            label: objective.number,
            description: `${objective.levelText} · ${objective.text}`,
            file: readme,
            line: objective.line,
            icon: 'target',
          })),
      },
      {
        label: 'Requirements',
        icon: 'checklist',
        children: () =>
          assignment.requirements.map((requirement) => ({
            label: requirement.id,
            description: `${requirement.group ? `${requirement.group} · ` : ''}${requirement.text.split('\n')[0]}`,
            tooltip: `${requirement.text}${requirement.objectives.length > 0 ? `\n\nObjectives: ${requirement.objectives.join(', ')}` : ''}`,
            file: readme,
            line: requirement.line,
            icon: 'pass',
          })),
      },
      {
        label: 'Criteria',
        icon: 'law',
        children: () =>
          assignment.criteria.map((criterion) => ({
            label: criterion.id,
            description: criterion.name,
            tooltip: criterion.text,
            file: readme,
            line: criterion.line,
            icon: 'law',
          })),
      },
      ...(assignment.feedback
        ? [
            {
              label: 'Feedback',
              description: last?.score !== undefined ? `${last.score} %${last.time ? ` · ${last.time}` : ''}` : last?.time,
              file: path.join(folder, assignment.feedback.file),
              line: last?.line ?? 1,
              icon: 'feedback',
            },
          ]
        : []),
    ],
  };
}

/**
 * courseNodes returns the items of a course: its chapters, each with its learning objectives and its assignments, and
 * the assignments without a chapter.
 * @param course - The course.
 */
export function courseNodes(course: CourseOfView): Node[] {
  const { folder } = course;
  const { chapters, assignments } = course.loaded.course;
  const nodes: Node[] = chapters.map((chapter) => ({
    label: `${chapter.number} – ${chapter.title}`,
    file: path.join(folder, chapter.file),
    line: 1,
    icon: 'book',
    children: () => [
      { label: 'Learning objectives', icon: 'target', children: () => chapterObjectiveNodes(folder, chapter) },
      ...assignments.filter((assignment) => assignment.chapter === chapter.number).map((assignment) => assignmentNode(folder, assignment)),
    ],
  }));
  const without = assignments.filter((assignment) => !chapters.some((chapter) => chapter.number === assignment.chapter));
  if (without.length > 0) {
    nodes.push({ label: 'Assignments without a chapter', icon: 'tasklist', children: () => without.map((assignment) => assignmentNode(folder, assignment)) });
  }
  return nodes;
}
