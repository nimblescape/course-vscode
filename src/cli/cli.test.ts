// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { commentLines } from '../course/comment';
import { loadCourse, nodeFiles } from '../course/course';
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

describe('the command cs', () => {
  it('shows the help without a command, with exit code 2, and with --help, with exit code 0', () => {
    const run1 = io(nodeFiles, fixture);
    expect(run([], run1.io)).toBe(2);
    expect(run1.out.join('\n')).toContain('Usage: cs <command>');
    expect(run(['--help'], io(nodeFiles, fixture).io)).toBe(0);
  });

  it('shows the version of the command and of the format', () => {
    const each = io(nodeFiles, fixture);
    expect(run(['--version'], each.io)).toBe(0);
    expect(each.out[0]).toMatch(/^cs \d+\.\d+\.\d+, format nimblescape-course v1\.0\.0$/);
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

  it('prints the own rules of the course after the rules of the format, and lists the topics of the course', () => {
    const root = path.resolve('/course').split(path.sep).join('/');
    const files = memoryFiles({
      [`${root}/.course/course.yml`]: 'language: en\n',
      [`${root}/.course/instructions/all.md`]: '## Language\n\nAll code is English.\n',
      [`${root}/.course/instructions/chapter.md`]: '## Chapters\n\nEach chapter starts with a program to try.\n',
      [`${root}/.course/instructions/essentials.md`]: '# Essentials\n\nThe essentials come from another repository.\n',
    });
    const chapter = io(files, `${root}/10-course`);
    expect(run(['instructions', 'chapter'], chapter.io)).toBe(0);
    const text = chapter.out.join('\n');
    expect(text.indexOf('## 5. The README of a chapter')).toBeLessThan(text.indexOf('# The rules of this course'));
    expect(text.indexOf('All code is English.')).toBeLessThan(text.indexOf('Each chapter starts with a program to try.'));
    expect(text).toContain('Other topics: `course`, `assignment`');
    expect(text).toContain('`essentials`.');
    const assignment = io(files, root);
    expect(run(['instructions', 'assignment'], assignment.io)).toBe(0);
    expect(assignment.out.join('\n')).toContain('All code is English.');
    expect(assignment.out.join('\n')).not.toContain('Each chapter starts');
    const own = io(files, root);
    expect(run(['instructions', 'essentials'], own.io)).toBe(0);
    expect(own.out.join('\n')).toMatch(/^# The rules of this course/);
    expect(own.out.join('\n')).toContain('The essentials come from another repository.');
    const list = io(files, root);
    expect(run(['instructions'], list.io)).toBe(0);
    expect(list.out.join('\n')).toContain('Topics of this course, from .course/instructions/:');
    expect(list.out.join('\n')).toMatch(/ {2}essentials +Essentials/);
    expect(run(['instructions', 'all'], io(files, root).io)).toBe(2);
  });

  it('creates a new course whose files pass the checks, in English or in German', () => {
    for (const language of ['en', 'de']) {
      const root = path.resolve(`/new-${language}`).split(path.sep).join('/');
      const files = memoryFiles({});
      const each = io(files, path.dirname(root));
      expect(run(['create', `new-${language}`, ...(language === 'de' ? ['--language=de'] : [])], each.io)).toBe(0);
      expect(each.out).toContain(`new-${language}/.course/instructions/all.md: written`);
      const written = memoryFiles(Object.fromEntries(Object.entries(each.written).map(([file, text]) => [file.split(path.sep).join('/'), text])));
      const loaded = loadCourse(root, written);
      expect(loaded.problems).toEqual([]);
      expect(loaded.course).toMatchObject({ name: `new-${language}`, language, chapters: [], assignments: [] });
      expect(loaded.files.map((file) => file.kind).sort()).toEqual(['cheat-sheet', 'course', 'overview', 'overview', 'overview', 'overview', 'plan']);
    }
  });

  it('creates no course in a folder with a course, and keeps the files that exist', () => {
    const root = path.resolve('/course').split(path.sep).join('/');
    expect(run(['create', '.'], io(memoryFiles({ [`${root}/.course/course.yml`]: 'language: en\n' }), root).io)).toBe(2);
    const keep = io(memoryFiles({ [`${root}/README.md`]: '# Mine\n' }), root);
    expect(run(['create', '.', '--language', 'en'], keep.io)).toBe(0);
    expect(keep.out).toContain('README.md: kept, it exists');
    expect(keep.written[path.join(root, 'README.md')]).toBeUndefined();
    expect(run(['create', '.', '--language', 'fr'], io(memoryFiles({}), root).io)).toBe(2);
    expect(run(['create', '.', '--language'], io(memoryFiles({}), root).io)).toBe(2);
    expect(run(['create'], io(memoryFiles({}), root).io)).toBe(2);
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
