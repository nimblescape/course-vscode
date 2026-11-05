// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The reader of a course ([R-COURSE-009](../../docs/requirements.md#r-course-009))
 * and its checks ([R-COURSE-010](../../docs/requirements.md#r-course-010)). It
 * reads the settings of .course/course.yml, finds the files of the course by the kind in their comment of the format
 * and by the patterns of the settings, reads each file with the rules of its kind, and checks the files against each
 * other: the objectives of the assignments against the tables of the chapters. The feedback program, the adapter of the
 * reflection tool and the course extension read the files of a course only through this reader. The files come through
 * an interface, so that the course extension gives the text of an open editor. The module uses no API of VS Code.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { readAssignmentBlocks } from './assignment';
import { readChapter } from './chapter';
import { findComment, formatVersion, versionText } from './comment';
import { readFeedbackBlocks } from './feedback';
import { type Language, languageOf, languages } from './languages';
import { type Blocks, blocksOf } from './markdown';
import { checkPages } from './pages';
import { compareNumbers, matches } from './paths';
import { type Assignment, type Chapter, type Course, type Feedback, type Kind, kinds, type Problem } from './types';

/** Files reads the files of a course: the course extension gives the text of an open editor. */
export interface Files {
  /** read returns the text of a file, or undefined when it does not exist. */
  read(file: string): string | undefined;
  /** list returns the names of the entries of a folder, with whether each is a folder; an empty list for no folder. */
  list(folder: string): { name: string; folder: boolean }[];
}

/** nodeFiles reads the files of the disk in UTF-8. */
export const nodeFiles: Files = {
  read: (file) => {
    try {
      return fs.readFileSync(file, 'utf8');
    } catch {
      return undefined;
    }
  },
  list: (folder) => {
    try {
      return fs.readdirSync(folder, { withFileTypes: true }).map((entry) => ({ name: entry.name, folder: entry.isDirectory() }));
    } catch {
      return [];
    }
  },
};

/** settingsFile is the file of the settings of a course, relative to its folder. */
export const settingsFile = '.course/course.yml';

/** Settings are the settings of a course in .course/course.yml. */
export interface Settings {
  course: string | undefined;
  language: string | undefined;
  readme: string;
  chapters: string[];
  assignments: string[];
  tutorials: string[];
  walkthroughs: string[];
  plan: string[];
  cheatSheet: string[];
  overviews: string[];
}

/** defaultSettings are the settings of a course without .course/course.yml: the folders of the majikmate courses. */
export const defaultSettings: Settings = {
  course: undefined,
  language: undefined,
  readme: 'README.md',
  chapters: ['10-course/10-tutorials/*/README.md'],
  assignments: ['20-assignments/*/*/README.md'],
  tutorials: ['10-course/10-tutorials/*/*.md'],
  walkthroughs: ['10-course/20-sessions/*/README.md'],
  plan: ['10-course/20-sessions/README.md'],
  cheatSheet: ['reference-material/10-cheat-sheet.md'],
  overviews: ['10-course/README.md', '10-course/10-tutorials/README.md', '20-assignments/README.md', '20-assignments/*/README.md', 'reference-material/README.md'],
};

/** patternFields are the fields of the patterns in .course/course.yml with their kinds, in the order in which they decide the kind of a file. */
const patternFields: readonly { field: string; key: keyof Settings; kind: Kind }[] = [
  { field: 'chapters', key: 'chapters', kind: 'chapter' },
  { field: 'assignments', key: 'assignments', kind: 'assignment' },
  { field: 'tutorials', key: 'tutorials', kind: 'tutorial' },
  { field: 'walkthroughs', key: 'walkthroughs', kind: 'walkthrough' },
  { field: 'plan', key: 'plan', kind: 'plan' },
  { field: 'cheat-sheet', key: 'cheatSheet', kind: 'cheat-sheet' },
  { field: 'overviews', key: 'overviews', kind: 'overview' },
];

/** feedbackName is the name of the feedback file next to the README of an assignment. */
export const feedbackName = 'FEEDBACK.md';

/** skippedFolders are folders that hold no file of a course: the folders of Git, of the packages and of the builds. */
const skippedFolders = new Set(['.git', 'node_modules', 'dist', 'out', '.vscode-test']);

/**
 * findCourseFolder returns the folder of the course of a file or folder: the nearest folder with .course/course.yml,
 * else the nearest folder with .git, else the folder itself.
 * @param start - The file or folder, an absolute path.
 * @param files - The files.
 */
export function findCourseFolder(start: string, files: Files = nodeFiles): string {
  const first = files.list(start).length > 0 || files.read(start) === undefined ? start : path.dirname(start);
  let gitFolder: string | undefined;
  for (let folder = first; ; folder = path.dirname(folder)) {
    if (files.read(path.join(folder, settingsFile)) !== undefined) {
      return folder;
    }
    if (gitFolder === undefined && files.list(folder).some((entry) => entry.name === '.git')) {
      gitFolder = folder;
    }
    if (path.dirname(folder) === folder) {
      return gitFolder ?? first;
    }
  }
}

/**
 * patternList returns the patterns of a field of the settings: a text or a list of texts.
 * @param value - The value of the field.
 * @param fallback - The patterns without a value.
 */
const patternList = (value: unknown, fallback: string[]): string[] =>
  typeof value === 'string' ? [value] : Array.isArray(value) && value.every((each) => typeof each === 'string') ? value : fallback;

/**
 * readSettings returns the settings of a course, and the problems of its file.
 * @param folder - The folder of the course.
 * @param files - The files.
 */
export function readSettings(folder: string, files: Files = nodeFiles): { settings: Settings; problems: Problem[] } {
  const text = files.read(path.join(folder, settingsFile));
  if (text === undefined) {
    return { settings: defaultSettings, problems: [] };
  }
  let value: unknown;
  try {
    value = parseYaml(text);
  } catch (error) {
    return { settings: defaultSettings, problems: [{ file: settingsFile, line: 1, code: 'settings', message: `The settings are not valid YAML: ${(error as Error).message}` }] };
  }
  const fields = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const problems: Problem[] = [];
  const known = ['course', 'language', 'readme', ...patternFields.map((each) => each.field)];
  for (const key of Object.keys(fields).filter((each) => !known.includes(each))) {
    problems.push({ file: settingsFile, line: 1, code: 'settings', message: `The settings have the unknown field "${key}".` });
  }
  const language = fields.language === undefined ? undefined : String(fields.language);
  if (language !== undefined && !languageOf(language)) {
    problems.push({ file: settingsFile, line: 1, code: 'settings', message: `The language "${language}" is not one of ${Object.keys(languages).join(', ')}.` });
  }
  return {
    settings: {
      course: fields.course === undefined ? undefined : String(fields.course),
      language,
      readme: typeof fields.readme === 'string' ? fields.readme : defaultSettings.readme,
      chapters: patternList(fields.chapters, defaultSettings.chapters),
      assignments: patternList(fields.assignments, defaultSettings.assignments),
      tutorials: patternList(fields.tutorials, defaultSettings.tutorials),
      walkthroughs: patternList(fields.walkthroughs, defaultSettings.walkthroughs),
      plan: patternList(fields.plan, defaultSettings.plan),
      cheatSheet: patternList(fields['cheat-sheet'], defaultSettings.cheatSheet),
      overviews: patternList(fields.overviews, defaultSettings.overviews),
    },
    problems,
  };
}

/**
 * markdownFiles returns the Markdown files of a folder and of its folders, relative to the folder, without the folders
 * of Git, of the packages and of the builds, and without the folders whose names start with a dot.
 * @param folder - The folder.
 * @param files - The files.
 */
function markdownFiles(folder: string, files: Files): string[] {
  const found: string[] = [];
  const walk = (relative: string): void => {
    for (const entry of files.list(path.join(folder, relative))) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.folder) {
        if (!skippedFolders.has(entry.name) && !entry.name.startsWith('.')) {
          walk(name);
        }
      } else if (/\.md$/i.test(entry.name)) {
        found.push(name);
      }
    }
  };
  walk('');
  return found.sort();
}

