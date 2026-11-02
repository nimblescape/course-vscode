// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The command course, for people on the command line, for programs and for AI agents. It is the npm package
 * @nimblescape/course of cli/:
 *
 * - `instructions [topic]` prints the rules of a topic for AI agents
 *   ([R-COURSE-005](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-005)).
 * - `check [folder]` reports each place where a file of a course differs from its form
 *   ([R-COURSE-010](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-010)).
 * - `format [folder]` writes the comment of the format into each README of a course that has none or has one of an
 *   older version ([R-COURSE-004](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-004)).
 * - `read [path]` prints a course, an assignment, a chapter or a feedback file as JSON
 *   ([R-COURSE-009](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-009)), for a program in
 *   any language, for example the feedback program.
 *
 * The exit code is 0 for success, 1 when `check` found a problem or `format --check` found a file that the format
 * changes, and 2 for a wrong command or option, or a path that is no part of a course. The module uses no API of
 * VS Code, and main.ts runs it in Node.js.
 */

import * as path from 'node:path';
import { version } from '../../package.json';
import { formatVersion, versionText } from '../course/comment';
import { type Files, feedbackName, findCourseFolder, loadCourse, readFeedback } from '../course/course';
import { commentChanges } from '../course/format';
import { topicList, topicText } from '../course/instructions';

/** command is the name of the command, the `bin` of cli/package.json, as the shell calls it. */
export const command = 'course';

/** usage is the help of the command. */
export const usage = [
  `Usage: ${command} <command> [options]`,
  '',
  'The files of a course in a Git repository in one form for people, AI agents and programs.',
  '',
  'Commands:',
  '  instructions [topic]   print the rules of a topic for AI agents; without a topic, the list of the topics',
  '  check [folder]         report each place where a file of the course differs from its form',
  '  format [folder]        write the comment of the format into each README of the course that needs it',
  '      --check            write nothing; exit with 1 when a file needs the comment',
  '  read [path]            print the course, an assignment, a chapter or a feedback file as JSON: a path is the',
  '                         folder of the course, the folder or README of an assignment, the README of a chapter,',
  '                         or a FEEDBACK.md',
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
  const options = rest.filter((arg) => arg.startsWith('--'));
  const operands = rest.filter((arg) => !arg.startsWith('--'));
  const allowed: Record<string, string[]> = { instructions: [], check: [], format: ['--check'], read: [] };
  if (!(name in allowed)) {
    io.err(`Unknown command "${name}".\n\n${usage}`);
    return 2;
  }
  const wrong = options.filter((option) => !allowed[name].includes(option));
  if (wrong.length > 0 || operands.length > 1) {
    io.err(wrong.length > 0 ? `Unknown option ${wrong.join(', ')} of "${name}".` : `"${name}" takes one operand.`);
    return 2;
  }
  const target = path.resolve(io.cwd, operands[0] ?? '.');

  if (name === 'instructions') {
    if (operands.length === 0) {
      io.out(topicList(command));
      return 0;
    }
    const text = topicText(operands[0]);
    if (text === undefined) {
      io.err(`Unknown topic "${operands[0]}".\n\n${topicList(command)}`);
      return 2;
    }
    io.out(text.trimEnd());
    return 0;
  }

  const folder = findCourseFolder(target, io.files);
  const display = (file: string): string => path.relative(io.cwd, path.join(folder, file)).split(path.sep).join('/') || '.';

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
