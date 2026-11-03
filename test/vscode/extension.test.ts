/// <reference types="mocha" />
// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// Tests in a real VS Code (npm run test:vscode, .vscode-test.mjs): mocha runs them in the extension host, with a copy of
// the test course as the workspace. They check that the extension reads the course (R-COURSE-009) and only a folder with
// .course/course.yml as a course, shows the checks as
// warnings, also of a text that is not saved yet (R-COURSE-010), and writes the comment of the format with the save of
// a README of the course (R-COURSE-012).

import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Api } from '../../src/extension';

/** extensionId is the identifier of the extension. */
const extensionId = 'nimblescape.nimblescape-course';

/** api returns the export of the active extension. */
async function api(): Promise<Api> {
  const extension = vscode.extensions.getExtension<Api>(extensionId);
  assert.ok(extension, `the extension ${extensionId} is installed`);
  return extension.isActive ? extension.exports : extension.activate();
}

/**
 * waitFor returns the first value of a function that is not undefined, or fails after a time.
 * @param what - What the test waits for, for the message of the failure.
 * @param value - The function.
 */
async function waitFor<T>(what: string, value: () => T | undefined): Promise<T> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const found = value();
    if (found !== undefined) {
      return found;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.fail(`waited in vain for ${what}`);
}

const folder = (): string => vscode.workspace.workspaceFolders![0].uri.fsPath;

/**
 * codes returns the codes of the warnings of a file of the course.
 * @param file - The file, relative to the folder of the course.
 */
const codes = (file: string): string[] => vscode.languages.getDiagnostics(vscode.Uri.file(path.join(folder(), file))).map((each) => String(each.code));

describe('the course extension', () => {
  it('reads the course of the workspace', async () => {
    const courses = (await api()).courses();
    assert.equal(courses.length, 1);
    assert.equal(courses[0].loaded.course.name, 'demo');
    assert.deepEqual(courses[0].loaded.course.chapters.map((chapter) => chapter.number), ['01', '02']);
  });

  it('reads no course from a folder without .course/course.yml', async () => {
    const extension = await api();
    const settings = path.join(folder(), '.course', 'course.yml');
    const moved = `${settings}.off`;
    fs.renameSync(settings, moved);
    try {
      extension.refresh();
      assert.equal(extension.courses().length, 0);
    } finally {
      fs.renameSync(moved, settings);
      extension.refresh();
    }
    assert.equal(extension.courses().length, 1);
  });

  it('shows the checks of the files of the course as warnings', async () => {
    await api();
    assert.deepEqual(await waitFor('the warning of the feedback file', () => (codes('20-assignments/01-loops/01.01-count/FEEDBACK.md').length > 0 ? codes('20-assignments/01-loops/01.01-count/FEEDBACK.md') : undefined)), ['missing-comment']);
  });

  it('shows the checks of a text that is not saved yet, after a pause in typing', async () => {
    await api();
    const file = '20-assignments/02-arrays/02.01-shopping-list/README.md';
    const document = await vscode.workspace.openTextDocument(path.join(folder(), file));
    await vscode.window.showTextDocument(document);
    const line = document.getText().split('\n').findIndex((text) => text.startsWith('- [ ] Ein Array'));
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(line, 0, line, 6), '- ');
    assert.ok(await vscode.workspace.applyEdit(edit));
    await waitFor('the warning of the requirement outside the checklist', () => (codes(file).includes('not-checklist') ? true : undefined));
    await vscode.commands.executeCommand('undo');
    await waitFor('no warning after the undo', () => (codes(file).length === 0 ? true : undefined));
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
  });

  it('writes the comment of the format when a README of the course is saved', async () => {
    const extension = await api();
    const file = path.join(folder(), '20-assignments/01-loops/01.01-count/README.md');
    const original = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, original.split('\n').slice(7).join('\n'));
    extension.refresh();
    const document = await vscode.workspace.openTextDocument(file);
    const editor = await vscode.window.showTextDocument(document);
    await editor.edit((builder) => builder.insert(new vscode.Position(document.lineCount - 1, 0), 'Viel Spaß!\n'));
    assert.ok(await document.save());
    assert.ok(document.getText().startsWith('<!-- nimblescape-course v1.0.0 assignment spec='));
    assert.ok(fs.readFileSync(file, 'utf8').startsWith('<!-- nimblescape-course v1.0.0 assignment spec='));
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  });
});
