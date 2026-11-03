// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The writer of the feedback file of an assignment, for the feedback program
 * ([R-FEED-001](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-feed-001)): the form of the answer
 * that an AI model gives on the work of a student, the check of that answer, the score, and the text of `FEEDBACK.md`
 * in the form of section 8 of the format. The command `cs feedback` runs it, so that the form of `FEEDBACK.md` lives
 * only in this package. The module uses no API of VS Code.
 */

import { commentLines, findComment, withComment } from './comment';
import type { Language } from './languages';
import type { Assignment, Status } from './types';

/** maxSuggestions is the highest number of suggestions of an answer. */
export const maxSuggestions = 3;

/** halfPoints are the points of each status, in half points: met 1, partly ½, missing 0. */
const halfPoints: Readonly<Record<Status, number>> = { met: 2, partly: 1, missing: 0 };

/** icons are the signs of the statuses in the feedback file. */
const icons: Readonly<Record<Status, string>> = { met: '✅', partly: '⚠️', missing: '❌' };

/** Answer is the answer of an AI model on the work of a student, in the form that `cs feedback --form` prints. */
export interface Answer {
  requirements: { id: string; status: Status; comment: string }[];
  criteria: { id: string; comment: string }[];
  run: string;
  best_practices: { rating: 'good' | 'improve'; topic: string; text: string }[];
  suggestions: { text: string; code?: string; language?: string }[];
  changes?: string;
  summary: string;
}

/** AnswerError is an answer that does not have the form of the answer. */
export class AnswerError extends Error {}

/**
 * pythonJson returns an object as JSON on one line with a blank after each comma and colon.
 * @param value - The object.
 */
const pythonJson = (value: Record<string, string>): string =>
  `{${Object.entries(value)
    .map(([key, each]) => `${JSON.stringify(key)}: ${JSON.stringify(each)}`)
    .join(', ')}}`;

/**
 * fenced returns a fenced code block of a text that no run of backticks in the text can close.
 * @param text - The text of the block.
 * @param language - The language of the block, or an empty text.
 */
export function fenced(text: string, language = ''): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}${language}\n${text.trimEnd()}\n${fence}`;
}

/**
 * oneLine returns a text of the answer as one line, without the marks of a heading at its start.
 * @param value - The text.
 */
export const oneLine = (value: string): string => value.replace(/\s+/g, ' ').trim().replace(/^#+/, '').trim();

/**
 * shortText returns the first sentence of a requirement without bold marks, cut at a blank outside inline code when it
 * is longer than the limit. The text ends before its first blank line or nested list.
 * @param text - The text of the requirement.
 * @param limit - The highest number of characters before the cut.
 */
export function shortText(text: string, limit = 90): string {
  const lines: string[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '' || line.trimStart().startsWith('- ')) {
      break;
    }
    lines.push(line.trim());
  }
  const first = lines.join(' ').replace(/\*\*|__/g, '');
  let inCode = false;
  let cut = 0;
  const chars = Array.from(first);
  for (let index = 0; index < chars.length; index++) {
    const char = chars[index];
    if (char === '`') {
      inCode = !inCode;
    } else if (char === '.' && !inCode && (index + 1 === chars.length || chars[index + 1] === ' ')) {
      return index < limit ? chars.slice(0, index + 1).join('') : `${chars.slice(0, cut || limit).join('')} …`;
    } else if (char === ' ' && !inCode && index <= limit) {
      cut = index;
    }
  }
  return chars.length <= limit ? first : `${chars.slice(0, cut || limit).join('')} …`;
}

/**
 * answerForm returns the instructions of the form of the answer for the prompt of an AI model: the JSON object with
 * each requirement and criterion of the assignment, and the rules of its fields.
 * @param assignment - The assignment.
 * @param update - Whether the feedback is an update of an earlier feedback.
 */