/**
 * workspaceFiles returns the files of the folder workspace/ of an assignment, relative to the folder of the assignment.
 * @param folder - The folder of the assignment, an absolute path.
 * @param files - The files.
 */
function workspaceFiles(folder: string, files: Files): string[] {
  const found: string[] = [];
  const walk = (relative: string): void => {
    for (const entry of files.list(path.join(folder, relative))) {
      const name = `${relative}/${entry.name}`;
      if (entry.folder) {
        if (!skippedFolders.has(entry.name)) {
          walk(name);
        }
      } else {
        found.push(name);
      }
    }
  };
  walk('workspace');
  return found.sort();
}

/** CourseFile is a file of a course with its kind. */
export interface CourseFile {
  /** file is the file, relative to the folder of the course. */
  file: string;
  /** kind is the kind of the file: the kind of its comment of the format, else the kind of the pattern that it matches. */
  kind: Kind;
  /** commented tells whether the file has the comment of the format. */
  commented: boolean;
}

/** Loaded is a course with the places where its files differ from their forms. */
export interface Loaded {
  course: Course;
  /** files are the files of the course with their kinds. */
  files: CourseFile[];
  problems: Problem[];
}

/**
 * detectLanguage returns the language whose names of the sections the README files of the assignments and chapters use
 * most, or English.
 * @param texts - The texts of the README files.
 */
