// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The tests of the built command cs (npm run test:cli): they run cli/dist/cs.js with the Node.js of the tests,
// as npx runs it after an installation of the npm package, and load the library cli/dist/index.js as a program does.

import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const bundle = path.join(root, 'cli/dist/cs.js');
const fixture = path.join(root, 'test/fixtures/course-de');

describe('the built command cs', () => {
  it('prints the rules of a topic', () => {
    expect(execFileSync(process.execPath, [bundle, 'instructions', 'assignment'], { encoding: 'utf8' })).toContain('## 7. The README of an assignment');
  });

  it('checks the test course and exits with 1 for its one problem', () => {
    const result = spawnSync(process.execPath, [bundle, 'check'], { cwd: fixture, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('[missing-comment]');
    expect(result.stderr).toBe('6 files, 1 problem.\n');
  });

  it('reads an assignment as JSON', () => {
    const json = JSON.parse(execFileSync(process.execPath, [bundle, 'read', '20-assignments/01-loops/01.01-count'], { cwd: fixture, encoding: 'utf8' }));
    expect(json.requirements.map((requirement: { id: string }) => requirement.id)).toEqual(['R1', 'R2', 'R3']);
  });

  it('writes the comments of the format into a copy of a course without them', () => {
    const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'course-'));
    try {
      fs.cpSync(fixture, copy, { recursive: true });
      const readme = path.join(copy, '20-assignments/02-arrays/02.01-shopping-list/README.md');
      fs.writeFileSync(readme, fs.readFileSync(readme, 'utf8').split('\n').slice(7).join('\n'));
      expect(spawnSync(process.execPath, [bundle, 'format', '--check'], { cwd: copy }).status).toBe(1);
      expect(spawnSync(process.execPath, [bundle, 'format'], { cwd: copy }).status).toBe(0);
      expect(fs.readFileSync(readme, 'utf8').startsWith('<!-- nimblescape-course v1.1.0 assignment spec=')).toBe(true);
      expect(spawnSync(process.execPath, [bundle, 'format', '--check'], { cwd: copy }).status).toBe(0);
    } finally {
      fs.rmSync(copy, { recursive: true, force: true });
    }
  });

  it('creates a new course with its folders, which passes the checks and prints its own rules', () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'course-'));
    try {
      const created = spawnSync(process.execPath, [bundle, 'create', 'new-course', '--language', 'de'], { cwd: parent, encoding: 'utf8' });
      expect(created.status).toBe(0);
      const folder = path.join(parent, 'new-course');
      expect(fs.readFileSync(path.join(folder, '.course/course.yml'), 'utf8')).toContain('course: new-course\nlanguage: de\n');
      expect(spawnSync(process.execPath, [bundle, 'check'], { cwd: folder, encoding: 'utf8' }).stderr).toBe('7 files, no problems.\n');
      fs.appendFileSync(path.join(folder, '.course/instructions/all.md'), '\nAll code is English.\n');
      expect(execFileSync(process.execPath, [bundle, 'instructions', 'chapter'], { cwd: path.join(folder, '10-course'), encoding: 'utf8' })).toContain('All code is English.');
      expect(spawnSync(process.execPath, [bundle, 'create', 'new-course'], { cwd: parent }).status).toBe(2);
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });

  it('gives the library to a program', () => {
    const script = `const course = require(${JSON.stringify(path.join(root, 'cli/dist/index.js'))}); console.log(JSON.stringify(course.readCourse(${JSON.stringify(fixture)}).chapters.map((c) => c.number)));`;
    expect(execFileSync(process.execPath, ['-e', script], { encoding: 'utf8' }).trim()).toBe('["01","02"]');
    const rules = `const course = require(${JSON.stringify(path.join(root, 'cli/dist/index.js'))}); console.log(course.topicText('tutorial').includes('## 9. A tutorial page'));`;
    expect(execFileSync(process.execPath, ['-e', rules], { encoding: 'utf8' }).trim()).toBe('true');
  });
});
