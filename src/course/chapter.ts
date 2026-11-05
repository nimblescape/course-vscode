// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The reader of the README of a chapter
 * ([R-COURSE-007](../../docs/requirements.md#r-course-007)): the number and the
 * title of the chapter from its heading of the first level, the learning objectives from the table of their section,
 * and the links of the tutorials and of the related assignments. It also gives the places where the README differs
 * from its form. The module uses no API of VS Code.
 */

import type { Language } from './languages';
import { type Blocks, findSection, inSection, inlineLink, type Section } from './markdown';
import { resolveLink } from './paths';
import type { Chapter, Link, Objective, Problem } from './types';

/** chapterTitle matches the heading of the first level of a chapter: its number, a dash and its name. */
const chapterTitle = /^(\d+)\s+[–-]\s+(.+)$/;

/** objectiveNumber matches the full number of an objective: the number of the chapter, a dot and a number. */
export const objectiveNumber = /^(\d+)\.(\d+)$/;

/** levelForm matches the text of a level, `K<n> – <name>`. */
const levelForm = /^K(\d+)\s+[–-]\s+(.+)$/;

/**
 * readLevel returns the number of a level and the problem of its text, if any: a level outside K1 to K6, a text that
 * is not `K<n> – <name>`, or a name that is not the name of the number in the language of the course.
 * @param text - The text of the level, for example `K3 – Anwenden`.
 * @param language - The language of the course.
 */
export function readLevel(text: string, language: Language): { level: number | undefined; problem: string | undefined } {
  const match = levelForm.exec(text.trim());
  if (!match) {
    const number = /^K(\d+)\b/.exec(text.trim());
    const level = number && Number(number[1]) >= 1 && Number(number[1]) <= 6 ? Number(number[1]) : undefined;
    return { level, problem: `The level "${text}" does not have the form "K<n> – <name>".` };
  }
  const level = Number(match[1]);
  if (level < 1 || level > 6) {
    return { level: undefined, problem: `The level "${text}" is outside K1 to K6.` };
  }
  const names = language.levels[level - 1];
  if (!names.includes(match[2].trim())) {
    return { level, problem: `The name of the level K${level} is "${names.join('" or "')}", not "${match[2].trim()}".` };
  }
  return { level, problem: undefined };
}

/**
 * linksOf returns the links of the items of a section.
 * @param blocks - The blocks of the file.
 * @param section - The section, or undefined.
 * @param file - The file, relative to the folder of the course.
 */
export function linksOf(blocks: Blocks, section: Section | undefined, file: string): Link[] {
  if (!section) {
    return [];
  }
  const links: Link[] = [];
  for (const item of inSection(section, blocks.items)) {
    const match = inlineLink.exec(item.lines.join(' '));
    const target = match ? resolveLink(file, match[2]) : undefined;
    if (match && target !== undefined) {
      links.push({ text: match[1], file: target, line: item.line + 1 });
    }
  }
  return links;
}

/**
 * readChapter returns the chapter of the blocks of its README, and the places where the README differs from its form.
 * @param blocks - The blocks of the README.
 * @param file - The README, relative to the folder of the course.
 * @param language - The language of the course.
 */
export function readChapter(blocks: Blocks, file: string, language: Language): { chapter: Chapter; problems: Problem[] } {
  const problems: Problem[] = [];
  const problem = (line: number, code: string, message: string): void => {
    problems.push({ file, line: line + 1, code, message });
  };
  const title = blocks.headings.find((heading) => heading.level === 1);
  const titleMatch = title ? chapterTitle.exec(title.text) : null;
  const folderNumber = /(?:^|\/)(\d+)-[^/]*\/[^/]+$/.exec(file)?.[1];
  if (!title) {
    problem(0, 'missing-title', 'The chapter has no heading of the first level "# <number> – <name>".');
  } else if (!titleMatch) {
    problem(title.line, 'title-form', `The heading "${title.text}" does not have the form "<number> – <name>".`);
  }
  const number = titleMatch?.[1] ?? folderNumber ?? '';
  const sections = {
    overview: findSection(blocks, 2, language.chapter.overview),
    objectives: findSection(blocks, 2, language.chapter.objectives),
    tutorials: findSection(blocks, 2, language.chapter.tutorials),
    assignments: findSection(blocks, 2, language.chapter.assignments),
    walkthrough: findSection(blocks, 2, language.chapter.walkthrough),
  };
  for (const [role, section] of Object.entries(sections)) {
    if (!section) {
      const names = language.chapter[role as keyof typeof sections];
      problem(title?.line ?? 0, 'missing-section', `The section "## ${names[0]}" is missing.`);
    }
  }

  const objectives: Objective[] = [];
  if (sections.objectives) {
    const table = inSection(sections.objectives, blocks.tables)[0];
    if (!table) {
      problem(sections.objectives.start, 'objectives-table', 'The section of the learning objectives has no table.');
    } else {
      if (table.header.length !== 4) {
        problem(table.line, 'objectives-table', `The table of the learning objectives has ${table.header.length} columns, not 4: number, learning objective, description and level.`);
      }
      for (const row of table.rows) {
        const [numberText = '', text = '', description = '', levelText = ''] = row.cells;
        const numberMatch = objectiveNumber.exec(numberText);
        if (!numberMatch) {
          problem(row.line, 'objective-number', `The number "${numberText}" of the objective does not have the form "<chapter>.<n>", for example "${number || '08'}.3".`);
        } else if (number && numberMatch[1] !== number) {
          problem(row.line, 'objective-number', `The number "${numberText}" of the objective does not start with the number of its chapter, "${number}".`);
        }
        const level = readLevel(levelText, language);
        if (level.problem) {
          problem(row.line, 'level', level.problem);
        }
        objectives.push({ number: numberText, text, description, level: level.level, levelText, line: row.line + 1 });
      }
    }
  }

  return {
    chapter: {
      number,
      title: titleMatch?.[2].trim() ?? title?.text ?? '',
      file,
      objectives,
      tutorials: linksOf(blocks, sections.tutorials, file),
      assignments: linksOf(blocks, sections.assignments, file),
    },
    problems,
  };
}
