// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { commentLines } from './comment';
import { loadCourse, readAssignment, readCourse, readFeedback } from './course';
import { commentChanges } from './format';
import { memoryFiles } from './memoryFiles';
import type { Kind } from './types';

const fixture = path.resolve(__dirname, '../../test/fixtures/course-de');
const root = path.resolve('/course').split(path.sep).join('/');

/**
 * withHead returns the text of a file of a kind with the comment of the format before it.
 * @param kind - The kind of the file.
 * @param text - The text after the comment.
 */
const withHead = (kind: Kind, text: string): string => [...commentLines(kind), '', text].join('\n');

const chapter = (number: string, rows: string, extra = ''): string =>
  withHead(
    'chapter',
    `# ${number} – Thema

## Topic Overview

- A topic

## Learning Objectives (Bloom's Taxonomy)

| No. | Learning objective | Description | Level |
| --- | --- | --- | --- |
${rows}

## Tutorials

- [Tutorial](tutorial.md)

## Related Assignments

- [Assignment](../../../20-assignments/x/README.md)

## Classroom Walkthrough

- [Walkthrough](../../20-sessions/x/README.md)
${extra}`,
  );

const assignment = (body: string, objectives = '- [01.2](../../../10-course/10-tutorials/01-one/README.md#x) (K3 – Apply): Use it'): string =>
  withHead(
    'assignment',
    `# Assignment

**Counter** – Count things.

**Due Date:** TBA

**Chapter:** [01 – One](../../../10-course/10-tutorials/01-one/README.md)

## Learning Objectives

${objectives}

## Example Run

\`\`\`
1
\`\`\`

${body}`,
  );

const assignmentBody = `## Requirements

- [ ] A loop. (objective 01.2)

## Rules

- No list.

## Criteria

- **Loop:** It loops.`;

/**
 * course returns a course in the memory with English settings, one chapter and the given files.
 * @param extra - More files by their paths relative to the course.
 */
function course(extra: Record<string, string> = {}) {
  const texts: Record<string, string> = {
    [`${root}/.course/course.yml`]: 'course: test\nlanguage: en\n',
    [`${root}/README.md`]: withHead('course', '# Test course'),
    [`${root}/10-course/10-tutorials/01-one/README.md`]: chapter('01', '| 01.1 | Name things. | Names. | K1 – Remember |\n| 01.2 | Use things. | Use. | K3 – Apply |'),
  };
  for (const [file, text] of Object.entries(extra)) {
    texts[`${root}/${file}`] = text;
  }
  return memoryFiles(texts);
}

const codes = (files: ReturnType<typeof course>) => loadCourse(root, files).problems.map((problem) => `${problem.file}:${problem.line} ${problem.code}`);

describe('readCourse', () => {
  it('reads the chapters and assignments of a course with their objectives, requirements and feedback', () => {
    const read = readCourse(fixture);
    expect(read.name).toBe('demo');
    expect(read.language).toBe('de');
    expect(read.readme).toBe('README.md');
    expect(read.chapters.map((each) => `${each.number} ${each.title}`)).toEqual(['01 Loops', '02 Arrays']);
    expect(read.chapters[0].objectives.map((each) => [each.number, each.level, each.line])).toEqual([
      ['01.1', 1, 27],
      ['01.2', 3, 28],
      ['01.3', 4, 29],
    ]);
    expect(read.chapters[0].assignments).toEqual([{ text: '01.01 – Count', file: '20-assignments/01-loops/01.01-count/README.md', line: 37 }]);
    const [count, shopping] = read.assignments;
    expect(count.number).toBe('01.01');
    expect(count.title).toBe('Count');
    expect(count.chapter).toBe('01');
    expect(count.due).toBe('TBA');
    expect(count.workspace).toEqual(['workspace/main.ts']);
    expect(count.requirements.map((each) => [each.id, each.objectives, each.line])).toEqual([
      ['R1', ['01.2'], 36],
      ['R2', ['01.2'], 37],
      ['R3', [], 39],
    ]);
    expect(count.requirements[1].text).toBe('Die Summe steht in einer Variablen, die vor der Loop angelegt wird und in\nder Loop wächst.');
    expect(count.criteria.map((each) => `${each.id} ${each.name}`)).toEqual(['C1 Loop', 'C2 Ausgabe', 'C3 Codequalität']);
    expect(count.exampleRun).toBe('1\n2\n…\n10\nSumme: 55');
    expect(count.feedback?.entries.map((each) => [each.time, each.update, each.score, each.capped])).toEqual([
      ['02.11.2026 12:00', false, 50, false],
      ['03.11.2026 08:15', true, 50, true],
    ]);
    expect(shopping.requirements.map((each) => [each.id, each.group, each.objectives])).toEqual([
      ['R1', 'Teil A', ['02.2']],
      ['R2', 'Teil A', ['01.3', '02.2']],
      ['R3', 'Teil B', ['02.2']],
    ]);
    // The mark before a colon goes, the colon and the list of the item stay.
    expect(shopping.requirements[1].text).toBe('Eine Loop gibt jede Zeile aus:\n- der Name\n- der Preis mit zwei Nachkommastellen');
    expect(shopping.exampleRun).toContain('Am teuersten: Brot');
    expect(shopping.feedback).toBeUndefined();
  });

  it('finds the course of a folder inside it', () => {
    expect(readCourse(path.join(fixture, '20-assignments')).name).toBe('demo');
  });

  it('reports only the missing comment of the feedback file of the test course', () => {
    expect(loadCourse(fixture).problems.map((problem) => `${problem.file}:${problem.line} ${problem.code}`)).toEqual(['20-assignments/01-loops/01.01-count/FEEDBACK.md:1 missing-comment']);
  });
});

