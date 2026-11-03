// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The structured data of a course
 * ([R-COURSE-009](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-009),
 * [R-FEED-002](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-feed-002)): the JSON that the reader
 * gives, the same on every platform. Each path is relative to the folder of the course, with `/` between its
 * names, and each line is the number of a line of its file, from 1. cli/index.d.ts repeats these types for the users of
 * the npm package. The module uses no API of VS Code.
 */

/**
 * Kind is the kind of a file of a course, the word after the version in the comment of the format. Programs read the
 * README of the course, of the chapters and of the assignments and the feedback files; the other kinds are for people.
 */
export type Kind = 'course' | 'chapter' | 'assignment' | 'feedback' | 'tutorial' | 'walkthrough' | 'plan' | 'cheat-sheet' | 'overview';

/** kinds are the kinds of the files of a course, in the order of the documentation. */
export const kinds: readonly Kind[] = ['course', 'chapter', 'assignment', 'feedback', 'tutorial', 'walkthrough', 'plan', 'cheat-sheet', 'overview'];

/** Course is a course with its chapters and assignments. */
export interface Course {
  /** name is the name of the course, `course` of .course/course.yml, or the name of its folder. */
  name: string;
  /** language is the language of the course, for example `de`. */
  language: string;
  /** readme is the README of the course, or undefined when it has none. */
  readme: string | undefined;
  /** chapters are the chapters, in the order of their numbers. */
  chapters: Chapter[];
  /** assignments are the assignments, in the order of their numbers. */
  assignments: Assignment[];
}

/** Chapter is a chapter of a course, a learning step with its tutorials and learning objectives. */
export interface Chapter {
  /** number is the number of the chapter, for example `08`. */
  number: string;
  /** title is the name of the chapter, for example `Loops`. */
  title: string;
  /** file is the README of the chapter. */
  file: string;
  /** objectives are the learning objectives of the table of the chapter, in their order. */
  objectives: Objective[];
  /** tutorials are the links of the section of the tutorials. */
  tutorials: Link[];
  /** assignments are the links of the section of the related assignments. */
  assignments: Link[];
}

/** Objective is a learning objective of the table of a chapter. */
export interface Objective {
  /** number is the full number of the objective, for example `08.3`, its ID in the course. */
  number: string;
  /** text is the learning objective: what a student can do after the chapter. */
  text: string;
  /** description says how the objective shows in the work of the student. */
  description: string;
  /** level is the level of the revised taxonomy, 1 to 6, or undefined when the table gives none in the form `K<n>`. */
  level: number | undefined;
  /** levelText is the text of the level in the table, for example `K3 – Anwenden`. */
  levelText: string;
  /** line is the line of the objective in the README of the chapter. */
  line: number;
}

/** Link is a link of a list in a README. */
export interface Link {
  /** text is the text of the link. */
  text: string;
  /** file is the file that the link names, relative to the folder of the course, without an anchor. */
  file: string;
  /** line is the line of the link. */
  line: number;
}

/** Assignment is an assignment of a chapter, with its README, its workspace and its feedback. */
export interface Assignment {
  /** number is the number of the assignment, from the name of its folder, for example `08.01`. */
  number: string;
  /** folder is the folder of the assignment. */
  folder: string;
  /** file is the README of the assignment. */
  file: string;
  /** title is the title of the assignment, the bold words at the start of its first paragraph. */
  title: string;
  /** scenario is the rest of the first paragraph: what the student builds and why. */
  scenario: string;
  /** due is the text of the due date, or undefined. */
  due: string | undefined;
  /** chapter is the number of the chapter that the README links to, or undefined. */
  chapter: string | undefined;
  /** objectives are the learning objectives of the assignment, in their order. */
  objectives: AssignmentObjective[];
  /** requirements are the requirements, R1 to Rn. */
  requirements: Requirement[];
  /** rules are the items of the rules. */
  rules: Rule[];
  /** criteria are the criteria, C1 to Cm. */
  criteria: Criterion[];
  /** exampleRun is the text of the code block of the example run or of the expected output, or undefined. */
  exampleRun: string | undefined;
  /** workspace are the files of the folder workspace/, relative to the folder of the assignment. */
  workspace: string[];
  /** feedback is the feedback file next to the README, or undefined when there is none. */
  feedback: Feedback | undefined;
}

