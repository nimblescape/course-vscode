// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The checks of the files of a course that are for people: the tutorial pages, the walkthroughs, the plan of the
 * walkthroughs, the cheat sheet and the overviews (sections 9 to 13 of docs/format.md). Programs read no data from
 * these files; the checks give the places where a file differs from its form, so that `cs check` and the course
 * extension report them. The module uses no API of VS Code.
 */

import type { Language } from './languages';
import { type Blocks, findSection, inSection, type Section, sectionsOf } from './markdown';
import { compareNumbers, resolveLink } from './paths';
import type { Chapter, Kind, Problem } from './types';

/** PageInput is what the checks of the pages read of a course. */
export interface PageInput {
  /** files are the files of the course with their kinds. */
  files: readonly { file: string; kind: Kind }[];
  /** blocks returns the blocks of a file, relative to the folder of the course. */
  blocks(file: string): Blocks;
  /** language is the language of the course. */
  language: Language;
  /** chapters are the chapters of the course, in the order of their numbers. */
  chapters: readonly Chapter[];
  /** list returns the entries of a folder, relative to the folder of the course. */
  list(folder: string): { name: string; folder: boolean }[];
  /** exists tells whether a file exists, relative to the folder of the course. */
  exists(file: string): boolean;
}

/** maxInputMinutes is the most minutes of an input of a walkthrough. */
const maxInputMinutes = 30;

/** cheatSheetLimits are the limits of a section of the cheat sheet. */
const cheatSheetLimits = { codes: 1, codeLines: 10, tables: 1, tablesOfLastChapter: 2, rows: 10, items: 4, lines: 25 };

/** skipped are the folders that an overview does not link: the folders of Git, of the packages and of the builds. */
const skipped = new Set(['node_modules', 'dist', 'out']);

/**
 * dirname returns the folder of a file, relative to the folder of the course, or an empty text.
 * @param file - The file.
 */
const dirname = (file: string): string => (file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : '');

/**
 * basename returns the name of a file without its folder.
 * @param file - The file.
 */
const basename = (file: string): string => file.slice(file.lastIndexOf('/') + 1);

/**
 * escape returns a text as a part of a regular expression.
 * @param text - The text.
 */
const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * outsideCode returns the lines of a file with an empty text for each line of a fenced code block, also inside a list.
 * @param lines - The lines of the file.
 */
function outsideCode(lines: readonly string[]): string[] {
  let open: string | undefined;
  return lines.map((line) => {
    const mark = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (mark && (open === undefined || (mark[0] === open[0] && mark.length >= open.length))) {
      open = open === undefined ? mark : undefined;
      return '';
    }
    return open === undefined ? line : '';
  });
}

/** FileLink is a link of a file to another file of the course. */
interface FileLink {
  /** file is the file that the link names, relative to the folder of the course, without an anchor. */
  file: string;
  /** line is the index of the line of the link. */
  line: number;
}

/**
 * fileLinks returns the links of the lines of a file to the files of the course, outside the code blocks. The text of a
 * link may go over several lines.
 * @param lines - The lines of the file, or of a part of it.
 * @param file - The file, relative to the folder of the course.
 * @param first - The index of the first of the lines in the file.
 */
