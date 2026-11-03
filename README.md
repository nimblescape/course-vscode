# nimblescape Course

Keeps the files of a course in a Git repository in one form for people, AI
agents and programs: the README of the course, the README of each chapter
with its learning objectives, the README of each assignment with its
requirements, and the feedback file of each assignment. The form is
specified once, in
[the format of the files of a course](https://github.com/nimblescape/course-vscode/blob/main/docs/format.md),
and a course does not copy it. A comment at the top of each file names the
format and tells AI agents the command that prints its rules.

The view "Course" in the explorer shows the chapters of a course with their
learning objectives, and the assignments with their objectives, requirements,
criteria and feedback. The text editor shows each place where a file differs
from its form as a warning.

## What the extension does on your computer

- **When it works.** The extension starts with a workspace that holds
  `.course/course.yml`, or when a Markdown file opens. It shows the view
  "Course" only in a workspace with a course. It does not run in VS Code for
  the Web.
- **Files.** The extension reads the Markdown files of each course of the
  workspace and its settings `.course/course.yml`. A course is a folder of
  the workspace with `.course/course.yml`, or with README files of chapters
  or assignments at the default paths of the format. It changes the text of a file only when you save a
  README of a course without the comment of the format, and then only adds
  that comment at the top (setting `nimblescape.course.addFormatComment`),
  or when you run "Add Format Comments". Undo takes the change back. It never
  changes a feedback file, and never a file whose comment names a newer
  format.
- **Network.** The extension connects to no address, runs no program and
  collects no telemetry.
- **Restricted Mode.** The extension works with all features, because it
  only reads the files of the course and adds the comment as described
  above, and runs no program of the workspace.

## Features

- **View "Course".** A tree in the explorer: the chapters with their
  learning objectives, number, level and text; each assignment of a chapter
  with its learning objectives, requirements, criteria and the score of its
  last feedback. A click opens the line of the file. The button at an
  assignment with a feedback file opens `FEEDBACK.md`.
- **Warnings.** Each place where a file differs from its form is a warning
  in the text editor and in the Problems view, after a pause in typing, also
  for text that is not saved yet. Examples: a missing section, an objective
  of an assignment that no chapter has, a level that differs from the level
  in the chapter, a requirement that is no item of the checklist, or a mark
  of objectives in the wrong place.
- **Comment of the format.** A comment at the top of each README names the
  format `nimblescape-course`, its version, the kind of the file and the
  command that prints its rules for AI agents. The extension writes it when
  you save a README of a course without it.
- **Learning objectives.** Each objective has a number per chapter and one
  of the six levels of the revised taxonomy of Bloom (Krathwohl, 2002), from
  `K1 – Erinnern` / `K1 – Remember` to `K6 – Erschaffen` / `K6 – Create`.
- **Languages.** The sections of a course have German or English names. The
  language is set in `.course/course.yml` or follows the names in the files.

## Usage

| What | How |
| --- | --- |
| See the structure of a course | Open the folder of the course; the view "Course" is in the explorer. |
| See where a file differs from its form | Open the file, or run "Course: Check Course" for the Problems view of all files. |
| Add the comment of the format to all README files | Run "Course: Add Format Comments". |
| Read the rules of a kind of file | Run `npx -y @nimblescape/course instructions <topic>` in a terminal, with the topic `course`, `chapter`, `assignment`, `objectives` or `feedback`. |
| Read the feedback on an assignment | Click the button at the assignment in the view "Course". |

A course sets its own paths and language in `.course/course.yml`, for
example:

```yaml
course: ts-2
language: de
chapters: 10-course/10-tutorials/*/README.md
assignments: 20-assignments/*/*/README.md
```

Section 2 of the
[format](https://github.com/nimblescape/course-vscode/blob/main/docs/format.md#2-the-settings-of-a-course)
names every field and its default.

## Command line

The npm package `@nimblescape/course` has the command `course` with the same
reader and checks, for a terminal, for CI and for programs in other
languages:

```sh
course instructions assignment   # prints the rules of the README of an assignment
course check                     # reports each place where a file differs from its form
course format                    # writes the comment of the format into each README
course read 20-assignments/01-loops/01.01-count   # prints the assignment as JSON
```

The [README of the package](https://github.com/nimblescape/course-vscode/blob/main/cli/README.md)
describes each command and the library.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| `nimblescape.course.addFormatComment` | `true` | Writes the comment of the format into a README of a course when you save it, if it has none or one of an older version. The auto save after a delay never writes it. |
| `nimblescape.course.checkDelay` | `800` | The pause in typing, in milliseconds, after which the text editor shows the checks of a file again. |

## Limits

- The extension reads the files of the course from the disk of this
  computer, so it does not work in a virtual workspace.
- The feedback program writes the feedback files. The extension shows a
  feedback file without the comment of the format as a warning, but does not
  add the comment, because a person or the extension does not change a
  feedback file.
- The adapter that gives the reflection tool of nimblescape the objectives,
  requirements and feedback of a course comes with the reflection extension,
  which does not exist yet.

---

[Format](https://github.com/nimblescape/course-vscode/blob/main/docs/format.md) · [Change log](https://github.com/nimblescape/course-vscode/blob/main/CHANGELOG.md) · [Contributing](https://github.com/nimblescape/course-vscode/blob/main/CONTRIBUTING.md) · [Support](https://github.com/nimblescape/course-vscode/blob/main/SUPPORT.md) · [Issues](https://github.com/nimblescape/course-vscode/issues) · [Source](https://github.com/nimblescape/course-vscode)

© 2026 Hannes Stauss (scalarion@nimblescape.com) · [MIT License](https://github.com/nimblescape/course-vscode/blob/main/LICENSE).
