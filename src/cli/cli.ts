// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The command cs, for people on the command line, for programs and for AI agents. It is the npm package
 * @nimblescape/course of cli/:
 *
 * - `instructions [topic]` prints the rules of a topic for AI agents, then the own rules of the course from
 *   .course/instructions/ ([R-COURSE-005](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-005)).
 * - `check [folder]` reports each place where a file of a course differs from its form
 *   ([R-COURSE-010](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-010)).
 * - `format [folder]` writes the comment of the format into each file of a course that has none or has one of an
 *   older version ([R-COURSE-004](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-004)).
 * - `read [path]` prints a course, an assignment, a chapter or a feedback file as JSON
 *   ([R-COURSE-009](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-009)), for a program in
 *   any language, for example the feedback program.
 * - `create <folder>` writes the files of a new, empty course, each with the comment of the format of its kind.
 * - `feedback <assignment> <answer>` checks the JSON answer of an AI model on the work of a student, and writes or
 *   extends the feedback file of the assignment with the score, for the feedback program
 *   ([R-FEED-001](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-feed-001)); `feedback --form`
 *   prints the form of that answer for the prompt.
 *
 * The exit code is 0 for success, 1 when `check` found a problem, `format --check` found a file that the format
 * changes or `feedback` rejected the answer, and 2 for a wrong command or option, a path that is no part of a course, or a folder that already holds a
 * course. The module uses no API of VS Code, and main.ts runs it in Node.js.
 */

import * as path from 'node:path';
import { version } from '../../package.json';
import { formatVersion, versionText } from '../course/comment';
import { type Files, feedbackName, findCourseFolder, loadCourse, readFeedback, settingsFile } from '../course/course';
import { newCourse } from '../course/create';
import { commentChanges } from '../course/format';
import { AnswerError, answerForm, feedbackFile, feedbackPart, parseAnswer } from '../course/feedbackWriter';
import { readCourseRules, topicList, topicText } from '../course/instructions';
import { languageOf } from '../course/languages';

/** command is the name of the command, the `bin` of cli/package.json, as the shell calls it. */
export const command = 'cs';

/** usage is the help of the command. */
export const usage = [
  `Usage: ${command} <command> [options]`,
  '',
  'The files of a course in a Git repository in one form for people, AI agents and programs.',
  '',
  'Commands:',
  '  instructions [topic]   print the rules of a topic for AI agents, then the own rules of the course from',
  '                         .course/instructions/; without a topic, the list of the topics',
  '  check [folder]         report each place where a file of the course differs from its form',
  '  format [folder]        write the comment of the format into each file of the course that needs it',
  '      --check            write nothing; exit with 1 when a file needs the comment',
  '  read [path]            print the course, an assignment, a chapter or a feedback file as JSON: a path is the',
  '                         folder of the course, the folder or README of an assignment, the README of a chapter,',
  '                         or a FEEDBACK.md',
  '  create <folder>        write the files of a new, empty course, each with the comment of the format',
  '      --language <code>  the language of the course, de or en (default: en)',
  '  feedback <assignment> <answer>',
  '                         check the JSON answer of an AI model on the work of a student (the file <answer>) and',
  '                         write or extend the FEEDBACK.md of the assignment, with the score',
  '      --commits <n>      the number of the commits of the student in workspace/ (default: 0)',
  '      --not-running <reason>',
  '                         a reason why the work does not run, in the language of the course; the score is then',
  '                         at most 50 %; the option may repeat',
  '      --time <time>      the time of the feedback, DD.MM.YYYY HH:MM (default: now, in the local time)',
  '  feedback --form <assignment>',
  '                         print the form of the answer, for the prompt of the AI model',
  '',
  'A folder or path is the current folder when it is missing. The folder of a course is the nearest folder with',
  '.course/course.yml, else the nearest folder with .git.',
  '',
  'Options:',
  '  --help                 show this help',
  '  --version              show the version of the command and of the format',
].join('\n');

/** Io is what the command reads and writes: the files of the disk and the standard streams. */
export interface Io {
  files: Files;
  writeFile(file: string, text: string): void;
  out(line: string): void;
  err(line: string): void;
  /** cwd is the current folder. */
  cwd: string;
}

/**
 * json returns a value as JSON, with null for each missing value, so that every field of the data is in the text.
 * @param value - The value.
 */
const json = (value: unknown): string => JSON.stringify(value, (_key, each: unknown) => (each === undefined ? null : each), 2);

/**
 * run runs the command with its arguments and returns the exit code.
 * @param args - The arguments of the command line, without the program.
 * @param io - The files and the streams.
 */