function detectLanguage(texts: readonly string[]): Language {
  let best = languages.en;
  let bestCount = 0;
  for (const language of Object.values(languages)) {
    const names = [`# ${language.assignment.heading}`, ...language.chapter.objectives, ...language.assignment.requirements].map((name) => (name.startsWith('#') ? name : `## ${name}`));
    const count = texts.filter((text) => names.some((name) => text.includes(`\n${name}\n`) || text.startsWith(`${name}\n`))).length;
    if (count > bestCount) {
      best = language;
      bestCount = count;
    }
  }
  return best;
}

/**
 * loadCourse reads a course with the places where its files differ from their forms.
 * @param folder - The folder of the course, an absolute path.
 * @param files - The files.
 */
export function loadCourse(folder: string, files: Files = nodeFiles): Loaded {
  const { settings, problems } = readSettings(folder, files);
  const texts = new Map<string, string>();
  const textOf = (file: string): string => {
    if (!texts.has(file)) {
      texts.set(file, files.read(path.join(folder, file)) ?? '');
    }
    return texts.get(file)!;
  };

  const courseFiles: CourseFile[] = [];
  for (const file of markdownFiles(folder, files)) {
    const fromPattern: Kind | undefined =
      file === settings.readme ? 'course' : patternFields.find((each) => matches(file, settings[each.key] as string[]))?.kind;
    const lines = textOf(file).replace(/\r\n?/g, '\n').split('\n');
    const comment = findComment(lines);
    if (comment) {
      if (comment.version && comment.version.major > formatVersion.major) {
        problems.push({ file, line: comment.start + 1, code: 'newer-format', message: `The comment names version ${versionText(comment.version)} of the format, newer than version ${versionText(formatVersion)} of this course module: the module reads the file, but changes nothing in it and checks nothing in it.` });
      }
      if (!comment.kind) {
        problems.push({ file, line: comment.start + 1, code: 'comment-kind', message: `The comment of the format names the kind "${comment.kindText}", not one of ${kinds.join(', ')}.` });
      }
      if (!comment.atStart) {
        problems.push({ file, line: comment.start + 1, code: 'comment-place', message: 'The comment of the format must stand at the start of the file.' });
      }
    }
    const kind = comment?.kind ?? fromPattern;
    if (!kind) {
      continue;
    }
    if (!comment) {
      problems.push({ file, line: 1, code: 'missing-comment', message: `The file has no comment of the format; \`npx -y @nimblescape/course format\` writes it: <!-- nimblescape-course v${versionText(formatVersion)} ${kind} spec=…` });
    }
    courseFiles.push({ file, kind, commented: comment !== undefined });
  }

  const readmeTexts = courseFiles.filter((each) => each.kind === 'chapter' || each.kind === 'assignment').map((each) => textOf(each.file));
  const language = (settings.language && languageOf(settings.language)) || detectLanguage(readmeTexts);
  const checked = (file: string): boolean => !problems.some((each) => each.file === file && each.code === 'newer-format');
  const add = (found: Problem[], file: string): void => {
    if (checked(file)) {
      problems.push(...found);
    }
  };

  const chapters: Chapter[] = [];
  for (const each of courseFiles.filter((file) => file.kind === 'chapter')) {
    const { chapter, problems: found } = readChapter(blocksOf(textOf(each.file)), each.file, language);
    chapters.push(chapter);
    add(found, each.file);
  }
  chapters.sort((a, b) => compareNumbers(a.number, b.number) || a.file.localeCompare(b.file));

  const objectives = new Map<string, { chapter: Chapter; level: number | undefined }>();
  for (const chapter of chapters) {
    for (const objective of chapter.objectives) {
      const other = objectives.get(objective.number);
      if (other) {
        add([{ file: chapter.file, line: objective.line, code: 'objective-twice', message: `The number ${objective.number} is also the number of an objective of ${other.chapter.file}.` }], chapter.file);
      } else {
        objectives.set(objective.number, { chapter, level: objective.level });
      }
    }
  }

  const assignments: Assignment[] = [];
  for (const each of courseFiles.filter((file) => file.kind === 'assignment')) {
    const { assignment, chapterFile, problems: found } = readAssignmentBlocks(blocksOf(textOf(each.file)), each.file, language);
    add(found, each.file);
    const chapter = chapters.find((candidate) => candidate.file === chapterFile);
    if (chapterFile && !chapter) {
      add([{ file: each.file, line: 1, code: 'missing-chapter', message: `The link to the chapter names ${chapterFile}, which is no README of a chapter of the course.` }], each.file);
    }
    assignment.chapter = chapter?.number;
    for (const objective of assignment.objectives) {
      const known = objectives.get(objective.number);
      if (!known) {
        add([{ file: each.file, line: objective.line, code: 'unknown-objective', message: `No table of a chapter has the objective ${objective.number}.` }], each.file);
        continue;
      }
      if (known.level !== undefined && objective.level !== undefined && known.level !== objective.level) {
        add([{ file: each.file, line: objective.line, code: 'level-differs', message: `The level of ${objective.number} is K${known.level} in the table of ${known.chapter.file}, not K${objective.level}.` }], each.file);
      }
      if (chapter && compareNumbers(known.chapter.number, chapter.number) > 0) {
        add([{ file: each.file, line: objective.line, code: 'later-objective', message: `The objective ${objective.number} belongs to chapter ${known.chapter.number}, which comes after chapter ${chapter.number} of the assignment.` }], each.file);
      }
    }
    assignment.workspace = workspaceFiles(path.join(folder, assignment.folder), files);
    const feedbackFile = assignment.folder ? `${assignment.folder}/${feedbackName}` : feedbackName;
    const feedbackText = files.read(path.join(folder, feedbackFile));
    if (feedbackText !== undefined) {
      const { feedback, problems: feedbackProblems } = readFeedbackBlocks(blocksOf(feedbackText), feedbackFile, language);
      assignment.feedback = feedback;
      add(feedbackProblems, feedbackFile);
      if (!courseFiles.some((file) => file.file === feedbackFile)) {
        courseFiles.push({ file: feedbackFile, kind: 'feedback', commented: false });
        problems.push({ file: feedbackFile, line: 1, code: 'missing-comment', message: `The file has no comment of the format; the feedback program writes it: <!-- nimblescape-course v${versionText(formatVersion)} feedback spec=…` });
      }
    }
    assignments.push(assignment);
  }
  assignments.sort((a, b) => compareNumbers(a.number, b.number) || a.file.localeCompare(b.file));

  const blocksCache = new Map<string, Blocks>();
  const pageProblems = checkPages({
    files: courseFiles,
    blocks: (file) => {
      if (!blocksCache.has(file)) {
        blocksCache.set(file, blocksOf(textOf(file)));
      }
      return blocksCache.get(file)!;
    },
    language,
    chapters,
    list: (relative) => files.list(path.join(folder, relative)),
    exists: (file) => files.read(path.join(folder, file)) !== undefined,
  });
  problems.push(...pageProblems.filter((each) => checked(each.file)));

  const readme = courseFiles.find((each) => each.kind === 'course')?.file;
  problems.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return {
    course: { name: settings.course ?? path.basename(folder), language: language.code, readme, chapters, assignments },
    files: courseFiles,
    problems,
  };
}

