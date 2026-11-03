// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The files of a new, empty course, for `cs create`: the settings, the file of the own rules of the course, the README
 * of the course and the overviews of its folders, the plan of the walkthroughs and the cheat sheet, each with the
 * comment of the format of its kind. From the first file on, the comment of a file leads an AI agent to the rules of
 * its kind. The files pass `cs check`. The module uses no API of VS Code.
 */

import { commentLines, specUrl } from './comment';
import { settingsFile } from './course';
import { commonRules, rulesFolder } from './instructions';
import type { Kind } from './types';

/** NewFile is a file of a new course. */
export interface NewFile {
  /** file is the file, relative to the folder of the course. */
  file: string;
  text: string;
}

/** Texts are the texts of the files of a new course in one language. */
interface Texts {
  readme: string;
  material: string;
  tutorials: string;
  plan: string;
  assignments: string;
  reference: string;
  rules: string;
}

/**
 * texts returns the texts of the files of a new course in its language, with the placeholders in angle brackets.
 * @param name - The name of the course.
 * @param language - The language of the course, `de` or `en`.
 */
function texts(name: string, language: 'de' | 'en'): Texts {
  if (language === 'de') {
    return {
      readme: `# ${name}\n\n<Was dieser Kurs lehrt, für wen er ist und wie man beginnt.>\n\n## Inhalt\n\n- [Kursmaterial](10-course/README.md)\n- [Aufgaben](20-assignments/README.md)\n- [Referenzmaterial](reference-material/README.md)\n`,
      material: `# Kursmaterial\n\nKursmaterial mit dem Lernpfad und den Walkthroughs für den Unterricht.\n\n## Inhalt\n\n- [Tutorials](10-tutorials/README.md) – der Lernpfad, nach Kapiteln geordnet\n- [Walkthroughs](20-sessions/README.md) – ein Walkthrough pro Kapitel und der Kursplan\n`,
      tutorials: `# Lernpfad\n\n<Was der Lernpfad lehrt.>\n\n## Kapitel\n\n<Ein Link auf die README jedes Kapitels, in der Reihenfolge der Kapitel.>\n`,
      plan: `# Walkthroughs für den Unterricht\n\nDieser Ordner enthält einen Walkthrough pro Kapitel des Lernpfads.\n\n## Kursplan\n\n| Doppelstunde | Input | Die Schüler:innen arbeiten an |\n| ------------ | ----- | ----------------------------- |\n\n## Walkthroughs\n\n<Ein Link auf jeden Walkthrough, in der Reihenfolge der Kapitel.>\n`,
      assignments: `# Aufgaben\n\n<Wie die Schüler:innen an den Aufgaben arbeiten.>\n\n## Kapitel\n\n<Ein Link auf die Übersicht der Aufgaben jedes Kapitels.>\n`,
      reference: `# Referenzmaterial\n\n## Inhalt\n\n- [Cheat Sheet](10-cheat-sheet.md) – kurze Notizen zu diesem Kurs, ein Abschnitt pro Kapitel\n`,
      rules: rulesText,
    };
  }
  return {
    readme: `# ${name}\n\n<What this course teaches, who it is for and how to begin.>\n\n## Content\n\n- [Course material](10-course/README.md)\n- [Assignments](20-assignments/README.md)\n- [Reference material](reference-material/README.md)\n`,
    material: `# Course Material\n\nThe course material with the learning path and the classroom walkthroughs.\n\n## Content\n\n- [Tutorials](10-tutorials/README.md) – the learning path, in chapters\n- [Walkthroughs](20-sessions/README.md) – one walkthrough per chapter and the course plan\n`,
    tutorials: `# Learning Path\n\n<What the learning path teaches.>\n\n## Chapters\n\n<A link to the README of each chapter, in the order of the chapters.>\n`,
    plan: `# Classroom Walkthroughs\n\nThis folder contains one walkthrough per chapter of the learning path.\n\n## Course Plan\n\n| Double lesson | Input | Students work on |\n| ------------- | ----- | ---------------- |\n\n## Walkthroughs\n\n<A link to each walkthrough, in the order of the chapters.>\n`,
    assignments: `# Assignments\n\n<How the students work on the assignments.>\n\n## Chapters\n\n<A link to the overview of the assignments of each chapter.>\n`,
    reference: `# Reference Material\n\n## Content\n\n- [Cheat Sheet](10-cheat-sheet.md) – short notes on this course, one section per chapter\n`,
    rules: rulesText,
  };
}

/** rulesText is the start of the file of the own rules of a new course for every file. */
const rulesText = `<!--
The own rules of this course for every file. \`npx -y @nimblescape/course instructions <topic>\` prints this file
after the rules of the format (${specUrl}), and the file <topic>.md of this folder after it, for example chapter.md
or assignment.md.
A file with another name adds a topic of this course. Write the rules as sections of the second level.
-->

## Students

<Who the students are: their age and what they know before the course.>

## Language

<The language of the texts, how the texts address the students, and the language of the code.>
`;

/**
 * withHead returns the text of a file of a kind with the comment of the format and a blank line before it.
 * @param kind - The kind of the file.
 * @param text - The text of the file.
 */
const withHead = (kind: Kind, text: string): string => [...commentLines(kind), '', text].join('\n');

/**
 * newCourse returns the files of a new, empty course.
 * @param name - The name of the course, for example the name of its folder.
 * @param language - The language of the course, `de` or `en`.
 */
export function newCourse(name: string, language: 'de' | 'en'): NewFile[] {
  const each = texts(name, language);
  const cheatSheet =
    language === 'de'
      ? '# Cheat Sheet\n\nKurze Notizen für die Aufgaben, ein Abschnitt pro Kapitel; die Erklärungen und Beispiele stehen in den Kapiteln.\n'
      : '# Cheat Sheet\n\nShort notes for the assignments, one section per chapter; the explanations and examples are in the chapters.\n';
  return [
    { file: settingsFile, text: `# The settings of the course: ${specUrl}#2-the-settings-of-a-course\ncourse: ${name}\nlanguage: ${language}\n` },
    { file: `${rulesFolder}/${commonRules}.md`, text: each.rules },
    { file: 'README.md', text: withHead('course', each.readme) },
    { file: '10-course/README.md', text: withHead('overview', each.material) },
    { file: '10-course/10-tutorials/README.md', text: withHead('overview', each.tutorials) },
    { file: '10-course/20-sessions/README.md', text: withHead('plan', each.plan) },
    { file: '20-assignments/README.md', text: withHead('overview', each.assignments) },
    { file: 'reference-material/README.md', text: withHead('overview', each.reference) },
    { file: 'reference-material/10-cheat-sheet.md', text: withHead('cheat-sheet', cheatSheet) },
  ];
}