function fileLinks(lines: readonly string[], file: string, first = 0): FileLink[] {
  const text = outsideCode(lines).join('\n');
  const found: FileLink[] = [];
  for (const match of text.matchAll(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = resolveLink(file, match[2]);
    if (target !== undefined) {
      found.push({ file: target, line: first + text.slice(0, match.index).split('\n').length - 1 });
    }
  }
  return found;
}

/**
 * sectionEnd returns the end of a section without a line `---` and the text after it, which ends the last section of
 * many files with the line of the license.
 * @param blocks - The blocks of the file.
 * @param section - The section.
 */
function sectionEnd(blocks: Blocks, section: Section): number {
  const lines = outsideCode(blocks.lines);
  for (let index = section.start + 1; index < section.end; index++) {
    if (/^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(lines[index]) && (index === 0 || lines[index - 1].trim() === '')) {
      return index;
    }
  }
  return section.end;
}

/**
 * checkPages returns the places where the tutorial pages, the walkthroughs, the plan of the walkthroughs, the cheat
 * sheet and the overviews of a course differ from their forms.
 * @param input - The files, the language and the chapters of the course.
 */
export function checkPages(input: PageInput): Problem[] {
  const problems: Problem[] = [];
  const problem = (file: string, line: number, code: string, message: string): void => {
    problems.push({ file, line: line + 1, code, message });
  };
  const of = (kind: Kind): string[] => input.files.filter((each) => each.kind === kind).map((each) => each.file);
  const tutorials = of('tutorial');
  const titleLine = (blocks: Blocks): number => blocks.headings.find((heading) => heading.level === 1)?.line ?? 0;

  for (const file of tutorials) {
    checkTutorial(input, file, problem);
  }
  for (const file of of('walkthrough')) {
    checkWalkthrough(input, file, tutorials, problem);
  }
  for (const file of of('plan')) {
    const blocks = input.blocks(file);
    const names = input.language.plan;
    const plan = findSection(blocks, 2, names.coursePlan);
    for (const [section, name] of [
      [plan, names.coursePlan[0]],
      [findSection(blocks, 2, names.walkthroughs), names.walkthroughs[0]],
    ] as const) {
      if (!section) {
        problem(file, titleLine(blocks), 'missing-section', `The section "## ${name}" is missing.`);
      }
    }
    if (plan) {
      const table = inSection(plan, blocks.tables)[0];
      if (!table) {
        problem(file, plan.start, 'plan-table', 'The section of the course plan has no table.');
      } else if (table.header.length !== 3) {
        problem(file, table.line, 'plan-table', `The table of the course plan has ${table.header.length} columns, not 3: the double lesson, the input and the work of the students.`);
      }
    }
  }
  for (const file of of('cheat-sheet')) {
    checkCheatSheet(input, file, problem);
  }
  for (const file of [...of('overview'), ...of('plan')]) {
    const blocks = input.blocks(file);
    const linked = new Set(fileLinks(blocks.lines, file).map((link) => link.file));
    const folder = dirname(file);
    const join = (name: string): string => (folder ? `${folder}/${name}` : name);
    for (const entry of input.list(folder)) {
      if (entry.name.startsWith('.') || skipped.has(entry.name)) {
        continue;
      }
      const target = entry.folder ? (input.exists(join(`${entry.name}/README.md`)) ? join(`${entry.name}/README.md`) : undefined) : /\.md$/i.test(entry.name) && entry.name !== basename(file) ? join(entry.name) : undefined;
      if (target && !linked.has(target) && !linked.has(dirname(target))) {
        problem(file, titleLine(blocks), 'overview-link', `The overview does not link ${target}.`);
      }
    }
  }
  return problems;
}

/**
 * checkTutorial adds the places where a tutorial page differs from its form: its title, its video, its name, and the
 * link of the README of its chapter.
 * @param input - The files, the language and the chapters of the course.
 * @param file - The tutorial page.
 * @param problem - Adds a problem at the index of a line of a file.
 */
function checkTutorial(input: PageInput, file: string, problem: (file: string, line: number, code: string, message: string) => void): void {
  const blocks = input.blocks(file);
  const title = blocks.headings.find((heading) => heading.level === 1);
  if (!title) {
    problem(file, 0, 'missing-title', 'The tutorial page has no heading of the first level with the name of its topic.');
  }
  if (!blocks.paragraphs.some((paragraph) => paragraph.text.startsWith('📺'))) {
    problem(file, title?.line ?? 0, 'missing-video', 'The tutorial page has no paragraph of its video after its introduction, "📺 <link to the video or a placeholder>".');
  }
  const chapterFile = dirname(file) ? `${dirname(file)}/README.md` : 'README.md';
  const chapter = input.chapters.find((each) => each.file === chapterFile);
  if (!chapter) {
    problem(file, 0, 'missing-chapter', `The folder of the tutorial page has no README of a chapter, ${chapterFile}.`);
    return;
  }
  const name = /^(\d+)\.(\d+)-[^/]+\.md$/.exec(basename(file));
  if (!name || name[1] !== chapter.number) {
    problem(file, 0, 'page-name', `The name of the tutorial page does not have the form "<chapter>.<n>-<topic>.md" with the number of its chapter, for example "${chapter.number}.01-<topic>.md".`);
  }
  if (!chapter.tutorials.some((link) => link.file === file)) {
    const blocksOfChapter = input.blocks(chapter.file);
    const section = findSection(blocksOfChapter, 2, input.language.chapter.tutorials);
    problem(chapter.file, section?.start ?? titleOf(blocksOfChapter), 'tutorial-link', `The section of the tutorials does not link the tutorial page ${file}.`);
  }
}

/**
 * titleOf returns the index of the line of the heading of the first level of a file, or 0.
 * @param blocks - The blocks of the file.
 */
const titleOf = (blocks: Blocks): number => blocks.headings.find((heading) => heading.level === 1)?.line ?? 0;

/**
 * checkWalkthrough adds the places where a walkthrough differs from its form: its title, its head, its sections, the
 * minutes and the hand-off of each input, and the links to the tutorial pages of its chapter.
 * @param input - The files, the language and the chapters of the course.
 * @param file - The walkthrough.
 * @param tutorials - The tutorial pages of the course.
 * @param problem - Adds a problem at the index of a line of a file.
 */
function checkWalkthrough(input: PageInput, file: string, tutorials: readonly string[], problem: (file: string, line: number, code: string, message: string) => void): void {
  const blocks = input.blocks(file);
  const words = input.language.walkthrough;
  const title = blocks.headings.find((heading) => heading.level === 1);
  const titleLine = title?.line ?? 0;
  if (!title) {
    problem(file, 0, 'missing-title', `The walkthrough has no heading "# ${words.title}: <name of the chapter>".`);
  } else if (!title.text.startsWith(`${words.title}: `)) {
    problem(file, title.line, 'title-form', `The heading of the first level of a walkthrough is "# ${words.title}: <name of the chapter>", not "# ${title.text}".`);
  }
  const firstSection = sectionsOf(blocks, 2)[0];
  const head = blocks.paragraphs.filter((paragraph) => paragraph.line > titleLine && (!firstSection || paragraph.line < firstSection.start));
  const headText = head.map((paragraph) => paragraph.text).join(' ');
  const headLine = head[0]?.line ?? titleLine;

  let chapter: Chapter | undefined;
  const chapterLink = new RegExp(`\\*\\*${escape(words.chapter)}:\\*\\*\\s*\\[[^\\]]*\\]\\(([^)\\s]+)\\)`).exec(headText);
  if (!chapterLink) {
    problem(file, headLine, 'missing-chapter', `The head of the walkthrough has no line "**${words.chapter}:** <link to the README of its chapter>".`);
  } else {
    const target = resolveLink(file, chapterLink[1]);
    chapter = input.chapters.find((each) => each.file === target);
    if (!chapter) {
      problem(file, headLine, 'missing-chapter', `The link to the chapter names ${target ?? chapterLink[1]}, which is no README of a chapter of the course.`);
    }
  }
  if (!headText.includes(`**${words.lessons}:**`)) {
    problem(file, headLine, 'missing-head', `The head of the walkthrough has no line "**${words.lessons}:** <number> (<their numbers in the course plan>)".`);
  }
  if (!words.inputs.some((name) => headText.includes(`**${name}:**`))) {
    problem(file, headLine, 'missing-head', `The head of the walkthrough has no line "**${words.inputs[0]}:** <letter> – <name> (≈ <n> min)".`);
  }

  for (const names of [words.objectives, words.prepare, words.workTime, words.material]) {
    if (!findSection(blocks, 2, names)) {
      problem(file, titleLine, 'missing-section', `The section "## ${names[0]}" is missing.`);
    }
  }
  const inputs = sectionsOf(blocks, 2).filter((section) => section.heading.text === words.input || section.heading.text.startsWith(`${words.input} `));
  if (inputs.length === 0) {
    problem(file, titleLine, 'missing-section', `The walkthrough has no input, "## ${words.input} – <name> (≈ <n> min)".`);
  }
  for (const section of inputs) {
    const minutes = /\(≈\s*(\d+)\s*min\)$/.exec(section.heading.text);
    if (!minutes) {
      problem(file, section.start, 'input-form', `The heading of the input does not end with its minutes, "(≈ <n> min)".`);
    } else if (Number(minutes[1]) > maxInputMinutes) {
      problem(file, section.start, 'input-time', `The input takes ${minutes[1]} minutes, more than ${maxInputMinutes}.`);
    }
    const letter = new RegExp(`^${escape(words.input)} ([A-Z])\\b`).exec(section.heading.text)?.[1];
    const handOff = sectionsOf(blocks, 3).some((each) => each.start > section.start && each.start < section.end && (each.heading.text === words.handOff || each.heading.text.startsWith(`${words.handOff} `)));
    if (!handOff) {
      problem(file, section.start, 'missing-section', `The input has no hand-off to the assignments, "### ${words.handOff}${letter ? ` ${letter}` : ''}".`);
    }
  }
  const workTime = findSection(blocks, 2, words.workTime);
  if (workTime) {
    for (const names of [words.stumbling, words.miniInputs, words.differentiation]) {
      if (!sectionsOf(blocks, 3).some((each) => each.start > workTime.start && each.start < workTime.end && names.includes(each.heading.text))) {
        problem(file, workTime.start, 'missing-section', `The section of the work time has no section "### ${names[0]}".`);
      }
    }
  }

  if (chapter) {
    const folder = dirname(chapter.file);
    const linked = new Set(fileLinks(blocks.lines, file).map((link) => link.file));
    for (const page of tutorials.filter((each) => dirname(each) === folder)) {
      if (!linked.has(page)) {
        problem(file, titleLine, 'walkthrough-link', `The walkthrough links no section of the tutorial page ${page}; each concept of a tutorial page is shown in an input.`);
      }
    }
  }
}

/**
 * checkCheatSheet adds the places where the cheat sheet differs from its form: its title, one section for each chapter
 * in the order of the chapters, the last paragraph of each section, and the limits of a section.
 * @param input - The files, the language and the chapters of the course.
 * @param file - The cheat sheet.
 * @param problem - Adds a problem at the index of a line of a file.
 */
function checkCheatSheet(input: PageInput, file: string, problem: (file: string, line: number, code: string, message: string) => void): void {
  const blocks = input.blocks(file);
  const name = input.language.cheatSheet;
  const title = blocks.headings.find((heading) => heading.level === 1);
  if (!title) {
    problem(file, 0, 'missing-title', `The cheat sheet has no heading "# ${name}".`);
  } else if (title.text !== name) {
    problem(file, title.line, 'title-form', `The heading of the first level of the cheat sheet is "# ${name}", not "# ${title.text}".`);
  }
  const last = input.chapters[input.chapters.length - 1];
  const seen = new Set<string>();
  let previous: string | undefined;
  for (const section of sectionsOf(blocks, 2)) {
    const heading = /^(.+?)\s+\((\d+)\)$/.exec(section.heading.text);
    if (!heading) {
      problem(file, section.start, 'cheat-sheet-section', `The heading "${section.heading.text}" does not have the form "<name of the chapter> (<number of the chapter>)".`);
      continue;
    }
    const [, text, number] = heading;
    const chapter = input.chapters.find((each) => each.number === number);
    if (!chapter) {
      problem(file, section.start, 'cheat-sheet-section', `No chapter of the course has the number ${number}.`);
    } else if (chapter.title !== text) {
      problem(file, section.start, 'cheat-sheet-section', `The name of chapter ${number} is "${chapter.title}", not "${text}".`);
    }
    if (previous !== undefined && compareNumbers(number, previous) <= 0) {
      problem(file, section.start, 'cheat-sheet-order', `The section of chapter ${number} stands after the section of chapter ${previous}; the sections follow the order of the chapters.`);
    }
    previous = number;
    seen.add(number);

    const part: Section = { ...section, end: sectionEnd(blocks, section) };
    const paragraphs = inSection(part, blocks.paragraphs);
    const docs = paragraphs.length > 0 && paragraphs[paragraphs.length - 1].text.startsWith('📖') ? paragraphs[paragraphs.length - 1] : undefined;
    if (!docs) {
      problem(file, section.start, 'cheat-sheet-link', `The section does not end with a paragraph "📖 [${number} – <name of the chapter>](<link to the README of the chapter>)".`);
    } else if (chapter) {
      const docsEnd = Math.min(part.end, ...blocks.headings.filter((each) => each.line > docs.line).map((each) => each.line));
      if (!fileLinks(blocks.lines.slice(docs.line, docsEnd), file, docs.line).some((link) => link.file === chapter.file)) {
        problem(file, docs.line, 'cheat-sheet-link', `The last paragraph of the section does not link the README of chapter ${number}, ${chapter.file}.`);
      }
    }
    const codes = inSection(part, blocks.codes);
    if (codes.length > cheatSheetLimits.codes) {
      problem(file, codes[cheatSheetLimits.codes].line, 'cheat-sheet-size', `The section has ${codes.length} code blocks, more than ${cheatSheetLimits.codes}.`);
    }
    for (const code of codes) {
      const lines = code.text === '' ? 0 : code.text.split('\n').length;
      if (lines > cheatSheetLimits.codeLines) {
        problem(file, code.line, 'cheat-sheet-size', `The code block has ${lines} lines, more than ${cheatSheetLimits.codeLines}.`);
      }
    }
    const tables = inSection(part, blocks.tables);
    const allowed = chapter && chapter === last ? cheatSheetLimits.tablesOfLastChapter : cheatSheetLimits.tables;
    if (tables.length > allowed) {
      problem(file, tables[allowed].line, 'cheat-sheet-size', `The section has ${tables.length} tables, more than ${allowed}.`);
    }
    for (const table of tables) {
      if (table.rows.length > cheatSheetLimits.rows) {
        problem(file, table.line, 'cheat-sheet-size', `The table has ${table.rows.length} rows, more than ${cheatSheetLimits.rows}.`);
      }
    }
    const items = inSection(part, blocks.items);
    if (items.length > cheatSheetLimits.items) {
      problem(file, items[cheatSheetLimits.items].line, 'cheat-sheet-size', `The section has ${items.length} items of a list, more than ${cheatSheetLimits.items}.`);
    }
    const lines = blocks.lines.slice(section.start + 1, docs?.line ?? part.end).filter((line) => line.trim() !== '').length;
    if (lines > cheatSheetLimits.lines) {
      problem(file, section.start, 'cheat-sheet-size', `The section has ${lines} lines without its blank lines and its last paragraph, more than ${cheatSheetLimits.lines}.`);
    }
  }
  for (const chapter of input.chapters) {
    if (!seen.has(chapter.number)) {
      problem(file, title?.line ?? 0, 'missing-section', `The cheat sheet has no section of chapter ${chapter.number}, "## ${chapter.title} (${chapter.number})".`);
    }
  }
}
