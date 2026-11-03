// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The blocks of a Markdown file that the reader of a course needs: the headings, the paragraphs, the items of the lists,
 * the tables and the code blocks at the top level of the file, each with its lines. markdown-it finds them, the parser
 * of the Markdown preview of VS Code, so that a heading inside a code block or a list in a quote does not count. The
 * module uses no API of VS Code.
 */

import MarkdownIt from 'markdown-it';

/** Heading is a heading at the top level of a file. */
export interface Heading {
  /** level is the level of the heading, 1 to 6. */
  level: number;
  /** text is the text of the heading, as written in the file. */
  text: string;
  /** line is the index of its line. */
  line: number;
}

/** Item is an item of a list at the top level of a file. */
export interface Item {
  /** line is the index of its first line. */
  line: number;
  /** checkbox is `' '` or `'x'` for an item of a checklist, or undefined. */
  checkbox: string | undefined;
  /** lines are the lines of the item without its marker and its checkbox, and without the indent of the item. */
  lines: string[];
  /** list is the index of the first line of the list of the item. */
  list: number;
}

/** Paragraph is a paragraph at the top level of a file. */
export interface Paragraph {
  /** line is the index of its first line. */
  line: number;
  /** text is the text of the paragraph, its lines joined with a space. */
  text: string;
}

/** Table is a table at the top level of a file. */
export interface Table {
  /** line is the index of its first line. */
  line: number;
  /** header are the texts of the cells of its header. */
  header: string[];
  /** rows are the rows of its body, each with the index of its line and the texts of its cells. */
  rows: { line: number; cells: string[] }[];
}

/** Code is a fenced code block at the top level of a file. */
export interface Code {
  /** line is the index of its first line. */
  line: number;
  /** text is the content of the block. */
  text: string;
}

/** Blocks are the blocks at the top level of a file. */
export interface Blocks {
  lines: string[];
  headings: Heading[];
  paragraphs: Paragraph[];
  items: Item[];
  tables: Table[];
  codes: Code[];
}

/** markdown is the parser: the defaults of markdown-it, with tables and HTML, as in the Markdown preview. */
const markdown = new MarkdownIt({ html: true });

/** listMarker matches the marker of an item of a list and the optional checkbox after it. */
const listMarker = /^(\s*)(?:[-*+]|\d+[.)])(?:[ \t]+|$)(?:\[([ xX])\](?:[ \t]+|$))?/;

/**
 * splitLines returns the lines of a text without their line breaks.
 * @param text - The text.
 */
export const splitLines = (text: string): string[] => text.replace(/\r\n?/g, '\n').split('\n');

/**
 * itemOf returns an item of a list from its lines in the file.
 * @param lines - The lines of the item, from its first line to its last line that is not blank.
 * @param line - The index of its first line.
 */
function itemOf(lines: string[], line: number, list: number): Item {
  const match = listMarker.exec(lines[0]) ?? ['', ''];
  const indent = match[0].length;
  const rest = lines.slice(1).map((text) => (text.slice(0, indent).trim() === '' ? text.slice(indent) : text.trimStart()));
  return { line, checkbox: match[2]?.toLowerCase(), lines: [lines[0].slice(indent), ...rest], list };
}

/**
 * blocksOf returns the blocks at the top level of a Markdown text.
 * @param text - The text.
 */