export function answerForm(assignment: Assignment, update: boolean): string {
  const items = (values: Record<string, string>[]): string => `[\n${values.map((value) => `    ${pythonJson(value)}`).join(',\n')}\n  ]`;
  const requirements = assignment.requirements.length;
  const criteria = assignment.criteria.length;
  const example = [
    '{',
    `  "requirements": ${items(assignment.requirements.map((each) => ({ id: each.id, comment: '…', status: 'met | partly | missing' })))},`,
    `  "criteria": ${items(assignment.criteria.map((each) => ({ id: each.id, comment: '…' })))},`,
    '  "run": "…",',
    `  "best_practices": ${items([{ rating: 'good | improve', topic: '…', text: '…' }])},`,
    `  "suggestions": ${items([{ text: '…', code: '…', language: 'typescript' }])},`,
    `  "changes": "${update ? '…' : ''}",`,
    '  "summary": "…"',
    '}',
  ].join('\n');
  return [
    '# Your Answer',
    '',
    'Answer with this JSON object and nothing else – no text before or after it:',
    '',
    fenced(example, 'json'),
    '',
    `- \`requirements\`: every id from R1 to R${requirements} exactly once, in this order. Write the \`comment\` first, one`,
    '  sentence that says why, then the `status` that it supports: a comment that names something missing,',
    '  wrong or against a rule of the README means `partly` or `missing`, never `met`.',
    criteria > 0
      ? `- \`criteria\`: every id from C1 to C${criteria} exactly once, each with a \`comment\` of one sentence that judges in words.`
      : '- `criteria`: an empty list.',
    '- `run`: one sentence on what the checks show compared with the README (example run, expected output or',
    '  design reference).',
    '- `best_practices`: at least one entry, one for each topic of a best practice that has something to say;',
    '  `rating` is `good` (✅, done well) or `improve` (💡, could be improved).',
    `- \`suggestions\`: at most ${maxSuggestions} concrete improvements, the most important first, each with a short code example`,
    '  where it helps; `code` and `language` may be empty.',
    update
      ? '- `changes`: required, this is an update: one or two sentences on what changed since the earlier feedback,\n  praising concrete improvements.'
      : '- `changes`: an empty string.',
    '- `summary`: one or two encouraging sentences, without a score or a percentage.',
  ].join('\n');
}

/**
 * parseAnswer returns the answer of an AI model from its text, a JSON object, also inside a fenced block or with text
 * around it. It throws an AnswerError when the answer does not have its form.
 * @param text - The text of the answer.
 * @param assignment - The assignment.
 * @param update - Whether the feedback is an update of an earlier feedback.
 */
export function parseAnswer(text: string, assignment: Assignment, update: boolean): Answer {
  const fence = /```(?:json)?\s*\n([\s\S]*?)\n```/.exec(text);
  const body = fence ? fence[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end < start) {
    throw new AnswerError('no JSON object');
  }
  let answer: unknown;
  try {
    answer = JSON.parse(body.slice(start, end + 1));
  } catch (error) {
    throw new AnswerError(`invalid JSON: ${(error as Error).message}`);
  }
  if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) {
    throw new AnswerError('the answer is not a JSON object');
  }
  const fields = answer as Record<string, unknown>;
  const list = (key: string, minimum = 0, maximum = Infinity): Record<string, unknown>[] => {
    const value = fields[key];
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item))) {
      throw new AnswerError(`\`${key}\` is not a list of objects`);
    }
    if (value.length < minimum || value.length > maximum) {
      throw new AnswerError(`\`${key}\` has ${value.length} entries`);
    }
    return value as Record<string, unknown>[];
  };
  const textField = (item: Record<string, unknown>, key: string, required = true): string => {
    const value = item[key] ?? '';
    if (typeof value !== 'string' || (required && value.trim() === '')) {
      throw new AnswerError(`\`${key}\` is missing or empty`);
    }
    return value;
  };

  const requirementIds = assignment.requirements.map((each) => each.id);
  const requirements = list('requirements');
  const found = requirements.map((item) => item.id);
  if (JSON.stringify(found) !== JSON.stringify(requirementIds)) {
    throw new AnswerError(`requirement ids ${JSON.stringify(found)} instead of ${JSON.stringify(requirementIds)}`);
  }
  for (const item of requirements) {
    if (typeof item.status !== 'string' || !(item.status in halfPoints)) {
      throw new AnswerError(`status ${JSON.stringify(item.status)} of ${String(item.id)}`);
    }
    textField(item, 'comment');
  }
  const criterionIds = assignment.criteria.map((each) => each.id);
  const criteria = list('criteria');
  const foundCriteria = criteria.map((item) => String(item.id ?? ''));
  if (JSON.stringify([...foundCriteria].sort()) !== JSON.stringify([...criterionIds].sort())) {
    throw new AnswerError(`criteria ids ${JSON.stringify(criteria.map((item) => item.id))} instead of ${JSON.stringify(criterionIds)}`);
  }
  for (const item of criteria) {
    textField(item, 'comment');
  }
  for (const item of list('best_practices', 1)) {
    if (item.rating !== 'good' && item.rating !== 'improve') {
      throw new AnswerError(`rating ${JSON.stringify(item.rating)}`);
    }
    textField(item, 'topic');
    textField(item, 'text');
  }
  for (const item of list('suggestions', 0, maxSuggestions)) {
    textField(item, 'text');
    textField(item, 'code', false);
    textField(item, 'language', false);
  }
  textField(fields, 'run');
  const summary = textField(fields, 'summary');
  if (/\d\s*%/.test(summary)) {
    throw new AnswerError('the summary contains a percentage; the score is added to it');
  }
  if (update) {
    textField(fields, 'changes');
  }
  return answer as Answer;
}

