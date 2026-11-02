// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The names of the sections and of the fixed texts of the files of a course in each language
 * ([R-COURSE-006](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-006)): each kind of file
 * has sections with fixed roles, and the name of a section is in the language of the course. Section 3 of
 * docs/format.md shows the same table, and a test checks that both have the same names. The module uses no API of
 * VS Code.
 */

/** Language holds the names of one language. */
export interface Language {
  /** code is the code of the language in .course/course.yml, for example `de`. */
  code: string;
  /** chapter are the headings of the second level of the sections of a chapter. */
  chapter: {
    overview: readonly string[];
    objectives: readonly string[];
    tutorials: readonly string[];
    assignments: readonly string[];
    walkthrough: readonly string[];
  };
  /** assignment are the names of the parts of an assignment. */
  assignment: {
    /** heading is the heading of the first level. */
    heading: string;
    /** due is the bold label of the due date, without its colon. */
    due: string;
    /** chapter is the bold label of the link to the chapter, without its colon. */
    chapter: string;
    objectives: readonly string[];
    exampleRun: readonly string[];
    requirements: readonly string[];
    rules: readonly string[];
    criteria: readonly string[];
  };
  /** mark are the words of the mark of the objectives, for one objective and for several. */
  mark: { one: string; many: string };
  /** levels are the names of the six levels, K1 to K6; a level may have more than one name. */
  levels: readonly (readonly string[])[];
  /** feedback are the fixed texts of a feedback file. */
  feedback: {
    title: string;
    update: string;
    assessment: string;
    bestPractices: string;
    suggestions: string;
    summary: string;
    run: string;
    commits: string;
    score: string;
  };
}

/** german are the names of the German courses. */
const german: Language = {
  code: 'de',
  chapter: {
    overview: ['Themenübersicht'],
    objectives: ['Lernziele (Taxonomie nach Bloom)'],
    tutorials: ['Tutorials'],
    assignments: ['Zugehörige Aufgaben'],
    walkthrough: ['Walkthrough für den Unterricht'],
  },
  assignment: {
    heading: 'Aufgabe',
    due: 'Abgabe',
    chapter: 'Kapitel',
    objectives: ['Lernziele'],
    exampleRun: ['Beispiellauf', 'Erwartete Ausgabe'],
    requirements: ['Anforderungen'],
    rules: ['Regeln'],
    criteria: ['Kriterien'],
  },
  mark: { one: 'Lernziel', many: 'Lernziele' },
  levels: [['Erinnern'], ['Verstehen'], ['Anwenden'], ['Analysieren'], ['Bewerten'], ['Erschaffen']],
  feedback: {
    title: 'Feedback',
    update: 'Update',
    assessment: 'Bewertung',
    bestPractices: 'Best Practices',
    suggestions: 'Vorschläge',
    summary: 'Zusammenfassung',
    run: 'Ausgeführt',
    commits: 'Commits in `workspace/`',
    score: 'Ergebnis',
  },
};

/** english are the names of the English courses. */
const english: Language = {
  code: 'en',
  chapter: {
    overview: ['Topic Overview'],
    objectives: ["Learning Objectives (Bloom's Taxonomy)"],
    tutorials: ['Tutorials'],
    assignments: ['Related Assignments'],
    walkthrough: ['Classroom Walkthrough'],
  },
  assignment: {
    heading: 'Assignment',
    due: 'Due Date',
    chapter: 'Chapter',
    objectives: ['Learning Objectives'],
    exampleRun: ['Example Run', 'Expected Output'],
    requirements: ['Requirements'],
    rules: ['Rules'],
    criteria: ['Criteria'],
  },
  mark: { one: 'objective', many: 'objectives' },
  levels: [['Remember'], ['Understand'], ['Apply'], ['Analyze', 'Analyse'], ['Evaluate'], ['Create']],
  feedback: {
    title: 'Feedback',
    update: 'Update',
    assessment: 'Assessment',
    bestPractices: 'Best Practices',
    suggestions: 'Suggestions',
    summary: 'Summary',
    run: 'Run',
    commits: 'Commits in `workspace/`',
    score: 'Score',
  },
};

/** languages are the languages that the course module knows, by their codes. */
export const languages: Readonly<Record<string, Language>> = { de: german, en: english };

/**
 * languageOf returns the names of a language, or undefined for a language that the module does not know. A code with a
 * region, for example `de-AT`, takes the names of its language.
 * @param code - The code of the language.
 */
export const languageOf = (code: string): Language | undefined => languages[code.toLowerCase().split(/[-_]/)[0]];