export function blocksOf(text: string): Blocks {
  const lines = splitLines(text);
  const tokens = markdown.parse(text, {});
  const blocks: Blocks = { lines, headings: [], paragraphs: [], items: [], tables: [], codes: [] };
  let table: Table | undefined;
  let row: { line: number; cells: string[] } | undefined;
  let inHeader = false;
  let list = 0;
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const map = token.map;
    if (token.type === 'heading_open' && token.level === 0 && map) {
      blocks.headings.push({ level: Number(token.tag.slice(1)), text: tokens[index + 1].content.trim(), line: map[0] });
    } else if (token.type === 'paragraph_open' && token.level === 0 && map) {
      blocks.paragraphs.push({ line: map[0], text: tokens[index + 1].content.split('\n').map((part) => part.trim()).join(' ') });
    } else if ((token.type === 'bullet_list_open' || token.type === 'ordered_list_open') && token.level === 0 && map) {
      list = map[0];
    } else if (token.type === 'list_item_open' && token.level === 1 && map) {
      let end = map[1];
      while (end > map[0] + 1 && lines[end - 1].trim() === '') {
        end--;
      }
      blocks.items.push(itemOf(lines.slice(map[0], end), map[0], list));
    } else if (token.type === 'fence' && token.level === 0 && map) {
      blocks.codes.push({ line: map[0], text: token.content.replace(/\n$/, '') });
    } else if (token.type === 'table_open' && token.level === 0 && map) {
      table = { line: map[0], header: [], rows: [] };
      blocks.tables.push(table);
    } else if (token.type === 'table_close' && token.level === 0) {
      table = undefined;
    } else if (table && token.type === 'thead_open') {
      inHeader = true;
    } else if (table && token.type === 'thead_close') {
      inHeader = false;
    } else if (table && token.type === 'tr_open' && map) {
      row = { line: map[0], cells: [] };
      if (!inHeader) {
        table.rows.push(row);
      }
    } else if (table && row && token.type === 'inline') {
      (inHeader ? table.header : row.cells).push(token.content.trim());
    }
  }
  return blocks;
}

/** Section is the part of a file under a heading, to the next heading of the same or a higher level. */
export interface Section {
  heading: Heading;
  /** start is the index of the line of the heading. */
  start: number;
  /** end is the index of the first line after the section. */
  end: number;
}

/**
 * sectionsOf returns the sections of the headings of a level.
 * @param blocks - The blocks of the file.
 * @param level - The level of the headings.
 */
export function sectionsOf(blocks: Blocks, level: number): Section[] {
  const headings = blocks.headings.filter((heading) => heading.level === level);
  return headings.map((heading) => {
    const next = blocks.headings.find((other) => other.line > heading.line && other.level <= level);
    return { heading, start: heading.line, end: next ? next.line : blocks.lines.length };
  });
}

/**
 * findSection returns the first section of a level whose heading has one of the names, or undefined.
 * @param blocks - The blocks of the file.
 * @param level - The level of the heading.
 * @param names - The names of the section.
 */
export const findSection = (blocks: Blocks, level: number, names: readonly string[]): Section | undefined =>
  sectionsOf(blocks, level).find((section) => names.includes(section.heading.text));

/**
 * inSection returns the blocks of a kind that start inside a section, after its heading.
 * @param section - The section.
 * @param items - The blocks.
 */
export const inSection = <T extends { line: number }>(section: Section, items: readonly T[]): T[] =>
  items.filter((item) => item.line > section.start && item.line < section.end);

/**
 * firstParagraph returns the lines of the first paragraph of an item: its lines up to a blank line, a nested list or a
 * code block.
 * @param item - The item.
 */
export function firstParagraph(item: Item): string[] {
  const end = item.lines.findIndex((line, index) => index > 0 && (line.trim() === '' || listMarker.test(line) || /^\s*(```|~~~)/.test(line)));
  return item.lines.slice(0, end < 0 ? item.lines.length : end);
}

/** inlineLink matches a link of Markdown: its text and its target. */
export const inlineLink = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/;

/**
 * describes tells whether an item of a list without a box describes a task: whether the block before its list is a
 * paragraph that ends with a colon, as in "What the clubs need:".
 * @param blocks - The blocks of the file.
 * @param item - The item.
 */
export function describes(blocks: Blocks, item: Item): boolean {
  const before = [
    ...blocks.paragraphs.map((paragraph) => ({ line: paragraph.line, colon: paragraph.text.trimEnd().endsWith(':') })),
    ...[...blocks.headings, ...blocks.codes, ...blocks.tables].map((block) => ({ line: block.line, colon: false })),
    ...blocks.items.map((each) => ({ line: each.line, colon: false })),
  ].filter((block) => block.line < item.list);
  const last = before.reduce<{ line: number; colon: boolean } | undefined>((found, block) => (!found || block.line > found.line ? block : found), undefined);
  return last?.colon === true;
}