describe('readAssignment and readFeedback', () => {
  it('reads an assignment by its folder or its README, with the paths relative to the course', () => {
    const byFolder = readAssignment(path.join(fixture, '20-assignments/02-arrays/02.01-shopping-list'));
    expect(byFolder?.file).toBe('20-assignments/02-arrays/02.01-shopping-list/README.md');
    expect(readAssignment(path.join(fixture, '20-assignments/02-arrays/02.01-shopping-list/README.md'))?.number).toBe('02.01');
    expect(readAssignment(path.join(fixture, '10-course'))).toBeUndefined();
  });

  it('reads a feedback file in the language of its course', () => {
    const feedback = readFeedback(path.join(fixture, '20-assignments/01-loops/01.01-count/FEEDBACK.md'));
    expect(feedback?.file).toBe('20-assignments/01-loops/01.01-count/FEEDBACK.md');
    const [first, update] = feedback!.entries;
    expect(first.requirements.map((each) => `${each.id} ${each.status}`)).toEqual(['R1 met', 'R2 partly', 'R3 missing']);
    expect(first.requirements[2].text).toBe('Nach der Loop gibt das Programm `Summe: 55` aus.');
    expect(first.criteria.map((each) => `${each.id} ${each.name}: ${each.comment}`)).toEqual(['C1 Loop: Passt.', 'C2 Ausgabe: Zehn statt elf Zeilen.', 'C3 Codequalität: Sauber.']);
    expect(first.run).toBe('Das Programm läuft.');
    expect(first.commits).toBe(1);
    expect(update.changes).toBe('Du hast die Summe ergänzt.');
    expect(update.requirements.every((each) => each.status === 'met')).toBe(true);
    expect(update.line).toBe(33);
  });
});

