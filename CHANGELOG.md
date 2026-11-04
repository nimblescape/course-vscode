<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# Change log

Each section lists the changes of one released version. The release workflow
takes the section of a version as the notes of its GitHub release.

## 0.2.0

- The headings of a feedback file name the commit whose work the feedback
  judges, after the time: `## Update – 04.11.2026 11:28 · bf21589`. It is the
  newest commit that changed `workspace/` when the feedback program read the
  work, so the student and the teacher see which state of the work a
  feedback judges. A heading without a commit stays valid. The format of the
  files of a course is now v1.1.0: the extension and
  `npx -y @nimblescape/course format` write the new comment of the format
  into a file that they write.
- `npx -y @nimblescape/course feedback` takes the commit with
  `--commit <hash>`, and `npx -y @nimblescape/course read` gives it as the
  `commit` of each entry of a feedback file.
- A feedback writes each status mark once, also when the answer of the AI
  model starts a text with the mark.
- The extension has its icon on the Marketplace.

## 0.1.0

The first version.

- The extension works in a workspace with the settings `.course/course.yml`
  of a course and does nothing in other workspaces.
- The view "Course" in the explorer shows the chapters of a course with their
  learning objectives, and the assignments with their objectives,
  requirements, criteria and the score of the last feedback.
- A warning shows each place where a file of a course differs from its form:
  the README of the course, of a chapter and of an assignment, the feedback
  file, the tutorial pages, the walkthroughs, the course plan, the cheat sheet
  and the overviews of the folders.
- When you save a file of a course without the comment of the format, the
  extension writes the comment at the top of the file. The command "Add Format
  Comments" writes it into every file of the course.
- The npm package `@nimblescape/course` has the commands `instructions`,
  `check`, `format`, `read`, `create` and `feedback`. AI agents and people run
  them with npx, without an installation:
  `npx -y @nimblescape/course <command>`.