/**
 * readCourse reads a course into its structured data.
 * @param folder - The folder of the course, or a folder or file inside it.
 * @param files - The files.
 */
export const readCourse = (folder: string, files: Files = nodeFiles): Course => loadCourse(findCourseFolder(path.resolve(folder), files), files).course;

/**
 * readAssignment reads the assignment of a folder, or of its README, with the paths relative to the folder of its
 * course; undefined when the folder is no assignment of a course.
 * @param folder - The folder of the assignment, or its README.
 * @param files - The files.
 */
export function readAssignment(folder: string, files: Files = nodeFiles): Assignment | undefined {
  const absolute = path.resolve(folder);
  const courseFolder = findCourseFolder(absolute, files);
  const relative = path.relative(courseFolder, absolute).split(path.sep).join('/');
  return loadCourse(courseFolder, files).course.assignments.find((assignment) => assignment.folder === relative || assignment.file === relative);
}

/**
 * readFeedback reads a feedback file in the language of its course, with its path relative to the folder of its course.
 * @param file - The feedback file.
 * @param files - The files.
 */
export function readFeedback(file: string, files: Files = nodeFiles): Feedback | undefined {
  const absolute = path.resolve(file);
  const text = files.read(absolute);
  if (text === undefined) {
    return undefined;
  }
  const courseFolder = findCourseFolder(absolute, files);
  const { settings } = readSettings(courseFolder, files);
  const blocks = blocksOf(text);
  const language =
    (settings.language && languageOf(settings.language)) ||
    Object.values(languages).find((each) => blocks.headings.some((heading) => heading.text === each.feedback.assessment || heading.text === each.feedback.summary)) ||
    languages.en;
  return readFeedbackBlocks(blocks, path.relative(courseFolder, absolute).split(path.sep).join('/'), language).feedback;
}
