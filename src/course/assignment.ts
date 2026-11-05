// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The reader of the README of an assignment
 * ([R-COURSE-008](../../docs/requirements.md#r-course-008)): the title and the
 * scenario, the due date, the link to the chapter, the learning objectives, the example run, the requirements R1 to Rn
 * with their groups and the marks of their objectives, the rules and the criteria C1 to Cm. It also gives the places
 * where the README differs from its form. The checks that need the tables of the chapters are in check.ts. The module
 * uses no API of VS Code.
 */

import { objectiveNumber, readLevel } from './chapter';
import type { Language } from './languages';
import { type Blocks, describes, findSection, firstParagraph, inSection, inlineLink, type Item, sectionsOf } from './markdown';
import { compareNumbers, resolveLink } from './paths';
import type { Assignment, AssignmentObjective, Criterion, Problem, Requirement, Rule } from './types';

/** objectiveItem matches the first paragraph of an item of the learning objectives: the link, the level and the text. */
const objectiveItem = /^\[([^\]]*)\]\(([^)\s]*)\)\s*\(([^)]*)\)\s*:\s*(.*)$/;

/** criterionItem matches an item of the criteria, `**<name>:** <text>`. */
const criterionItem = /^\*\*([^*]+?):\*\*\s*([\s\S]*)$/;

/** titleParagraph matches the first paragraph of an assignment: the bold title, a dash and the scenario. */
const titleParagraph = /^\*\*([^*]+)\*\*\s*(?:[–-]\s*)?([\s\S]*)$/;

/** Marked is the text of an item without the mark of its objectives, and the numbers of the mark. */
interface Marked {
  text: string;
  objectives: string[];
}

/**
 * escape returns a text as a part of a regular expression.
 * @param text - The text.
 */
const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * markRegExps returns the regular expressions of the mark of the objectives in a language: the mark at the end of a
 * text, with an optional colon after it, and a mark anywhere.
 * @param language - The language of the course.
 */
function markRegExps(language: Language): { atEnd: RegExp; anywhere: RegExp } {
  const words = `(${escape(language.mark.many)}|${escape(language.mark.one)})`;
  const numbers = '(\\d+\\.\\d+(?:\\s*,\\s*\\d+\\.\\d+)*)';
  return {
    atEnd: new RegExp(`\\s*\\(${words}\\s+${numbers}\\)(:?)\\s*$`),
    anywhere: new RegExp(`\\(${words}\\s+\\d+\\.\\d+`),
  };
}

/**
 * readMarked returns the text of an item without the mark of its objectives at the end of its first paragraph, and the
 * numbers of the mark. It adds a problem for a mark in another place, a mark whose word does not fit the number of its
 * objectives, and a mark whose numbers are not sorted or name an objective twice.
 * @param item - The item.
 * @param language - The language of the course.
 * @param problem - Adds a problem at a line of the file.
 */
function readMarked(item: Item, language: Language, problem: (line: number, code: string, message: string) => void): Marked {
  const regExps = markRegExps(language);
  const first = firstParagraph(item);
  const joined = first.join('\n');
  const match = regExps.atEnd.exec(joined);
  const rest = item.lines.slice(first.length);
  if (!match) {
    if (regExps.anywhere.test(item.lines.join('\n'))) {
      problem(item.line, 'mark-place', `The mark of the objectives must stand at the end of the first paragraph of the item, before a colon that introduces a list or a code block.`);
    }
    return { text: item.lines.join('\n').trim(), objectives: [] };
  }
  const objectives = match[2].split(',').map((number) => number.trim());
  const word = objectives.length === 1 ? language.mark.one : language.mark.many;
  if (match[1] !== word) {
    problem(item.line, 'mark-form', `A mark of ${objectives.length === 1 ? 'one objective' : 'several objectives'} starts with "${word}", not "${match[1]}".`);
  }
  const sorted = [...objectives].sort(compareNumbers);
  if (new Set(objectives).size !== objectives.length) {
    problem(item.line, 'mark-form', `The mark names an objective twice: ${objectives.join(', ')}.`);
  } else if (sorted.join() !== objectives.join()) {
    problem(item.line, 'mark-order', `The numbers of the mark are not sorted: ${objectives.join(', ')} instead of ${sorted.join(', ')}.`);
  }
  const before = joined.slice(0, match.index) + match[3];
  return { text: [before, ...rest].join('\n').trim(), objectives };
}

/**
 * readAssignmentText returns the assignment of the blocks of its README, without its workspace and its feedback, and
 * the places where the README differs from its form.
 * @param blocks - The blocks of the README.
 * @param file - The README, relative to the folder of the course.
 * @param language - The language of the course.
 */
