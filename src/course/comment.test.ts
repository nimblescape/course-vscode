// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

import { describe, expect, it } from 'vitest';
import { commentLines, findComment, newerFormat, specUrl, withComment } from './comment';

describe('the comment of the format', () => {
  it('names the format, its version, the kind and the specification, and the command of the instructions of the kind', () => {
    const lines = commentLines('chapter');
    expect(lines[0]).toBe(`<!-- nimblescape-course v1.0.0 chapter spec=${specUrl}`);
    expect(lines).toContain('npx -y @nimblescape/course instructions chapter');
    expect(lines.at(-1)).toBe('-->');
    expect(lines.slice(0, -1).some((line) => line.includes('-->'))).toBe(false);
  });

  it('finds the comment after other comments at the start, and not in a code block', () => {
    const lines = ['<!-- nimblescape-markdownnotes v1.0.0 spec=x', 'words', '-->', '', ...commentLines('assignment'), '', '# Aufgabe'];
    expect(findComment(lines)).toMatchObject({ start: 4, end: 9, kind: 'assignment', atStart: true, version: { major: 1, minor: 0, patch: 0 } });
    expect(findComment(['```markdown', ...commentLines('assignment'), '```'])).toBeUndefined();
  });

  it('accepts the comment of Markdown Notes before or after it, and keeps it on a write', () => {
    const notes = ['<!-- nimblescape-markdownnotes v1.0.0 spec=x', 'words', '-->'];
    expect(findComment([...commentLines('chapter'), '', ...notes, '', '# 01 – Loops'])).toMatchObject({ start: 0, atStart: true });
    expect(findComment([...notes, '', ...commentLines('chapter'), '', '# 01 – Loops'])).toMatchObject({ start: 4, atStart: true });
    expect(withComment([...notes, '', '# 01 – Loops'], 'chapter')).toEqual([...commentLines('chapter'), '', ...notes, '', '# 01 – Loops']);
  });

  it('marks a comment after the text as not at the start, and keeps an unknown kind as its word', () => {
    expect(findComment(['# Title', '', '<!-- nimblescape-course v1.0.0 course spec=x', '-->'])?.atStart).toBe(false);
    expect(findComment(['<!-- nimblescape-course v1.0.0 lesson spec=x', '-->'])).toMatchObject({ kind: undefined, kindText: 'lesson' });
    expect(findComment(['<!-- nimblescape-course spec=x', '-->'])).toMatchObject({ kind: undefined, version: undefined, kindText: '' });
  });

  it('writes the comment at the start of a text without one, with a blank line after it', () => {
    expect(withComment(['# Aufgabe', '', 'Text'], 'assignment')).toEqual([...commentLines('assignment'), '', '# Aufgabe', '', 'Text']);
    expect(withComment(['', '# Aufgabe'], 'assignment')).toEqual([...commentLines('assignment'), '', '# Aufgabe']);
    expect(withComment([''], 'course')).toEqual([...commentLines('course')]);
  });

  it('writes a comment of an older version or without a version anew, with the kind that it names', () => {
    const old = ['<!-- nimblescape-course v0.1.0 chapter spec=old', 'old words', '-->', '', '# 01 – Loops'];
    expect(withComment(old, 'assignment')).toEqual([...commentLines('chapter'), '', '# 01 – Loops']);
    expect(withComment(['<!-- nimblescape-course spec=old', '-->', '# X'], 'course')).toEqual([...commentLines('course'), '# X']);
  });

  it('keeps a comment of the same or a higher version, also with other words', () => {
    expect(withComment(['<!-- nimblescape-course v1.0.0 chapter spec=x', 'other words', '-->', '', '# 01'], 'chapter')).toBeUndefined();
    expect(withComment(['<!-- nimblescape-course v1.2.0 chapter spec=x', '-->'], 'chapter')).toBeUndefined();
    expect(newerFormat(['<!-- nimblescape-course v2.0.0 chapter spec=x', '-->'])).toEqual({ major: 2, minor: 0, patch: 0 });
    expect(newerFormat(['<!-- nimblescape-course v1.9.0 chapter spec=x', '-->'])).toBeUndefined();
  });
});
