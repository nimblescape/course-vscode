// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The view "Course" in the explorer
 * ([R-COURSE-012](https://github.com/nimblescape/markdown/blob/main/docs/course.md#r-course-012)): the items of
 * structure.ts for each course of the workspace. A click on an item opens its file at its line.
 */

import * as vscode from 'vscode';
import type { WorkspaceCourse } from './courses';
import { courseNodes, type Node } from './structure';

export type { Node } from './structure';

/** CourseView is the data of the view "Course". */
export class CourseView implements vscode.TreeDataProvider<Node> {
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changed.event;
  private courses: readonly WorkspaceCourse[] = [];

  /**
   * update shows the courses.
   * @param courses - The courses of the workspace.
   */
  update(courses: readonly WorkspaceCourse[]): void {
    this.courses = courses;
    this.changed.fire();
  }

  getTreeItem(node: Node): vscode.TreeItem {
    const item = new vscode.TreeItem(node.label, node.children ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    item.description = node.description;
    item.tooltip = node.tooltip;
    item.contextValue = node.contextValue;
    if (node.icon) {
      item.iconPath = new vscode.ThemeIcon(node.icon);
    }
    if (node.file) {
      item.command = {
        command: 'vscode.open',
        title: 'Open',
        arguments: [vscode.Uri.file(node.file), { selection: new vscode.Range((node.line ?? 1) - 1, 0, (node.line ?? 1) - 1, 0) } satisfies vscode.TextDocumentShowOptions],
      };
    }
    return item;
  }

  getChildren(node?: Node): Node[] {
    if (node) {
      return node.children?.() ?? [];
    }
    if (this.courses.length === 1) {
      return courseNodes(this.courses[0]);
    }
    return this.courses.map((course) => ({ label: course.loaded.course.name, description: course.loaded.course.language, icon: 'mortar-board', children: () => courseNodes(course) }));
  }

  dispose(): void {
    this.changed.dispose();
  }
}