describe('the checks of a course', () => {
  it('finds no problem in a course of its form', () => {
    expect(codes(course({ '20-assignments/01-one/01.01-counter/README.md': assignment(assignmentBody) }))).toEqual([]);
  });

  it('reports the files of the patterns without the comment of the format', () => {
    const files = course({ '20-assignments/01-one/01.01-counter/README.md': assignment(assignmentBody).split('\n').slice(7).join('\n') });
    expect(codes(files)).toEqual(['20-assignments/01-one/01.01-counter/README.md:1 missing-comment']);
  });

  it('reads a file by the kind of its comment, wherever it is', () => {
    const read = loadCourse(root, course({ 'other/place/deep/README.md': assignment(assignmentBody) }));
    expect(read.problems).toEqual([]);
    expect(read.course.assignments.map((each) => each.file)).toEqual(['other/place/deep/README.md']);
  });

  it('reports a missing section, a requirement outside the checklist and a criterion of another form', () => {
    const body = `## Requirements

- A loop. (objective 01.2)

## Criteria

- Loop: It loops.`;
    expect(codes(course({ '20-assignments/01-one/01.01-counter/README.md': assignment(body) }))).toEqual([
      '20-assignments/01-one/01.01-counter/README.md:8 missing-section',
      '20-assignments/01-one/01.01-counter/README.md:26 no-requirements',
      '20-assignments/01-one/01.01-counter/README.md:28 not-checklist',
      '20-assignments/01-one/01.01-counter/README.md:32 criterion-form',
    ]);
  });

  it('accepts an assignment without an example, a design reference, other sections and a list that describes the task', () => {
    const body = `## Your Task

Draw the memory.

## Requirements

### Part A

What the club needs:

- Each event has a title.
- Each event has a start.

- [ ] A loop. (objective 01.2)

## Optional Extensions

- A second loop.

## Rules

- No list.

## Criteria

- **Loop:** It loops.`;
    const without = assignment(body).replace(/## Example Run\n\n```\n1\n```\n\n/, '');
    expect(without).not.toContain('## Example Run');
    const files = course({ '20-assignments/01-one/01.01-counter/README.md': without, '20-assignments/01-one/01.02-page/README.md': assignment(assignmentBody).replace('## Example Run', '## Design Reference') });
    expect(codes(files)).toEqual([]);
    expect(loadCourse(root, files).course.assignments.map((each) => each.requirements.map((requirement) => requirement.text))).toEqual([['A loop.'], ['A loop.']]);
  });

  it('reports a list without boxes that no paragraph with a colon introduces', () => {
    const body = assignmentBody.replace('- [ ] A loop. (objective 01.2)', 'The page shows the list.\n\n- A title.\n\n- [ ] A loop. (objective 01.2)');
    expect(codes(course({ '20-assignments/01-one/01.01-counter/README.md': assignment(body) }))).toEqual(['20-assignments/01-one/01.01-counter/README.md:30 not-checklist']);
  });

  it('reports objectives that no chapter has, a level that differs, a later chapter and an objective named twice', () => {
    const objectives = [
      '- [01.9](../../../10-course/10-tutorials/01-one/README.md#x) (K3 – Apply): Unknown',
      '- [01.1](../../../10-course/10-tutorials/01-one/README.md#x) (K2 – Understand): Other level',
      '- [01.2](../../../10-course/10-tutorials/01-one/README.md#x) (K3 – Apply): Use it',
      '- [01.2](../../../10-course/10-tutorials/01-one/README.md#x) (K3 – Apply): Twice',
      '- [02.1](../../../10-course/10-tutorials/02-two/README.md#x) (K3 – Apply): Later',
    ].join('\n');
    const files = course({
      '10-course/10-tutorials/02-two/README.md': chapter('02', '| 02.1 | Use more. | More. | K3 – Apply |'),
      '20-assignments/01-one/01.01-counter/README.md': assignment(assignmentBody, objectives),
    });
    expect(codes(files)).toEqual([
      '20-assignments/01-one/01.01-counter/README.md:18 unknown-objective',
      '20-assignments/01-one/01.01-counter/README.md:19 level-differs',
      '20-assignments/01-one/01.01-counter/README.md:21 objective-twice',
      '20-assignments/01-one/01.01-counter/README.md:22 later-objective',
    ]);
  });

  it('reports marks outside the list, not sorted, with the wrong word or in the wrong place', () => {
    const objectives = [
      '- [01.1](../../../10-course/10-tutorials/01-one/README.md#x) (K1 – Remember): Name it',
      '- [01.2](../../../10-course/10-tutorials/01-one/README.md#x) (K3 – Apply): Use it',
    ].join('\n');
    const body = `## Requirements

- [ ] Unknown. (objective 01.3)
- [ ] Not sorted. (objectives 01.2, 01.1)
- [ ] Wrong word. (objectives 01.2)
- [ ] In the middle (objective 01.2) of the text.

## Rules

- Twice. (objectives 01.1, 01.1)

## Criteria

- **Loop:** It loops.`;
    expect(codes(course({ '20-assignments/01-one/01.01-counter/README.md': assignment(body, objectives) }))).toEqual([
      '20-assignments/01-one/01.01-counter/README.md:29 mark-unknown',
      '20-assignments/01-one/01.01-counter/README.md:30 mark-order',
      '20-assignments/01-one/01.01-counter/README.md:31 mark-form',
      '20-assignments/01-one/01.01-counter/README.md:32 mark-place',
      '20-assignments/01-one/01.01-counter/README.md:36 mark-form',
    ]);
  });

  it('reports levels outside K1 to K6, wrong names of levels, wrong numbers and numbers that two objectives share', () => {
    const files = course({
      '10-course/10-tutorials/02-two/README.md': chapter('02', '| 02.1 | A. | A. | K7 – Beyond |\n| 2.2 | B. | B. | K3 – Anwenden |\n| 03.3 | C. | C. | K3 |\n| 01.1 | D. | D. | K4 – Analyse |'),
    });
    expect(codes(files)).toEqual([
      '10-course/10-tutorials/02-two/README.md:18 level',
      '10-course/10-tutorials/02-two/README.md:19 objective-number',
      '10-course/10-tutorials/02-two/README.md:19 level',
      '10-course/10-tutorials/02-two/README.md:20 objective-number',
      '10-course/10-tutorials/02-two/README.md:20 level',
      '10-course/10-tutorials/02-two/README.md:21 objective-number',
      '10-course/10-tutorials/02-two/README.md:21 objective-twice',
    ]);
  });

  it('accepts both English names of K4', () => {
    const files = course({ '10-course/10-tutorials/02-two/README.md': chapter('02', '| 02.1 | A. | A. | K4 – Analyse |\n| 02.2 | B. | B. | K4 – Analyze |') });
    expect(codes(files)).toEqual([]);
  });

  it('reports a comment of an unknown kind, a comment after the text, and reads nothing of a newer major version', () => {
    const files = course({
      'notes/README.md': '<!-- nimblescape-course v1.0.0 lesson spec=x\n-->\n',
      'other/README.md': '# Text\n\n<!-- nimblescape-course v1.0.0 course spec=x\n-->\n',
      '20-assignments/01-one/01.01-counter/README.md': '<!-- nimblescape-course v2.0.0 assignment spec=x\n-->\n\n# Something else\n',
    });
    expect(codes(files)).toEqual([
      '20-assignments/01-one/01.01-counter/README.md:1 newer-format',
      'notes/README.md:1 comment-kind',
      'other/README.md:3 comment-place',
    ]);
  });

  it('reports the settings that it does not know', () => {
    const files = course();
    files.texts[`${root}/.course/course.yml`] = 'course: test\nlanguage: fr\ncolour: red\n';
    expect(codes(files)).toEqual(['.course/course.yml:1 settings', '.course/course.yml:1 settings']);
  });

  it('takes the language of the names of the sections without settings', () => {
    const files = course();
    delete files.texts[`${root}/.course/course.yml`];
    expect(loadCourse(root, files).course.language).toBe('en');
    expect(loadCourse(fixture).course.language).toBe('de');
  });
});

describe('commentChanges', () => {
  it('writes the comment into each README without one, and keeps a comment of the same version', () => {
    const files = course({ '20-assignments/01-one/01.01-counter/README.md': '# Assignment\n\nText\n' });
    const changes = commentChanges(root, files);
    expect(changes.map((change) => change.file)).toEqual(['20-assignments/01-one/01.01-counter/README.md']);
    expect(changes[0].text).toBe([...commentLines('assignment'), '', '# Assignment', '', 'Text', ''].join('\n'));
  });

  it('writes the comment of an older version anew, with its kind, and leaves the feedback files to the feedback program', () => {
    const files = course({
      '20-assignments/01-one/01.01-counter/README.md': '<!-- nimblescape-course v0.9.0 assignment spec=old\nOld words.\n-->\n\n# Assignment\n',
      '20-assignments/01-one/01.01-counter/FEEDBACK.md': '# Feedback: Counter – 02.11.2026 12:00\n',
    });
    const changes = commentChanges(root, files);
    expect(changes.map((change) => change.file)).toEqual(['20-assignments/01-one/01.01-counter/README.md']);
    expect(changes[0].text).toBe([...commentLines('assignment'), '', '# Assignment', ''].join('\n'));
  });
});
