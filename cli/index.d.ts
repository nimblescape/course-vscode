// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The types of the library of @nimblescape/course. They repeat the types of src/course/types.ts. Each path is relative
// to the folder of the course, with "/" between its names, and each line is the number of a line of its file, from 1.
// The specification of the files: https://github.com/nimblescape/course-vscode/blob/main/docs/format.md

/** readCourse reads a course: the folder of a course, or a folder or file inside it. */
export declare function readCourse(folder: string): Course;

/** readAssignment reads the assignment of a folder, or of its README; undefined when it is no assignment of a course. */
export declare function readAssignment(folder: string): Assignment | undefined;

/** readFeedback reads a feedback file in the language of its course; undefined when the file does not exist. */
export declare function readFeedback(file: string): Feedback | undefined;

/** checkCourse returns each place where a file of a course differs from its form, as `cs check` reports it. */
export declare function checkCourse(folder: string): Problem[];

/**
 * topicText returns the rules of a topic as Markdown, as `cs instructions <topic>` prints them, or undefined. With a
 * folder, the text ends with the own rules of the course of the folder, from its .course/instructions/.
 */
export declare function topicText(
  topic: 'course' | 'chapter' | 'assignment' | 'objectives' | 'feedback' | 'tutorial' | 'walkthrough' | 'plan' | 'cheat-sheet' | 'overview' | string,
  folder?: string,
): string | undefined;

export interface Course {
  name: string;
  language: string;
  readme: string | undefined;
  chapters: Chapter[];
  assignments: Assignment[];
}

export interface Chapter {
  number: string;
  title: string;
  file: string;
  objectives: Objective[];
  tutorials: Link[];
  assignments: Link[];
}

export interface Objective {
  number: string;
  text: string;
  description: string;
  /** level is 1 to 6 for K1 to K6, or undefined. */
  level: number | undefined;
  levelText: string;
  line: number;
}

export interface Link {
  text: string;
  file: string;
  line: number;
}

export interface Assignment {
  number: string;
  folder: string;
  file: string;
  title: string;
  scenario: string;
  due: string | undefined;
  chapter: string | undefined;
  objectives: AssignmentObjective[];
  requirements: Requirement[];
  rules: Rule[];
  criteria: Criterion[];
  exampleRun: string | undefined;
  /** workspace are the files of workspace/, relative to the folder of the assignment. */
  workspace: string[];
  feedback: Feedback | undefined;
}

export interface AssignmentObjective {
  number: string;
  level: number | undefined;
  levelText: string;
  text: string;
  line: number;
}

export interface Requirement {
  /** id is R1 to Rn. */
  id: string;
  group: string;
  text: string;
  objectives: string[];
  line: number;
}

export interface Rule {
  text: string;
  objectives: string[];
  line: number;
}

export interface Criterion {
  /** id is C1 to Cm. */
  id: string;
  name: string;
  text: string;
  line: number;
}

export type Status = 'met' | 'partly' | 'missing';

export interface Feedback {
  file: string;
  entries: FeedbackEntry[];
}

export interface FeedbackEntry {
  time: string;
  commit: string | undefined;
  update: boolean;
  changes: string | undefined;
  requirements: { id: string; status: Status; text: string; comment: string }[];
  criteria: { id: string; name: string; comment: string }[];
  run: string | undefined;
  commits: number | undefined;
  score: number | undefined;
  capped: boolean;
  line: number;
}

export interface Problem {
  file: string;
  line: number;
  code: string;
  message: string;
}