/**
 * scoreOf returns the score in percent from the statuses of the requirements, rounded half up: met 1 point, partly ½,
 * missing 0, divided by the number of requirements; at most 50 % when the work does not run.
 * @param statuses - The statuses of the requirements.
 * @param capped - Whether a check found that the work does not run.
 */
export function scoreOf(statuses: readonly Status[], capped: boolean): number {
  if (statuses.length === 0) {
    return 0;
  }
  const points = statuses.reduce((sum, status) => sum + halfPoints[status], 0);
  const percent = Math.floor((points * 100 + statuses.length) / (2 * statuses.length));
  return capped ? Math.min(percent, 50) : percent;
}

/** FeedbackInput is what the text of a feedback needs besides the answer. */
export interface FeedbackInput {
  answer: Answer;
  assignment: Assignment;
  language: Language;
  /** time is the time of the feedback, `DD.MM.YYYY HH:MM`. */
  time: string;
  /** commits is the number of the commits of the student in `workspace/`. */
  commits: number;
  /** notRunning are the reasons why the work does not run, in the language of the course; empty when it runs. */
  notRunning: readonly string[];
  update: boolean;
}

/**
 * feedbackPart returns the text of the first feedback or of an update, and its score.
 * @param input - The answer and what the text needs besides it.
 */
export function feedbackPart(input: FeedbackInput): { text: string; score: number } {
  const { answer, assignment, update } = input;
  const words = input.language.feedback;
  const h2 = update ? '###' : '##';
  const out: string[] = [];
  if (update) {
    out.push('---', '', `## ${words.update} – ${input.time}`, '', oneLine(answer.changes ?? ''), '');
  } else {
    out.push(`# ${words.title}: ${assignment.title} – ${input.time}`, '');
  }
  out.push(`${h2} ${words.assessment}`, '');
  answer.requirements.forEach((item, index) => {
    out.push(`- ${icons[item.status]} **${index + 1}. ${shortText(assignment.requirements[index].text)}** – ${oneLine(item.comment)}`);
  });
  out.push('');
  const comments = new Map(answer.criteria.map((item) => [item.id, item.comment]));
  for (const criterion of assignment.criteria) {
    out.push(`- **${criterion.name}:** ${oneLine(comments.get(criterion.id) ?? '')}`);
  }
  out.push(`- **${words.run}:** ${oneLine(answer.run)}`, `- **${words.commits}:** ${input.commits}`, '');
  out.push(`${h2} ${words.bestPractices}`, '');
  for (const item of answer.best_practices) {
    out.push(`- ${item.rating === 'good' ? '✅' : '💡'} **${oneLine(item.topic)}:** ${oneLine(item.text)}`);
  }
  out.push('', `${h2} ${words.suggestions}`, '');
  for (const item of answer.suggestions) {
    out.push(`💡 ${oneLine(item.text)}`, '');
    if ((item.code ?? '').trim() !== '') {
      out.push(fenced(item.code ?? '', String(item.language ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')), '');
    }
  }
  if (answer.suggestions.length === 0) {
    out.push(words.noSuggestions, '');
  }
  out.push(`${h2} ${words.summary}`, '');
  const capped = input.notRunning.length > 0;
  if (capped) {
    out.push(`⚠️ ${words.capped.replace('{reasons}', input.notRunning.join(', '))}`, '');
  }
  const score = scoreOf(
    answer.requirements.map((item) => item.status),
    capped,
  );
  out.push(`**${words.score}: ${score} %** – ${oneLine(answer.summary)}`, '');
  return { text: out.join('\n'), score };
}

/**
 * feedbackFile returns the new text of the feedback file: the comment of the format and the first feedback, or the
 * earlier text with the update after it. An update adds the comment of the format when the file has none.
 * @param earlier - The text of the feedback file, or undefined when there is none.
 * @param part - The text of the first feedback or of the update.
 */
export function feedbackFile(earlier: string | undefined, part: string): string {
  if (earlier === undefined) {
    return [...commentLines('feedback'), '', part].join('\n');
  }
  const lines = earlier.split('\n');
  const text = findComment(lines) ? earlier : (withComment(lines, 'feedback') ?? lines).join('\n');
  return `${text.replace(/\n+$/, '')}\n\n${part}`;
}