/** AssignmentObjective is an item of the learning objectives of an assignment. */
export interface AssignmentObjective {
  /** number is the number of the objective in the table of its chapter, for example `08.3`. */
  number: string;
  /** level is the level of the item, 1 to 6, or undefined. */
  level: number | undefined;
  /** levelText is the text of the level of the item, for example `K3 – Anwenden`. */
  levelText: string;
  /** text is the concrete form of the objective in this assignment. */
  text: string;
  /** line is the line of the item. */
  line: number;
}

/** Requirement is an item of the checklist of the requirements. */
export interface Requirement {
  /** id is the number of the requirement, R1 to Rn. */
  id: string;
  /** group is the heading of the third level above the requirement, or an empty text. */
  group: string;
  /** text is the text of the item without its checkbox and without the mark of its objectives. */
  text: string;
  /** objectives are the numbers of the objectives of the mark of the requirement. */
  objectives: string[];
  /** line is the line of the item. */
  line: number;
}

/** Rule is an item of the rules. */
export interface Rule {
  /** text is the text of the item without the mark of its objectives. */
  text: string;
  /** objectives are the numbers of the objectives of the mark of the rule. */
  objectives: string[];
  /** line is the line of the item. */
  line: number;
}

/** Criterion is an item of the criteria. */
export interface Criterion {
  /** id is the number of the criterion, C1 to Cm. */
  id: string;
  /** name is the bold name of the criterion. */
  name: string;
  /** text is the text after the name. */
  text: string;
  /** line is the line of the item. */
  line: number;
}

/** Status is the status of a requirement in a feedback: met, partly met or missing. */
export type Status = 'met' | 'partly' | 'missing';

/** Feedback is the feedback file of an assignment. */
export interface Feedback {
  /** file is the feedback file. */
  file: string;
  /** entries are the first feedback and each update, in their order. */
  entries: FeedbackEntry[];
}

/** FeedbackEntry is the first feedback or an update of a feedback file. */
export interface FeedbackEntry {
  /** time is the time of the heading, for example `02.11.2026 11:30`. */
  time: string;
  /** update tells whether the entry is an update. */
  update: boolean;
  /** changes is the line about the changes of an update, or undefined. */
  changes: string | undefined;
  /** requirements are the items of the requirements of the assessment. */
  requirements: FeedbackRequirement[];
  /** criteria are the items of the criteria of the assessment. */
  criteria: FeedbackCriterion[];
  /** run is the comment on the program run, or undefined. */
  run: string | undefined;
  /** commits is the number of commits, or undefined. */
  commits: number | undefined;
  /** score is the score in percent, or undefined. */
  score: number | undefined;
  /** capped tells whether a check capped the score because the work does not run. */
  capped: boolean;
  /** line is the line of the heading of the entry. */
  line: number;
}

/** FeedbackRequirement is the item of a requirement in a feedback. */
export interface FeedbackRequirement {
  /** id is the number of the requirement, R1 to Rn. */
  id: string;
  /** status is the status of the requirement. */
  status: Status;
  /** text is the short text of the requirement. */
  text: string;
  /** comment is the comment on the requirement. */
  comment: string;
}

/** FeedbackCriterion is the item of a criterion in a feedback. */
export interface FeedbackCriterion {
  /** id is the number of the criterion, C1 to Cm. */
  id: string;
  /** name is the name of the criterion. */
  name: string;
  /** comment is the comment on the criterion. */
  comment: string;
}

/** Problem is a place where a file of a course differs from its form. */
export interface Problem {
  /** file is the file of the problem. */
  file: string;
  /** line is the line of the problem. */
  line: number;
  /** code is a short name of the kind of the problem, for example `missing-section`. */
  code: string;
  /** message says what differs from the form. */
  message: string;
}