export function run(args: readonly string[], io: Io): number {
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    io.out(usage);
    return args.length === 0 ? 2 : 0;
  }
  if (args.includes('--version')) {
    io.out(`${command} ${version}, format nimblescape-course v${versionText(formatVersion)}`);
    return 0;
  }
  const [name, ...rest] = args;
  const allowed: Record<string, string[]> = {
    instructions: [],
    check: [],
    format: ['--check'],
    read: [],
    create: ['--language'],
    feedback: ['--form', '--commits', '--not-running', '--time'],
  };
  /** valued are the options that take a value, as `--language de` or `--language=de`. */
  const valued = new Set(['--language', '--commits', '--not-running', '--time']);
  if (!(name in allowed)) {
    io.err(`Unknown command "${name}".\n\n${usage}`);
    return 2;
  }
  const options: string[] = [];
  const values = new Map<string, string>();
  /** repeated are all values of each valued option, for an option that may repeat. */
  const repeated = new Map<string, string[]>();
  const operands: string[] = [];
  for (let index = 0; index < rest.length; index++) {
    const arg = rest[index];
    if (!arg.startsWith('--')) {
      operands.push(arg);
      continue;
    }
    const [option, inline] = arg.includes('=') ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg, undefined];
    options.push(option);
    if (valued.has(option)) {
      const value = inline ?? rest[++index];
      if (value === undefined || value.startsWith('--')) {
        io.err(`The option ${option} of "${name}" needs a value.`);
        return 2;
      }
      values.set(option, value);
      repeated.set(option, [...(repeated.get(option) ?? []), value]);
    }
  }
  const wrong = options.filter((option) => !allowed[name].includes(option));
  const most = name === 'feedback' && !options.includes('--form') ? 2 : 1;
  if (wrong.length > 0 || operands.length > most) {
    io.err(wrong.length > 0 ? `Unknown option ${wrong.join(', ')} of "${name}".` : `"${name}" takes ${most === 1 ? 'one operand' : 'two operands'}.`);
    return 2;
  }
  const target = path.resolve(io.cwd, operands[0] ?? '.');

  if (name === 'instructions') {
    const rules = readCourseRules(findCourseFolder(io.cwd, io.files), io.files);
    if (operands.length === 0) {
      io.out(topicList(command, rules));
      return 0;
    }
    const text = topicText(operands[0], rules);
    if (text === undefined) {
      io.err(`Unknown topic "${operands[0]}".\n\n${topicList(command, rules)}`);
      return 2;
    }
    io.out(text.trimEnd());
    return 0;
  }

  if (name === 'create') {
    if (operands.length === 0) {
      io.err(`"create" needs the folder of the new course.\n\n${usage}`);
      return 2;
    }
    const language = values.get('--language') ?? 'en';
    if (language !== 'de' && language !== 'en') {
      io.err(`The language "${language}" is not one of de, en.`);
      return 2;
    }
    if (io.files.read(path.join(target, settingsFile)) !== undefined) {
      io.err(`${path.relative(io.cwd, path.join(target, settingsFile)) || settingsFile} exists: the folder already holds a course. Print the rules with "${command} instructions".`);
      return 2;
    }
    for (const each of newCourse(path.basename(target), language)) {
      const file = path.join(target, each.file);
      const shown = path.relative(io.cwd, file).split(path.sep).join('/');
      if (io.files.read(file) !== undefined) {
        io.out(`${shown}: kept, it exists`);
      } else {
        io.writeFile(file, each.text);
        io.out(`${shown}: written`);
      }
    }
    io.err(`Next: print the rules of a topic with "${command} instructions <topic>", and write the own rules of the course into .course/instructions/.`);
    return 0;
  }

  const folder = findCourseFolder(target, io.files);
  const display = (file: string): string => path.relative(io.cwd, path.join(folder, file)).split(path.sep).join('/') || '.';

  if (name === 'feedback') {
    return feedback(options, operands, values, repeated.get('--not-running') ?? [], folder, io);
  }

  if (name === 'check') {
    const { problems, files } = loadCourse(folder, io.files);
    for (const problem of problems) {
      io.out(`${display(problem.file)}:${problem.line}: ${problem.message} [${problem.code}]`);
    }
    io.err(`${files.length} files, ${problems.length === 0 ? 'no problems' : `${problems.length} problem${problems.length === 1 ? '' : 's'}`}.`);
    return problems.length === 0 ? 0 : 1;
  }

  if (name === 'format') {
    const changes = commentChanges(folder, io.files);
    for (const change of changes) {
      if (options.includes('--check')) {
        io.out(`${display(change.file)}: needs the comment of the format`);
      } else {
        io.writeFile(path.join(folder, change.file), change.text);
        io.out(`${display(change.file)}: wrote the comment of the format`);
      }
    }
    return options.includes('--check') && changes.length > 0 ? 1 : 0;
  }

  // read
  if (path.basename(target) === feedbackName) {
    const feedback = readFeedback(target, io.files);
    if (!feedback) {
      io.err(`${operands[0]} does not exist.`);
      return 2;
    }
    io.out(json(feedback));
    return 0;
  }
  const { course } = loadCourse(folder, io.files);
  const relative = path.relative(folder, target).split(path.sep).join('/');
  if (relative === '' || relative === course.readme) {
    io.out(json(course));
    return 0;
  }
  const assignment = course.assignments.find((each) => each.folder === relative || each.file === relative);
  const chapter = course.chapters.find((each) => each.file === relative || path.posix.dirname(each.file) === relative);
  if (assignment || chapter) {
    io.out(json(assignment ?? chapter));
    return 0;
  }
  io.err(`${operands[0]} is neither the folder of the course nor an assignment, a chapter or a feedback file of the course in ${display('')}.`);
  return 2;
}

