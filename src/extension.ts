// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The course extension of VS Code
 * ([R-COURSE-010](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-010),
 * [R-COURSE-012](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-012)). It reads each course
 * of the workspace with the reader of the course module and:
 *
 * - shows the structure of the courses in the view "Course" of the explorer;
 * - shows the checks of the files of a course as warnings, after a pause in typing
 *   (`nimblescape.course.checkDelay`);
 * - writes the comment of the format into a file of a course when it is saved
 *   (`nimblescape.course.addFormatComment`), but not with the auto save after a delay;
 * - adds the comments of the format to all files of a course with "Add Format Comments".
 *
 * The adapter of the reflection tool
 * ([R-COURSE-011](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-011)) comes with the
 * reflection extension, which does not exist yet.
 */

import * as path from 'node:path';
import * as vscode from 'vscode';
import { newerFormat, withComment } from './course/comment';
import { commentChanges } from './course/format';
import { splitLines } from './course/markdown';
import { courseFileOf, editorFiles, readCourses, type WorkspaceCourse } from './vscode/courses';
import { CourseView, type Node } from './vscode/courseView';

/** section is the section of the settings of the extension. */
const section = 'nimblescape.course';

/** Api is what the extension gives other extensions: the courses of the workspace, for tests and adapters. */
export interface Api {
  /** courses returns the courses of the workspace as the extension read them last. */
  courses(): readonly WorkspaceCourse[];
  /** refresh reads the courses of the workspace again. */
  refresh(): void;
}

/**
 * activate starts the extension.
 * @param context - The context of the extension.
 */
export function activate(context: vscode.ExtensionContext): Api {
  const view = new CourseView();
  const diagnostics = vscode.languages.createDiagnosticCollection('nimblescape-course');
  let courses: WorkspaceCourse[] = [];
  let timer: NodeJS.Timeout | undefined;

  const refresh = (): void => {
    courses = readCourses();
    void vscode.commands.executeCommand('setContext', `${section}.active`, courses.length > 0);
    view.update(courses);
    diagnostics.clear();
    for (const course of courses) {
      const byFile = new Map<string, vscode.Diagnostic[]>();
      for (const problem of course.loaded.problems) {
        const line = Math.max(0, problem.line - 1);
        const diagnostic = new vscode.Diagnostic(new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER), problem.message, vscode.DiagnosticSeverity.Warning);
        diagnostic.source = 'course';
        diagnostic.code = problem.code;
        byFile.set(problem.file, [...(byFile.get(problem.file) ?? []), diagnostic]);
      }
      for (const [file, list] of byFile) {
        diagnostics.set(vscode.Uri.file(path.join(course.folder, file)), list);
      }
    }
  };

  const later = (): void => {
    clearTimeout(timer);
    const delay = vscode.workspace.getConfiguration(section).get<number>('checkDelay', 800);
    timer = setTimeout(refresh, delay);
  };

  const isCourseDocument = (document: vscode.TextDocument): boolean =>
    document.languageId === 'markdown' || document.uri.path.endsWith('/.course/course.yml');

  const watcher = vscode.workspace.createFileSystemWatcher('**/{*.md,.course/course.yml}');
  context.subscriptions.push(
    view,
    diagnostics,
    watcher,
    vscode.window.registerTreeDataProvider('nimblescape.course.structure', view),
    watcher.onDidCreate(later),
    watcher.onDidDelete(later),
    watcher.onDidChange(later),
    vscode.workspace.onDidChangeWorkspaceFolders(later),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (isCourseDocument(event.document) && event.contentChanges.length > 0) {
        later();
      }
    }),
    vscode.workspace.onWillSaveTextDocument((event) => {
      if (event.reason === vscode.TextDocumentSaveReason.AfterDelay || !vscode.workspace.getConfiguration(section, event.document.uri).get<boolean>('addFormatComment', true)) {
        return;
      }
      const found = courseFileOf(courses, event.document.uri);
      const kind = found?.course.loaded.files.find((each) => each.file === found.file)?.kind;
      if (!kind || kind === 'feedback') {
        return;
      }
      const document = event.document;
      const lines = splitLines(document.getText());
      if (newerFormat(lines)) {
        return;
      }
      const changed = withComment(lines, kind);
      if (changed) {
        const all = new vscode.Range(0, 0, document.lineCount, 0);
        event.waitUntil(Promise.resolve([vscode.TextEdit.replace(document.validateRange(all), changed.join(document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n'))]));
      }
    }),
    vscode.commands.registerCommand(`${section}.refresh`, refresh),
    vscode.commands.registerCommand(`${section}.check`, async () => {
      refresh();
      await vscode.commands.executeCommand('workbench.actions.view.problems');
    }),
    vscode.commands.registerCommand(`${section}.openFeedback`, async (node?: Node) => {
      if (node?.feedback) {
        await vscode.window.showTextDocument(vscode.Uri.file(node.feedback));
      }
    }),
    vscode.commands.registerCommand(`${section}.addFormatComments`, async () => {
      const edit = new vscode.WorkspaceEdit();
      const changed: vscode.Uri[] = [];
      for (const course of readCourses()) {
        for (const change of commentChanges(course.folder, editorFiles)) {
          const uri = vscode.Uri.file(path.join(course.folder, change.file));
          const document = await vscode.workspace.openTextDocument(uri);
          edit.replace(uri, document.validateRange(new vscode.Range(0, 0, document.lineCount, 0)), change.text);
          changed.push(uri);
        }
      }
      if (changed.length === 0) {
        void vscode.window.showInformationMessage('Each file of the courses has the comment of the format.');
        return;
      }
      if (await vscode.workspace.applyEdit(edit)) {
        for (const uri of changed) {
          await (await vscode.workspace.openTextDocument(uri)).save();
        }
        void vscode.window.showInformationMessage(`Wrote the comment of the format into ${changed.length} file${changed.length === 1 ? '' : 's'}.`);
      }
      refresh();
    }),
    { dispose: () => clearTimeout(timer) },
  );
  refresh();
  return { courses: () => courses, refresh };
}

/** deactivate stops the extension; the subscriptions of the context end its parts. */
export function deactivate(): void {}
