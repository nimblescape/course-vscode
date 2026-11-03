<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# Change log

Each section lists the changes of one released version. The release workflow
takes the section of a version as the notes of its GitHub release.

## 0.1.0

The first version.

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
- The npm package `@nimblescape/course` installs the command `cs`:
  `cs instructions`, `cs check`, `cs format`, `cs read`, `cs create` and
  `cs feedback`.