/**
 * now returns the time of now in the local time, `DD.MM.YYYY HH:MM`.
 */
function now(): string {
  const date = new Date();
  const two = (value: number): string => String(value).padStart(2, '0');
  return `${two(date.getDate())}.${two(date.getMonth() + 1)}.${date.getFullYear()} ${two(date.getHours())}:${two(date.getMinutes())}`;
}

/**
 * feedback runs `cs feedback`: with `--form` it prints the form of the answer; else it checks the answer of an AI model
 * and writes or extends the feedback file of the assignment. The feedback is an update when the feedback file has an
 * entry. It returns the exit code.
 * @param options - The options of the command line.
 * @param operands - The assignment, and without `--form` the file of the answer.
 * @param values - The value of each valued option.
 * @param notRunning - The reasons why the work does not run.
 * @param folder - The folder of the course.
 * @param io - The files and the streams.
 */
function feedback(options: readonly string[], operands: readonly string[], values: ReadonlyMap<string, string>, notRunning: readonly string[], folder: string, io: Io): number {
  const form = options.includes('--form');
  if (operands.length !== (form ? 1 : 2)) {
    io.err(form ? '"feedback --form" needs the folder of an assignment.' : '"feedback" needs the folder of an assignment and the file of the answer.');
    return 2;
  }
  const { course } = loadCourse(folder, io.files);
  const relative = path.relative(folder, path.resolve(io.cwd, operands[0])).split(path.sep).join('/');
  const assignment = course.assignments.find((each) => each.folder === relative || each.file === relative);
  if (!assignment) {
    io.err(`${operands[0]} is no assignment of the course in ${path.relative(io.cwd, folder) || '.'}.`);
    return 2;
  }
  if (assignment.requirements.length === 0) {
    io.err(`${assignment.file} has no requirements: the feedback judges the items of the checklist of the requirements.`);
    return 2;
  }
  const update = (assignment.feedback?.entries.length ?? 0) > 0;
  if (form) {
    io.out(answerForm(assignment, update));
    return 0;
  }
  const commits = values.get('--commits') ?? '0';
  const time = values.get('--time') ?? now();
  if (!/^\d+$/.test(commits) || !/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/.test(time)) {
    io.err(!/^\d+$/.test(commits) ? `The number of commits "${commits}" is no whole number.` : `The time "${time}" does not have the form DD.MM.YYYY HH:MM.`);
    return 2;
  }
  const answerText = io.files.read(path.resolve(io.cwd, operands[1]));
  if (answerText === undefined) {
    io.err(`${operands[1]} does not exist.`);
    return 2;
  }
  const language = languageOf(course.language);
  if (!language) {
    io.err(`The language "${course.language}" of the course is not known.`);
    return 2;
  }
  try {
    const answer = parseAnswer(answerText, assignment, update);
    const part = feedbackPart({ answer, assignment, language, time, commits: Number(commits), notRunning, update });
    const file = path.join(folder, assignment.folder, feedbackName);
    io.writeFile(file, feedbackFile(io.files.read(file), part.text));
    io.out(`${path.relative(io.cwd, file).split(path.sep).join('/')}: ${update ? 'update' : 'feedback'} written, score ${part.score} %${notRunning.length > 0 ? ' (at most 50 %: the work does not run)' : ''}`);
    return 0;
  } catch (error) {
    if (error instanceof AnswerError) {
      io.err(`Answer rejected: ${error.message}`);
      return 1;
    }
    throw error;
  }
}
