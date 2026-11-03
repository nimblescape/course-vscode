// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The courses of the workspace for the course extension: each folder of the workspace that is a course, read with the
 * reader of the course module, with the text of each open editor instead of the text on the disk, so that the view and
 * the warnings show the text as it is typed. A folder of the workspace is a course when it has .course/course.yml or
 * when the patterns of a course find a README of a chapter or of an assignment in it.
 */

import * as path from 'node:path';
import * as vscode from 'vscode';
import { type Files, type Loaded, loadCourse, nodeFiles } from '../course/course';

/** WorkspaceCourse is a course of the workspace. */
export interface WorkspaceCourse {
  /** folder is the folder of the course, an absolute path. */
  folder: string;
  loaded: Loaded;
}

/** editorFiles reads the text of an open editor, and the other files from the disk. */
export const editorFiles: Files = {
  read: (file) => {
    const open = vscode.workspace.textDocuments.find((document) => document.uri.scheme === 'file' && path.resolve(document.uri.fsPath) === path.resolve(file));
    return open ? open.getText() : nodeFiles.read(file);
  },
  list: (folder) => nodeFiles.list(folder),
};

/**
 * readCourses returns the courses of the folders of the workspace.
 */
export function readCourses(): WorkspaceCourse[] {
  const courses: WorkspaceCourse[] = [];
  for (const workspaceFolder of vscode.workspace.workspaceFolders ?? []) {
    if (workspaceFolder.uri.scheme !== 'file') {
      continue;
    }
    const folder = workspaceFolder.uri.fsPath;
    const loaded = loadCourse(folder, editorFiles);
    const hasSettings = nodeFiles.read(path.join(folder, '.course', 'course.yml')) !== undefined;
    if (hasSettings || loaded.course.chapters.length > 0 || loaded.course.assignments.length > 0) {
      courses.push({ folder, loaded });
    }
  }
  return courses;
}

/**
 * courseFileOf returns the course and the file of the course of a document, or undefined when the document is no file
 * of a course of the workspace.
 * @param courses - The courses of the workspace.
 * @param uri - The address of the document.
 */
export function courseFileOf(courses: readonly WorkspaceCourse[], uri: vscode.Uri): { course: WorkspaceCourse; file: string } | undefined {
  if (uri.scheme !== 'file') {
    return undefined;
  }
  for (const course of courses) {
    const relative = path.relative(course.folder, uri.fsPath).split(path.sep).join('/');
    if (!relative.startsWith('../') && course.loaded.files.some((each) => each.file === relative)) {
      return { course, file: relative };
    }
  }
  return undefined;
}
