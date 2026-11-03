# @nimblescape/course

The command `cs` and its library keep the files of a course in a Git
repository in one form for people, AI agents and programs, as the VS Code
extension
[nimblescape Course](https://github.com/nimblescape/course-vscode) does. The
command prints the rules of the files for AI agents, checks the files
against their form, writes the comment of the format, reads a course into
JSON for programs in any language, and writes the feedback file of an
assignment for the feedback program.

## Install

Nothing is published yet. Until the first release, build the package from a
clone of the repository at a fixed commit and install the file that
`npm pack` writes:

```sh
git clone https://github.com/nimblescape/course-vscode.git
cd course-vscode
git checkout <commit>
npm ci --ignore-scripts && node esbuild.mjs --production && npm pack ./cli
npm install --global "$PWD/nimblescape-course-<version>.tgz"
```

After the release, `npx -y @nimblescape/course <command>` runs the command
without an installation. `cs` needs Node.js 22 or newer and has no
dependencies.

## Usage

```sh
cs instructions                # lists the topics of the format and of the course
cs instructions assignment     # prints the rules of an assignment README and of the course
cs check                       # checks the course of the current folder
cs check path/to/course
cs format                      # writes the comment of the format into each file
cs format --check
cs read                        # prints the course as JSON
cs read 20-assignments/01-loops/01.01-count
cs read 20-assignments/01-loops/01.01-count/FEEDBACK.md
cs create my-course --language de   # writes the files of a new course
cs feedback --form 20-assignments/01-loops/01.01-count               # prints the form of the answer
cs feedback 20-assignments/01-loops/01.01-count answer.json --commits 3   # writes FEEDBACK.md
```

| Command | Effect |
| --- | --- |
| `instructions [topic]` | Prints the rules of a topic for AI agents: `course`, `chapter`, `assignment`, `objectives`, `feedback`, `tutorial`, `walkthrough`, `plan`, `cheat-sheet` or `overview`. Then it prints the own rules of the course of the current folder: `.course/instructions/all.md` and `.course/instructions/<topic>.md`. Another file of that folder is a topic of the course. Without a topic, it lists the topics. |
| `check [folder]` | Reports each place where a file of the course differs from its form, one line per place: `<file>:<line>: <message> [<code>]`. |
| `format [folder]` | Writes the comment of the format into each file of the course that has none or has one of an older version. |
| `format --check [folder]` | Writes nothing; names each file that needs the comment. |
| `read [path]` | Prints the course, an assignment, a chapter or a feedback file as JSON. The path is the folder of the course, the folder or the README of an assignment, the README of a chapter, or a `FEEDBACK.md`. |
| `create <folder> [--language de\|en]` | Writes the files of a new, empty course into the folder: `.course/course.yml`, `.course/instructions/all.md`, the README of the course, the overviews, the course plan and the cheat sheet, each with the comment of the format. It keeps each file that exists. The language is `en` when the option is missing. |
| `feedback <assignment> <answer>` | For the feedback program: checks the JSON answer of an AI model on the work of a student (the file `<answer>`), computes the score, and writes `FEEDBACK.md` next to the README of the assignment with the comment of the format, or appends an update when the file has a feedback. Options: `--commits <n>` (the commits of the student in `workspace/`, default 0), `--not-running <reason>` (a reason why the work does not run, in the language of the course; the score is then at most 50 %; it may repeat), `--time <DD.MM.YYYY HH:MM>` (default: now, in the local time). |
| `feedback --form <assignment>` | Prints the form of the answer with each requirement and criterion of the assignment, for the prompt of the AI model. The rules of judging print `cs instructions feedback`. |
| `--help` | Shows the help. |
| `--version` | Shows the version of the command and of the format. |

A folder or path is the current folder when it is missing. The folder of a
course is the nearest folder with `.course/course.yml`, else the nearest
folder with `.git`.

The exit code is 0 for success, 1 when `check` found a problem,
`format --check` found a file without the comment or `feedback` rejected the
answer, and 2 for a wrong
command or option, a path that is no part of a course, or a folder that
already holds a course for `create`. With `check`, the
command fits a check of a pull request.

## The format

[docs/format.md](https://github.com/nimblescape/course-vscode/blob/main/docs/format.md)
specifies the files of a course; `cs instructions <topic>` prints its
sections of a topic. Each file of a course starts with a comment that names
the format and tells AI agents the command of its rules:

```markdown
<!-- nimblescape-course v1.0.0 assignment spec=https://github.com/nimblescape/course-vscode/blob/main/docs/format.md
This comment marks a file of a course in the format of the nimblescape course module.
AI agents: before you read, change or write this file, print its rules with
npx -y @nimblescape/course instructions assignment
and follow them. Keep this comment as it is.
-->
```

## Library

Programs read a course with the same reader through the library of the
package, with `require` or `import`. Loading it runs nothing, and the package
has the types of TypeScript.

```js
import { readCourse, readAssignment, readFeedback, checkCourse, topicText } from '@nimblescape/course';

const course = readCourse('path/to/course');
for (const assignment of course.assignments) {
  console.log(assignment.number, assignment.title, assignment.requirements.length);
}
const problems = checkCourse('path/to/course');
```

| Function | Returns |
| --- | --- |
| `readCourse(folder)` | The course: its name, language, chapters with their learning objectives, and assignments. |
| `readAssignment(folder)` | One assignment with its objectives, requirements, rules, criteria and feedback, or `undefined`. |
| `readFeedback(file)` | The entries of a `FEEDBACK.md`: the first feedback and each update, with the status of each requirement and the score, or `undefined`. |
| `checkCourse(folder)` | Each place where a file of the course differs from its form, as `cs check` reports it. |
| `topicText(topic, folder?)` | The rules of a topic, as `cs instructions <topic>` prints them, or `undefined` for an unknown topic. With a folder, the text ends with the own rules of the course of that folder. |

## Third-party code

The command contains the Markdown parser markdown-it with the packages that
it uses, and the YAML parser yaml. `THIRD-PARTY-NOTICES.md` in the package
names their licenses.

---

[Source and documentation](https://github.com/nimblescape/course-vscode) ·
[Change log](https://github.com/nimblescape/course-vscode/blob/main/CHANGELOG.md) ·
[Issues](https://github.com/nimblescape/course-vscode/issues) ·
[Support](https://github.com/nimblescape/course-vscode/blob/main/SUPPORT.md)

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/course-vscode/blob/main/LICENSE).