export function readAssignmentBlocks(blocks: Blocks, file: string, language: Language): { assignment: Assignment; chapterFile: string | undefined; problems: Problem[] } {
  const problems: Problem[] = [];
  const problem = (line: number, code: string, message: string): void => {
    problems.push({ file, line: line + 1, code, message });
  };
  const words = language.assignment;
  const folder = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : '';
  const folderName = folder.slice(folder.lastIndexOf('/') + 1);
  const number = /^(\d+(?:\.\d+)*)-/.exec(folderName)?.[1] ?? '';

  const heading = blocks.headings.find((each) => each.level === 1);
  if (!heading) {
    problem(0, 'missing-title', `The assignment has no heading "# ${words.heading}".`);
  } else if (heading.text !== words.heading) {
    problem(heading.line, 'title-form', `The heading of the first level of an assignment is "# ${words.heading}", not "# ${heading.text}".`);
  }
  const firstSection = sectionsOf(blocks, 2)[0];
  const head = blocks.paragraphs.filter((paragraph) => paragraph.line > (heading?.line ?? -1) && (!firstSection || paragraph.line < firstSection.start));
  const titleMatch = head.length > 0 ? titleParagraph.exec(head[0].text) : null;
  if (!titleMatch) {
    problem(head[0]?.line ?? heading?.line ?? 0, 'missing-title', 'The first paragraph of the assignment does not start with its title in bold, "**<title>** – <scenario>".');
  }
  const label = (name: string) => head.find((paragraph) => paragraph.text.startsWith(`**${name}:**`));
  const due = label(words.due);
  const chapterLine = label(words.chapter);
  let chapterFile: string | undefined;
  if (!chapterLine) {
    problem(head[0]?.line ?? 0, 'missing-chapter', `The assignment has no paragraph "**${words.chapter}:** <link to the README of its chapter>".`);
  } else {
    const link = inlineLink.exec(chapterLine.text);
    chapterFile = link ? resolveLink(file, link[2]) : undefined;
    if (!chapterFile) {
      problem(chapterLine.line, 'missing-chapter', `The paragraph "**${words.chapter}:**" has no link to the README of the chapter.`);
    }
  }

  const sections = {
    objectives: findSection(blocks, 2, words.objectives),
    exampleRun: findSection(blocks, 2, words.exampleRun),
    requirements: findSection(blocks, 2, words.requirements),
    rules: findSection(blocks, 2, words.rules),
    criteria: findSection(blocks, 2, words.criteria),
  };
  for (const [role, section] of Object.entries(sections)) {
    // The example is optional: an assignment whose work is neither a program that prints nor a page has none.
    if (!section && role !== 'exampleRun') {
      const names = words[role as keyof typeof sections];
      problem(heading?.line ?? 0, 'missing-section', `The section "## ${names.join('" or "## ')}" is missing.`);
    }
  }

  const objectives: AssignmentObjective[] = [];
  if (sections.objectives) {
    for (const item of inSection(sections.objectives, blocks.items)) {
      const match = objectiveItem.exec(firstParagraph(item).join(' ').trim());
      if (!match || !objectiveNumber.test(match[1])) {
        problem(item.line, 'objective-form', 'The item of a learning objective does not have the form "[<number>](<link to the table of the chapter>) (K<n> – <name>): <text>".');
        continue;
      }
      const level = readLevel(match[3], language);
      if (level.problem) {
        problem(item.line, 'level', level.problem);
      }
      if (objectives.some((objective) => objective.number === match[1])) {
        problem(item.line, 'objective-twice', `The objective ${match[1]} is named twice.`);
      }
      objectives.push({ number: match[1], level: level.level, levelText: match[3].trim(), text: [match[4], ...item.lines.slice(firstParagraph(item).length)].join(' ').trim(), line: item.line + 1 });
    }
  }

  const listed = new Set(objectives.map((objective) => objective.number));
  const checkMarks = (marked: Marked, line: number): void => {
    const unknown = marked.objectives.filter((each) => !listed.has(each));
    if (unknown.length > 0) {
      problem(line, 'mark-unknown', `The mark names ${unknown.join(', ')}, which the learning objectives of the assignment do not list.`);
    }
  };

  const requirements: Requirement[] = [];
  if (sections.requirements) {
    const groups = blocks.headings.filter((each) => each.level === 3 && each.line > sections.requirements!.start && each.line < sections.requirements!.end);
    for (const item of inSection(sections.requirements, blocks.items)) {
      if (item.checkbox === undefined) {
        if (!describes(blocks, item)) {
          problem(item.line, 'not-checklist', 'A requirement is an item of the checklist, "- [ ] <text>".');
        }
        continue;
      }
      const marked = readMarked(item, language, problem);
      checkMarks(marked, item.line);
      const group = groups.filter((each) => each.line < item.line).pop()?.text ?? '';
      requirements.push({ id: `R${requirements.length + 1}`, group, text: marked.text, objectives: marked.objectives, line: item.line + 1 });
    }
    if (requirements.length === 0) {
      problem(sections.requirements.heading.line, 'no-requirements', 'The requirements have no item of the checklist, "- [ ] <text>".');
    }
  }

  const rules: Rule[] = [];
  if (sections.rules) {
    for (const item of inSection(sections.rules, blocks.items)) {
      const marked = readMarked(item, language, problem);
      checkMarks(marked, item.line);
      rules.push({ text: marked.text, objectives: marked.objectives, line: item.line + 1 });
    }
  }

  const criteria: Criterion[] = [];
  if (sections.criteria) {
    for (const item of inSection(sections.criteria, blocks.items)) {
      const match = criterionItem.exec(item.lines.join('\n').trim());
      if (!match) {
        problem(item.line, 'criterion-form', 'A criterion has the form "- **<name>:** <text>".');
        continue;
      }
      criteria.push({ id: `C${criteria.length + 1}`, name: match[1].trim(), text: match[2].replace(/\s*\n\s*/g, ' ').trim(), line: item.line + 1 });
    }
  }

  const exampleRun = sections.exampleRun ? inSection(sections.exampleRun, blocks.codes)[0]?.text : undefined;

  return {
    assignment: {
      number,
      folder,
      file,
      title: titleMatch?.[1].trim() ?? folderName,
      scenario: titleMatch?.[2].trim() ?? '',
      due: due?.text.slice(`**${words.due}:**`.length).trim(),
      chapter: undefined,
      objectives,
      requirements,
      rules,
      criteria,
      exampleRun,
      workspace: [],
      feedback: undefined,
    },
    chapterFile,
    problems,
  };
}
