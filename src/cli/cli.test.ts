// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { commentLines } from '../course/comment';
import { nodeFiles } from '../course/course';
import { memoryFiles } from '../course/memoryFiles';
import { type Io, run } from './cli';

const fixture = path.resolve(__dirname, '../../test/fixtures/course-de');

/**
 * io returns the files and streams of a run, with the lines that the run wrote.
 * @param files - The files.
 * @param cwd - The current folder.
 */
function io(files: Io['files'], cwd: string) {
  const out: string[] = [];
  const err: string[] = [];
  const written: Record<string, string> = {};
  return { out, err, written, io: { files, cwd, out: (line: string) => out.push(line), err: (line: string) => err.push(line), writeFile: (file: string, text: string) => (written[file] = text) } satisfies Io };
}

describe('the command course', () => {
  it('shows the help without a command, with exit code 2, and with --help, with exit code 0', () => {
    const run1 = io(nodeFiles, fixture);
    expect(run([], run1.io)).toBe(2);
    expect(run1.out.join('\n')).toContain('Usage: course <command>');
    expect(run(['--help'], io(nodeFiles, fixture).io)).toBe(0);
  });

  it('shows the version of the command and of the format', () => {
    const each = io(nodeFiles, fixture);
    expect(run(['--version'], each.io)).toBe(0);
    expect(each.out[0]).toMatch(/^course \d+\.\d+\.\d+, format nimblescape-course v1\.0\.0$/);
  });

  it('rejects an unknown command, an unknown option and a second operand', () => {
    expect(run(['lint'], io(nodeFiles, fixture).io)).toBe(2);
    expect(run(['check', '--fix'], io(nodeFiles, fixture).io)).toBe(2);
    expect(run(['read', 'a', 'b'], io(nodeFiles, fixture).io)).toBe(2);
  });

  it('prints the list of the topics and the rules of a topic', () => {
    const list = io(nodeFiles, fixture);
    expect(run(['instructions'], list.io)).toBe(0);
    expect(list.out.join('\n')).toContain('objectives');
    const topic = io(nodeFiles, fixture);
    expect(run(['instructions', 'objectives'], topic.io)).toBe(0);
    expect(topic.out.join('\n')).toContain('| K5 | Bewerten | Evaluate |');
    expect(run(['instructions', 'lesson'], io(nodeFiles, fixture).io)).toBe(2);
  });

  it('checks a course from a folder inside it, with the paths relative to the current folder', () => {
    const each = io(nodeFiles, path.join(fixture, '20-assignments'));
    expect(run(['check'], each.io)).toBe(1);
    expect(each.out).toEqual(['01-loops/01.01-count/FEEDBACK.md:1: The file has no comment of the format; the feedback program writes it: <!-- nimblescape-course v1.0.0 feedback spec=… [missing-comment]']);
    expect(each.err).toEqual(['6 files, 1 problem.']);
  });

  it('reads the course, an assignment, a chapter and a feedback file as JSON, with null for a missing value', () => {
    const course = io(nodeFiles, fixture);
    expect(run(['read'], course.io)).toBe(0);
    expect(JSON.parse(course.out.join('\n'))).toMatchObject({ name: 'demo', language: 'de', chapters: [{ number: '01' }, { number: '02' }] });
    const assignment = io(nodeFiles, fixture);
    expect(run(['read', '20-assignments/02-arrays/02.01-shopping-list'], assignment.io)).toBe(0);
    expect(JSON.parse(assignment.out.join('\n'))).toMatchObject({ number: '02.01', title: 'Shopping List', feedback: null });
    const chapter = io(nodeFiles, fixture);
    expect(run(['read', '10-course/10-tutorials/01-loops'], chapter.io)).toBe(0);
    expect(JSON.parse(chapter.out.join('\n'))).toMatchObject({ number: '01', title: 'Loops' });
    const feedback = io(nodeFiles, fixture);
    expect(run(['read', '20-assignments/01-loops/01.01-count/FEEDBACK.md'], feedback.io)).toBe(0);
    expect(JSON.parse(feedback.out.join('\n')).entries).toHaveLength(2);
    expect(run(['read', '10-course'], io(nodeFiles, fixture).io)).toBe(2);
  });

  it('writes the missing comments of the format, or reports them with --check', () => {
    const root = path.resolve('/course').split(path.sep).join('/');
    const files = memoryFiles({ [`${root}/.course/course.yml`]: 'language: en\n', [`${root}/README.md`]: '# Course\n' });
    const check = io(files, root);
    expect(run(['format', '--check'], check.io)).toBe(1);
    expect(check.out).toEqual(['README.md: needs the comment of the format']);
    expect(check.written).toEqual({});
    const write = io(files, root);
    expect(run(['format'], write.io)).toBe(0);
    expect(write.written[path.join(root, 'README.md')]).toBe([...commentLines('course'), '', '# Course', ''].join('\n'));
  });
});
