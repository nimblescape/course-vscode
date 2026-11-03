// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The instructions for AI agents
 * ([R-COURSE-005](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-005)): `cs instructions
 * <topic>` prints the rules of a topic, so that an agent reads the rules of the installed version without web access.
 * The source of the rules of the format is docs/format.md, which the build puts into the bundle, so the document on
 * GitHub and the printed rules are the same text. A topic prints the start of the document and its sections. After them
 * it prints the own rules of the course from the hidden folder .course/instructions/: `all.md` for every file and
 * `<topic>.md` for the topic. A course may also have topics of its own there. The module uses no API of VS Code.
 */

import * as path from 'node:path';
import format from '../../docs/format.md?raw';
import { type Files, nodeFiles } from './course';

/** Topic is a topic of the instructions. */
export interface Topic {
  name: string;
  summary: string;
  /** sections are the numbers of the sections of docs/format.md that the topic prints, after the start of the document. */
  sections: readonly number[];
}

/** topics are the topics of the instructions, in the order of the list. */
export const topics: readonly Topic[] = [
  { name: 'course', summary: 'the comment of the format, the settings and the own rules of a course, the README of the course, the checks', sections: [1, 2, 3, 4, 14] },
  { name: 'chapter', summary: 'the README of a chapter: its sections and the table of its learning objectives', sections: [1, 3, 5, 6, 14] },
  { name: 'assignment', summary: 'the README of an assignment: objectives, example, requirements, rules, criteria', sections: [1, 3, 7, 14] },
  { name: 'objectives', summary: 'the six levels of the revised taxonomy of Bloom, with their verbs', sections: [5, 6] },
  { name: 'feedback', summary: 'the feedback file FEEDBACK.md of an assignment', sections: [1, 3, 8] },
  { name: 'tutorial', summary: 'a tutorial page of a chapter: one topic with short explanations and examples', sections: [1, 3, 9, 14] },
  { name: 'walkthrough', summary: 'the walkthrough of a chapter for the teacher: inputs, hand-off, work time', sections: [1, 3, 10, 14] },
  { name: 'plan', summary: 'the README of the walkthroughs with the course plan', sections: [1, 3, 11, 14] },
  { name: 'cheat-sheet', summary: 'the cheat sheet: one short section of notes per chapter', sections: [1, 3, 12, 14] },
  { name: 'overview', summary: 'a README that leads to the files of its folder', sections: [1, 13, 14] },
];

/** rulesFolder is the folder of the own rules of a course, relative to the folder of the course. */
export const rulesFolder = '.course/instructions';

/** commonRules is the topic of the own rules of a course that `cs instructions` prints with every topic. */
export const commonRules = 'all';

/**
 * readCourseRules returns the own rules of a course by their topics: the text of each file `<topic>.md` of the folder
 * .course/instructions/ of the course. The rules of the topic `all` are for every file of the course.
 * @param folder - The folder of the course, an absolute path.
 * @param files - The files.
 */
export function readCourseRules(folder: string, files: Files = nodeFiles): Map<string, string> {
  const rules = new Map<string, string>();
  const rulesPath = path.join(folder, ...rulesFolder.split('/'));
  for (const entry of files.list(rulesPath).sort((a, b) => a.name.localeCompare(b.name))) {
    const topic = /^([a-z0-9][a-z0-9-]*)\.md$/.exec(entry.name)?.[1];
    const text = topic && !entry.folder ? files.read(path.join(rulesPath, entry.name)) : undefined;
    if (topic && text !== undefined) {
      rules.set(topic, text.replace(/\r\n?/g, '\n').trim());
    }
  }
  return rules;
}

/**
 * withoutHeader returns a document without its comment of the license at its start.
 * @param text - The document.
 */
const withoutHeader = (text: string): string => text.replace(/^<!--[\s\S]*?-->\s*/, '');

/**
 * documentParts returns the start of the document before its first numbered section, the numbered sections by their
 * numbers, and the section of the sources.
 * @param text - The document.
 */
