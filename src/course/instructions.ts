// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The instructions for AI agents
 * ([R-COURSE-005](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-005)): `course instructions
 * <topic>` prints the rules of a topic, so that an agent reads the rules of the installed version without web access.
 * The source of the rules is docs/format.md, which the build puts into the bundle, so the document on GitHub and the
 * printed rules are the same text. A topic prints the start of the document and its sections. The module uses no API of
 * VS Code.
 */

import format from '../../docs/format.md?raw';

/** Topic is a topic of the instructions. */
export interface Topic {
  name: string;
  summary: string;
  /** sections are the numbers of the sections of docs/format.md that the topic prints, after the start of the document. */
  sections: readonly number[];
}

/** topics are the topics of the instructions, in the order of the list. */
export const topics: readonly Topic[] = [
  { name: 'course', summary: 'the comment of the format, the settings in .course/course.yml, the README of the course, the checks', sections: [1, 2, 3, 4, 9] },
  { name: 'chapter', summary: 'the README of a chapter: its sections and the table of its learning objectives', sections: [1, 3, 5, 6, 9] },
  { name: 'assignment', summary: 'the README of an assignment: objectives, example run, requirements, rules, criteria', sections: [1, 3, 7, 9] },
  { name: 'objectives', summary: 'the six levels of the revised taxonomy of Bloom, with their verbs', sections: [5, 6] },
  { name: 'feedback', summary: 'the feedback file FEEDBACK.md of an assignment', sections: [1, 3, 8] },
];

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
 * topicText returns the rules of a topic as Markdown, or undefined for an unknown topic: the start of docs/format.md,
 * the sections of the topic, the sources when a section cites one, and a line with the other topics.
 * @param name - The name of the topic.
 */
export function topicText(name: string): string | undefined {
  const topic = topics.find((each) => each.name === name);
  if (!topic) {
    return undefined;
  }
  const { start, sections, sources } = documentParts(format);
  const texts = topic.sections.map((number) => sections.get(number) ?? '').filter((text) => text !== '');
  const cites = texts.some((text) => text.includes('(Krathwohl, 2002'));
  const others = topics.filter((each) => each !== topic).map((each) => `\`${each.name}\``);
  return [start, ...texts, ...(cites && sources ? [sources] : []), `Other topics: ${others.join(', ')}.`].join('\n\n') + '\n';
}

/**
 * topicList returns the list of the topics, for `course instructions` without a topic.
 * @param command - The command that prints a topic.
 */
export const topicList = (command: string): string =>
  ['Topics of the instructions:', '', ...topics.map((topic) => `  ${topic.name.padEnd(11)} ${topic.summary}`), '', `Print one: ${command} instructions <topic>`].join('\n');
