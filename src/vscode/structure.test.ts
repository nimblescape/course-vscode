// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCourse } from '../course/course';
import { courseNodes } from './structure';

const fixture = path.resolve(__dirname, '../../test/fixtures/course-de');

describe('the items of the view "Course"', () => {
  it('shows the chapters with their objectives and assignments, and each assignment with its parts and feedback', () => {
    const nodes = courseNodes({ folder: fixture, loaded: loadCourse(fixture) });
    expect(nodes.map((node) => node.label)).toEqual(['01 – Loops', '02 – Arrays']);
    const [objectives, count] = nodes[0].children!();
    expect(objectives.children!().map((node) => `${node.label} ${node.description}`)).toEqual([
      '01.1 K1 – Erinnern · Die Schüler:innen können die Teile einer `for`-Loop benennen.',
      '01.2 K3 – Anwenden · Die Schüler:innen können Zählschleifen einsetzen.',
      '01.3 K4 – Analysieren · Die Schüler:innen können Fehler in Loops analysieren.',
    ]);
    expect(count).toMatchObject({ label: '01.01 – Count', description: '50 %', contextValue: 'assignmentWithFeedback', feedback: path.join(fixture, '20-assignments/01-loops/01.01-count/FEEDBACK.md') });
    const parts = count.children!();
    expect(parts.map((node) => node.label)).toEqual(['Learning objectives', 'Requirements', 'Criteria', 'Feedback']);
    expect(parts[1].children!().map((node) => [node.label, node.line])).toEqual([
      ['R1', 36],
      ['R2', 37],
      ['R3', 39],
    ]);
    expect(parts[3]).toMatchObject({ description: '50 % · 03.11.2026 08:15', line: 33 });
  });
});