function documentParts(text: string): { start: string; sections: Map<number, string>; sources: string } {
  const parts = withoutHeader(text).replace(/\r\n?/g, '\n').split(/^(?=## )/m);
  const sections = new Map<number, string>();
  let sources = '';
  for (const part of parts.slice(1)) {
    const number = /^## (\d+)\. /.exec(part)?.[1];
    if (number) {
      sections.set(Number(number), part.trimEnd());
    } else if (part.startsWith('## Sources')) {
      sources = part.trimEnd();
    }
  }
  return { start: parts[0].trimEnd(), sections, sources };
}

/**
 * ownTopics returns the topics of the own rules of a course that are no topics of the format, in the order of their
 * names.
 * @param rules - The own rules of the course.
 */
const ownTopics = (rules: ReadonlyMap<string, string>): string[] =>
  [...rules.keys()].filter((name) => name !== commonRules && !topics.some((topic) => topic.name === name)).sort();

/**
 * topicText returns the rules of a topic as Markdown, or undefined for a topic that neither the format nor the course
 * knows: the start of docs/format.md, the sections of the topic and the sources when a section cites one; then the own
 * rules of the course for every file and for the topic; then a line with the other topics.
 * @param name - The name of the topic.
 * @param rules - The own rules of the course by their topics, from readCourseRules.
 */
export function topicText(name: string, rules: ReadonlyMap<string, string> = new Map()): string | undefined {
  const topic = topics.find((each) => each.name === name);
  const own = name === commonRules ? undefined : rules.get(name);
  if (!topic && own === undefined) {
    return undefined;
  }
  const parts: string[] = [];
  if (topic) {
    const { start, sections, sources } = documentParts(format);
    const texts = topic.sections.map((number) => sections.get(number) ?? '').filter((text) => text !== '');
    const cites = texts.some((text) => text.includes('(Krathwohl, 2002'));
    parts.push(start, ...texts, ...(cites && sources ? [sources] : []));
  }
  const common = rules.get(commonRules);
  const ownParts = [common, own].filter((text): text is string => text !== undefined && text !== '');
  if (ownParts.length > 0) {
    parts.push(
      `# The rules of this course\n\nThese rules are the own rules of this course, from its folder \`${rulesFolder}/\`: \`${commonRules}.md\` for every file${own !== undefined ? ` and \`${name}.md\`` : ''}. They add to the rules of the format${topic ? ' above' : ''}; follow both.`,
      ...ownParts,
    );
  }
  const others = [...topics.map((each) => each.name), ...ownTopics(rules)].filter((each) => each !== name).map((each) => `\`${each}\``);
  parts.push(`Other topics: ${others.join(', ')}.`);
  return parts.join('\n\n') + '\n';
}

/**
 * summaryOf returns the summary of a file of the own rules of a course: the text of its first heading, or of its first
 * line.
 * @param text - The text of the file.
 */
const summaryOf = (text: string): string => {
  const lines = text.split('\n').filter((line) => line.trim() !== '' && !line.startsWith('<!--'));
  const heading = lines.find((line) => /^#{1,6}\s/.test(line));
  return (heading ?? lines[0] ?? '').replace(/^#{1,6}\s+/, '').trim();
};

/**
 * topicList returns the list of the topics, for `cs instructions` without a topic: the topics of the format, and the
 * topics of the own rules of the course.
 * @param command - The command that prints a topic.
 * @param rules - The own rules of the course by their topics, from readCourseRules.
 */
export function topicList(command: string, rules: ReadonlyMap<string, string> = new Map()): string {
  const width = Math.max(11, ...ownTopics(rules).map((name) => name.length + 1));
  const lines = ['Topics of the instructions:', '', ...topics.map((topic) => `  ${topic.name.padEnd(width)} ${topic.summary}`)];
  const own = ownTopics(rules);
  if (own.length > 0) {
    lines.push('', `Topics of this course, from ${rulesFolder}/:`, '', ...own.map((name) => `  ${name.padEnd(width)} ${summaryOf(rules.get(name) ?? '')}`));
  }
  if (rules.has(commonRules)) {
    lines.push('', `Each topic also prints the rules of this course for every file, ${rulesFolder}/${commonRules}.md.`);
  }
  lines.push('', `Print one: ${command} instructions <topic>`, `Start a new course: ${command} create <folder> [--language de|en]`);
  return lines.join('\n');
}
