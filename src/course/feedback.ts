// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The reader of the feedback file of an assignment
 * ([R-FEED-001](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-feed-001),
 * [R-FEED-002](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-feed-002)): for the first feedback
 * and for each update, the time, the status of each requirement, the comment on each criterion, the program run, the
 * number of commits, the score, and whether a check capped the score. It also gives the places where the file differs
 * from its form. The module uses no API of VS Code.
 */

import type { Language } from './languages';
import { type Blocks, type Heading, inSection, type Section } from './markdown';
import type { Feedback, FeedbackCriterion, FeedbackEntry, FeedbackRequirement, Problem, Status } from './types';

/** statuses are the signs of the statuses of the requirements. */
const statuses: Readonly<Record<string, Status>> = { '✅': 'met', '⚠️': 'partly', '⚠': 'partly', '❌': 'missing' };

/** requirementItem matches the item of a requirement: the sign of its status, its number, its short text and the comment. */
const requirementItem = /^(✅|⚠️|⚠|❌)\s*\*\*(\d+)\.\s+([\s\S]*?)\*\*\s+[–-]\s+([\s\S]*)$/;

/** labelItem matches an item with a bold label: a criterion, the program run or the commits. */
const labelItem = /^\*\*([^*]+?):\*\*\s*([\s\S]*)$/;

/**
 * splitTime returns the text and the time of a heading of the form `<text> – <time>`.
 * @param text - The text of the heading.
 */
function splitTime(text: string): { text: string; time: string } {
  const at = text.lastIndexOf(' – ');
  return at < 0 ? { text, time: '' } : { text: text.slice(0, at).trim(), time: text.slice(at + 3).trim() };
}

/**
 * readFeedbackBlocks returns the feedback of the blocks of a feedback file, and the places where it differs from its form.
 * @param blocks - The blocks of the file.
 * @param file - The file, relative to the folder of the course.
 * @param language - The language of the course.
 */
export function readFeedbackBlocks(blocks: Blocks, file: string, language: Language): { feedback: Feedback; title: string | undefined; problems: Problem[] } {
  const problems: Problem[] = [];
  const problem = (line: number, code: string, message: string): void => {
    problems.push({ file, line: line + 1, code, message });
  };
  const words = language.feedback;
  const title = blocks.headings.find((heading) => heading.level === 1);
  const starts: { heading: Heading; update: boolean }[] = [];
  let assignmentTitle: string | undefined;
  if (!title || !title.text.startsWith(`${words.title}: `)) {
    problem(title?.line ?? 0, 'missing-title', `The feedback has no title "# ${words.title}: <title of the assignment> – <time>".`);
  } else {
    starts.push({ heading: title, update: false });
    assignmentTitle = splitTime(title.text.slice(words.title.length + 2)).text;
  }
  for (const heading of blocks.headings) {
    if (heading.level === 2 && heading.text.startsWith(`${words.update} – `)) {
      starts.push({ heading, update: true });
    }
  }

  const entries: FeedbackEntry[] = [];
  starts.forEach(({ heading, update }, index) => {
    const end = starts[index + 1]?.heading.line ?? blocks.lines.length;
    const level = update ? 3 : 2;
    const sectionOf = (name: string): Section | undefined => {
      const found = blocks.headings.find((each) => each.level === level && each.line > heading.line && each.line < end && each.text === name);
      if (!found) {
        return undefined;
      }
      const next = blocks.headings.find((each) => each.line > found.line && each.level <= level);
      return { heading: found, start: found.line, end: Math.min(next ? next.line : blocks.lines.length, end) };
    };
    const assessment = sectionOf(words.assessment);
    const summary = sectionOf(words.summary);
    for (const [name, section] of [[words.assessment, assessment], [words.bestPractices, sectionOf(words.bestPractices)], [words.suggestions, sectionOf(words.suggestions)], [words.summary, summary]] as const) {
      if (!section) {
        problem(heading.line, 'missing-section', `The section "${'#'.repeat(level)} ${name}" is missing.`);
      }
    }
    const requirements: FeedbackRequirement[] = [];
    const criteria: FeedbackCriterion[] = [];
    let run: string | undefined;
    let commits: number | undefined;
    for (const item of assessment ? inSection(assessment, blocks.items) : []) {
      const text = item.lines.map((line) => line.trim()).join(' ').trim();
      const requirement = requirementItem.exec(text);
      const label = labelItem.exec(text);
      if (requirement) {
        if (Number(requirement[2]) !== requirements.length + 1) {
          problem(item.line, 'feedback-number', `The item has the number ${requirement[2]}, not ${requirements.length + 1}: the items of the requirements are numbered from 1 in their order.`);
        }
        requirements.push({ id: `R${requirement[2]}`, status: statuses[requirement[1]], text: requirement[3].trim(), comment: requirement[4].trim() });
      } else if (label && label[1] === words.run) {
        run = label[2].trim();
      } else if (label && label[1] === words.commits) {
        commits = /^\d+$/.test(label[2].trim()) ? Number(label[2].trim()) : undefined;
      } else if (label) {
        criteria.push({ id: `C${criteria.length + 1}`, name: label[1].trim(), comment: label[2].trim() });
      } else {
        problem(item.line, 'feedback-item', 'The item of the assessment has neither the form "<status> **<n>. <text>** – <comment>" nor "**<name>:** <comment>".');
      }
    }
    let score: number | undefined;
    let capped = false;
    for (const paragraph of summary ? inSection(summary, blocks.paragraphs) : []) {
      const match = new RegExp(`^\\*\\*${words.score}: (\\d+) %\\*\\*`).exec(paragraph.text);
      if (match) {
        score = Number(match[1]);
      } else if (paragraph.text.startsWith('⚠')) {
        capped = true;
      }
    }
    if (summary && score === undefined) {
      problem(summary.start, 'missing-score', `The summary has no score "**${words.score}: <n> %**".`);
    }
    const firstSection = blocks.headings.find((each) => each.line > heading.line && each.level === level);
    const changes = update ? blocks.paragraphs.find((paragraph) => paragraph.line > heading.line && paragraph.line < (firstSection?.line ?? end))?.text : undefined;
    entries.push({
      time: splitTime(heading.text).time,
      update,
      changes,
      requirements,
      criteria,
      run,
      commits,
      score,
      capped,
      line: heading.line + 1,
    });
  });
  return { feedback: { file, entries }, title: assignmentTitle, problems };
}
