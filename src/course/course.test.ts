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

describe('the checks of the files for people', () => {
  /** pages are the files of a small course with a tutorial page, a walkthrough, the plan, the cheat sheet and the overviews. */
  const pages: Record<string, string> = {
    '.course/course.yml': 'course: test\nlanguage: en\n',
    'README.md': withHead('course', '# Test course'),
    '10-course/README.md': withHead('overview', '# Course Material\n\n- [Tutorials](10-tutorials/README.md)\n- [Walkthroughs](20-sessions/README.md)'),
    '10-course/10-tutorials/README.md': withHead('overview', '# Learning Path\n\n- [01 – One](01-one/README.md)'),
    '10-course/10-tutorials/01-one/README.md': withHead(
      'chapter',
      `# 01 – One

## Topic Overview

- Values

## Learning Objectives (Bloom's Taxonomy)

| No. | Learning objective | Description | Level |
| --- | --- | --- | --- |
| 01.1 | Name values. | Names. | K1 – Remember |

## Tutorials

- [01.01 – Values](01.01-values.md)

## Related Assignments

- None yet.

## Classroom Walkthrough

- [Walkthrough: One](../../20-sessions/01-one-session/README.md) – 1 double lesson`,
    ),
    '10-course/10-tutorials/01-one/01.01-values.md': withHead(
      'tutorial',
      `# Values

A value is a piece of data.

📺 _Video: coming soon._

## Numbers

A number.

## Common Mistakes

- Quotes around a number.

📖 MDN: [Data types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures)`,
    ),
    '10-course/20-sessions/README.md': withHead(
      'plan',
      `# Classroom Walkthroughs

## Course Plan

| Double lesson | Input | Students work on |
| --- | --- | --- |
| 1 | 01 | Setup |

About 1 double lesson.

## Walkthroughs

- [01 – One](01-one-session/README.md) – 1 double lesson`,
    ),
    '10-course/20-sessions/01-one-session/README.md': withHead(
      'walkthrough',
      `# Walkthrough: One

**Chapter:** [01 – One](../../10-tutorials/01-one/README.md)\\
**Double lessons:** 1 (double lesson 1 of the [course plan](../README.md#course-plan))\\
**Input:** Values (≈ 20 min)

## Learning Objectives

- Name values

## Before You Start

- Open the playground.

## Input – Values (≈ 20 min)

1. **Numbers** (≈ 15 min) – [01.01 › Numbers](../../10-tutorials/01-one/01.01-values.md#numbers)
   - Show: a number.
   - Point: a number has no quotes.
2. **Hand-off** (≈ 5 min) – see below.

### Hand-off

- Start the first assignment.

## During the Work Time

### Stumbling Blocks

- Quotes.

### Mini-Inputs on Demand (≤ 5 min)

- Numbers again.

### Differentiation

- Fast students: more numbers.

## Material

- [Chapter](../../10-tutorials/01-one/README.md)`,
    ),
    'reference-material/README.md': withHead('overview', '# Reference Material\n\n- [Cheat Sheet](10-cheat-sheet.md)'),
    'reference-material/10-cheat-sheet.md': withHead(
      'cheat-sheet',
      `# Cheat Sheet

Short notes for the assignments.

## One (01)

\`\`\`typescript
const count = 3; // a number
\`\`\`

| Value | Type |
| --- | --- |
| \`3\` | number |

- No quotes around a number.

📖 [01 – One](../10-course/10-tutorials/01-one/README.md) · MDN: [Numbers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)

---

_This project is licensed under the [CC BY-SA 4.0](../LICENSE)._`,
    ),
  };

  /**
   * pagesCourse returns the small course with changed files; a file with an empty text is left out.
   * @param changes - The changed files by their paths relative to the course.
   */
  const pagesCourse = (changes: Record<string, string> = {}) =>
    memoryFiles(Object.fromEntries(Object.entries({ ...pages, ...changes }).filter(([, text]) => text !== '').map(([file, text]) => [`${root}/${file}`, text])));

  const pageCodes = (changes: Record<string, string> = {}) => codes(pagesCourse(changes));

  it('finds no problem in the files of their forms, and gives each file its kind', () => {
    const loaded = loadCourse(root, pagesCourse());
    expect(loaded.problems).toEqual([]);
    expect(loaded.files.map((file) => `${file.file} ${file.kind}`)).toContain('10-course/10-tutorials/01-one/01.01-values.md tutorial');
    expect(loaded.files.map((file) => file.kind).sort()).toEqual(['chapter', 'cheat-sheet', 'course', 'overview', 'overview', 'overview', 'plan', 'tutorial', 'walkthrough']);
  });

  it('finds the files of the patterns without the comment of the format', () => {
    const tutorial = '10-course/10-tutorials/01-one/01.01-values.md';
    expect(pageCodes({ [tutorial]: pages[tutorial].split('\n').slice(commentLines('tutorial').length + 1).join('\n') })).toEqual([`${tutorial}:1 missing-comment`]);
  });

  it('reports a tutorial page without its video, with a wrong name, or without the links of its chapter and its walkthrough', () => {
    const tutorial = '10-course/10-tutorials/01-one/01.01-values.md';
    expect(pageCodes({ [tutorial]: pages[tutorial].replace('📺 _Video: coming soon._', '') })).toEqual([`${tutorial}:8 missing-video`]);
    expect(pageCodes({ '10-course/10-tutorials/01-one/02.01-more.md': pages[tutorial].replace('# Values', '# More') })).toEqual([
      '10-course/10-tutorials/01-one/02.01-more.md:1 page-name',
      '10-course/10-tutorials/01-one/README.md:20 tutorial-link',
      '10-course/20-sessions/01-one-session/README.md:8 walkthrough-link',
    ]);
  });

  it('reports a walkthrough without its head and its sections, a long input and an input without its hand-off', () => {
    const walkthrough = '10-course/20-sessions/01-one-session/README.md';
    const changed = pages[walkthrough]
      .replace('**Double lessons:** 1 (double lesson 1 of the [course plan](../README.md#course-plan))\\\n', '')
      .replace('## Input – Values (≈ 20 min)', '## Input – Values (≈ 35 min)')
      .replace('### Hand-off\n', '')
      .replace('### Differentiation\n', '')
      .replace('## Material', '## Links');
    expect(pageCodes({ [walkthrough]: changed })).toEqual([
      `${walkthrough}:8 missing-section`,
      `${walkthrough}:10 missing-head`,
      `${walkthrough}:21 input-time`,
      `${walkthrough}:21 missing-section`,
      `${walkthrough}:31 missing-section`,
    ]);
    expect(pageCodes({ [walkthrough]: pages[walkthrough].replace('**Chapter:** [01 – One](../../10-tutorials/01-one/README.md)', '**Chapter:** [01 – One](../../10-tutorials/02-two/README.md)') })).toEqual([
      `${walkthrough}:10 missing-chapter`,
    ]);
  });

  it('reports a course plan without its table of three columns, and an overview without the link to a file of its folder', () => {
    const plan = '10-course/20-sessions/README.md';
    expect(pageCodes({ [plan]: pages[plan].replace('| Double lesson | Input | Students work on |\n| --- | --- | --- |\n| 1 | 01 | Setup |', '| Double lesson | Input |\n| --- | --- |\n| 1 | 01 |') })).toEqual([
      `${plan}:12 plan-table`,
    ]);
    expect(pageCodes({ '10-course/20-sessions/02-two-session/notes.md': 'Notes', '10-course/20-sessions/03-three-session/README.md': '' })).toEqual([]);
    expect(pageCodes({ '10-course/10-tutorials/README.md': withHead('overview', '# Learning Path') })).toEqual(['10-course/10-tutorials/README.md:8 overview-link']);
  });

  it('reports a cheat sheet without a section of a chapter, with a section of no chapter, without its last paragraph, or over its limits', () => {
    const sheet = 'reference-material/10-cheat-sheet.md';
    expect(pageCodes({ [sheet]: pages[sheet].replace('## One (01)', '## Uno (01)').replace('📖 [01 – One](../10-course/10-tutorials/01-one/README.md) · ', '📖 ') })).toEqual([
      `${sheet}:12 cheat-sheet-section`,
      `${sheet}:24 cheat-sheet-link`,
    ]);
    expect(pageCodes({ [sheet]: pages[sheet].replace('## One (01)', '## Two (02)').replace('\n📖 [01 – One]', '\n- Two.\n- Three.\n- Four.\n- Five.\n\nMore.\n\n📖 [01 – One]') })).toEqual([
      `${sheet}:8 missing-section`,
      `${sheet}:12 cheat-sheet-section`,
      `${sheet}:27 cheat-sheet-size`,
    ]);
    expect(pageCodes({ [sheet]: pages[sheet].replace('\n📖 [01 – One](../10-course/10-tutorials/01-one/README.md) · MDN: [Numbers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)\n', '') })).toEqual([
      `${sheet}:12 cheat-sheet-link`,
    ]);
  });
});
