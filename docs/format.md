<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# The format of the files of a course

These are the rules for the files of a course in a Git repository: the
README of the course, the README of each chapter, the README of each
assignment and the feedback file of each assignment. They are for people and
for AI agents. The course module of nimblescape reads these files as
structured data, and `course check` reports each place where a file differs
from these rules. Print the rules of one topic with
`npx -y @nimblescape/course instructions <topic>`; the topics are `course`,
`chapter`, `assignment`, `objectives` and `feedback`.

A course keeps only its own rules in its repository: its students, its
language, its conventions and the topics of its chapters. The forms of the
files are the rules of this document, and a course does not copy them.

## 1. The comment of the format

Each README of a course and each feedback file holds a comment that names the
format, like a DOCTYPE:

```markdown
<!-- nimblescape-course v1.0.0 assignment spec=https://github.com/nimblescape/course-vscode/blob/main/docs/format.md
This comment marks a file of a course in the format of the nimblescape course module.
AI agents: before you read, change or write this file, print its rules with
npx -y @nimblescape/course instructions assignment
and follow them. Keep this comment as it is.
-->
```

- The first line names the format `nimblescape-course`, its version, the
  kind of the file and the address of this document. The kind is `course`,
  `chapter`, `assignment` or `feedback`, and it decides the rules of the
  file. The command in the comment prints the rules of that kind.
- The comment stands at the start of the file, with a blank line after it.
  The README files of a course have no front matter, because GitHub shows a
  front matter as a table. GitHub and the Markdown preview do not show the
  comment.
- The version is a semantic version. A higher major version is a form that an
  older version reads wrongly; a higher minor version adds optional parts
  that an older version reads and keeps; a higher patch version changes only
  the words of the comment or of this document. A program writes the comment
  anew only when its own version is higher than the version in the file. A
  program that finds a higher major version changes nothing in the file and
  says why.
- `course format` writes the comment into each README of a course that has
  none, and the course extension of VS Code writes it when a README of a
  course is saved.

## 2. The settings of a course

The file `.course/course.yml` holds the settings of a course. The folder
`.course/` holds only the files of the course module.

```yaml
course: ts-2
language: de
chapters: 10-course/10-tutorials/*/README.md
assignments: 20-assignments/*/*/README.md
```

| Field | Meaning | Default |
| --- | --- | --- |
| `course` | The name of the course. | The name of the folder of the course |
| `language` | The language of the course: `de` or `en`. It decides the names of the sections (section 3). | The language whose names the files use |
| `readme` | The README of the course. | `README.md` |
| `chapters` | The pattern of the README files of the chapters. | `10-course/10-tutorials/*/README.md` |
| `assignments` | The pattern of the README files of the assignments. | `20-assignments/*/*/README.md` |

A pattern is a path relative to the folder of the course; `*` stands for any
part of one name and `**` for any number of folders. A pattern may also be a
list of patterns. The kind in the comment of the format of a file wins over
the patterns: a file with a comment is read with the rules of its kind,
wherever it is. The patterns find the files that have no comment yet, so
that `course check` reports them and `course format` writes their comment.

## 3. The names of the sections

Each kind of file has sections with fixed roles. The name of a section is in
the language of the course. A file may have more sections than these, for
example "Zuerst ausprobieren" in a chapter or "Class Diagram" in an
assignment; programs do not read them.

| File | Role | German (`de`) | English (`en`) |
| --- | --- | --- | --- |
| Chapter | Topic overview | `## Themenübersicht` | `## Topic Overview` |
| Chapter | Learning objectives | `## Lernziele (Taxonomie nach Bloom)` | `## Learning Objectives (Bloom's Taxonomy)` |
| Chapter | Tutorials | `## Tutorials` | `## Tutorials` |
| Chapter | Related assignments | `## Zugehörige Aufgaben` | `## Related Assignments` |
| Chapter | Walkthrough | `## Walkthrough für den Unterricht` | `## Classroom Walkthrough` |
| Assignment | Title | `# Aufgabe` | `# Assignment` |
| Assignment | Due date | `**Abgabe:**` | `**Due Date:**` |
| Assignment | Chapter | `**Kapitel:**` | `**Chapter:**` |
| Assignment | Learning objectives | `## Lernziele` | `## Learning Objectives` |
| Assignment | Example run | `## Beispiellauf` or `## Erwartete Ausgabe` | `## Example Run` or `## Expected Output` |
| Assignment | Requirements | `## Anforderungen` | `## Requirements` |
| Assignment | Rules | `## Regeln` | `## Rules` |
| Assignment | Criteria | `## Kriterien` | `## Criteria` |
| Assignment | Mark of one objective | `(Lernziel 08.3)` | `(objective 08.3)` |
| Assignment | Mark of several objectives | `(Lernziele 05.4, 06.4)` | `(objectives 05.4, 06.4)` |
| Feedback | Title | `# Feedback: <title> – <time>` | `# Feedback: <title> – <time>` |
| Feedback | Assessment | `## Bewertung` | `## Assessment` |
| Feedback | Best practices | `## Best Practices` | `## Best Practices` |
| Feedback | Suggestions | `## Vorschläge` | `## Suggestions` |
| Feedback | Summary | `## Zusammenfassung` | `## Summary` |
| Feedback | Update | `## Update – <time>` | `## Update – <time>` |
| Feedback | Program run | `**Ausgeführt:**` | `**Run:**` |
| Feedback | Commits | ``**Commits in `workspace/`:**`` | ``**Commits in `workspace/`:**`` |
| Feedback | Score | `**Ergebnis: <n> %**` | `**Score: <n> %**` |

## 4. The README of the course

The README of the course is the start page of the course: what the course
teaches, how its folders are ordered, and how to begin. Its comment of the
format has the kind `course`. The course module reads no section of it; the
name and the language of the course come from `.course/course.yml`
(section 2).

## 5. The README of a chapter

A chapter is a learning step of a course with its tutorials and its learning
objectives. Its README has the kind `chapter`.

- The title is a heading of the first level with the number and the name of
  the chapter: `# 08 – Loops`. The number has two digits.
- The sections are the topic overview, the learning objectives, the
  tutorials, the related assignments and the walkthrough, with the names of
  section 3.
- The section of the learning objectives is a table with four columns: the
  number, the learning objective, the description and the level.

```markdown
| Nr.  | Lernziel                                                                 | Beschreibung                                      | Stufe         |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------------- | ------------- |
| 08.3 | Die Schüler:innen können Zählschleifen und das Akkumulator-Muster einsetzen. | `for` mit Zähler aufwärts, abwärts und in Schritten. | K3 – Anwenden |
```

- The number is the full number of the objective, `<chapter>.<n>`, for
  example `08.3`: the number of the chapter, a dot and the number of the
  objective in the chapter, from 1. It is the ID of the objective in the
  whole course, so it is unique in the course.
- The learning objective says what a student can do after the chapter.
- The description says how the objective shows in the work of the student.
- The level is `K<n> – <name>` with one of the six levels of the topic
  `objectives`, for example `K3 – Anwenden` or `K3 – Apply`. A program reads
  the level only from its number; the name is for people and must be the
  name of that number in the language of the course.
- The tutorials and the related assignments are lists of links to their
  files.

## 6. Learning objectives and levels

A learning objective names what a student can do after a chapter, and its
level names the thinking that it aims at, on the six levels of the cognitive
process of the revised taxonomy of Bloom (Krathwohl, 2002). A level is not a
scale of difficulty. The levels go from simpler to more complex thinking, but
they may overlap: some processes of understand, for example explaining, are
more complex than executing, a process of apply (Krathwohl, 2002, p. 215).
The revised taxonomy puts evaluate below create: evaluate is K5 and create is
K6.

| Level | German | English | Meaning (Krathwohl, 2002, Table 3) | Cognitive processes (Krathwohl, 2002, Table 3) |
| --- | --- | --- | --- | --- |
| K1 | Erinnern | Remember | Retrieving relevant knowledge from long-term memory. | recognizing, recalling |
| K2 | Verstehen | Understand | Determining the meaning of instructional messages, including oral, written, and graphic communication. | interpreting, exemplifying, classifying, summarizing, inferring, comparing, explaining |
| K3 | Anwenden | Apply | Carrying out or using a procedure in a given situation. | executing, implementing |
| K4 | Analysieren | Analyze (also Analyse) | Breaking material into its constituent parts and detecting how the parts relate to one another and to an overall structure or purpose. | differentiating, organizing, attributing |
| K5 | Bewerten | Evaluate | Making judgments based on criteria and standards. | checking, critiquing |
| K6 | Erschaffen | Create | Putting elements together to form a novel, coherent whole or make an original product. | generating, planning, producing |

A course in British English may write `K4 – Analyse`; the taxonomy writes
"analyze".

Verbs help to choose the level of an objective:

| Level | German verbs | English verbs |
| --- | --- | --- |
| K1 | nennen, benennen, aufzählen, wiedergeben, erkennen | name, list, state, recall, recognize |
| K2 | erklären, mit eigenen Worten beschreiben, zusammenfassen, vergleichen, einordnen, vorhersagen | explain, describe in own words, summarize, compare, classify, predict |
| K3 | anwenden, ausführen, einsetzen, umsetzen, berechnen | apply, carry out, use, implement, calculate |
| K4 | analysieren, unterscheiden, gliedern, zuordnen, die Ursache finden | analyze, differentiate, organize, attribute, find the cause |
| K5 | bewerten, beurteilen, prüfen, begründet auswählen | evaluate, judge, check, choose with a reason |
| K6 | entwerfen, planen, entwickeln, ein eigenes Produkt erstellen | design, plan, develop, produce an own product |

A verb alone does not decide the level: the level follows the process that
the objective asks for. "Describe" is K1 when the student repeats a learned
fact, and K2 when the student explains something new in own words. The
description of the objective decides. A course may add its own rules for its
subject, for example which work in a programming course is K3.

## 7. The README of an assignment

An assignment is a task of a chapter, with its README and its workspace, the
folder `workspace/` with the files of the work of the student. Its README has
the kind `assignment`. The folder of an assignment starts with its number,
the number of its chapter, a dot and the number of the assignment in the
chapter: `08.01-fizz-buzz`.

```markdown
# Aufgabe

**Fizz Buzz** – Zähle von 1 bis 30, aber sag „Fizz“ bei Vielfachen von 3 …

**Abgabe:** TBA

**Kapitel:** [08 – Loops](../../../10-course/10-tutorials/08-loops/README.md)

## Lernziele

- [08.3](../../../10-course/10-tutorials/08-loops/README.md#lernziele-taxonomie-nach-bloom)
  (K3 – Anwenden): Eine Aufgabe mit einer `for`-Loop eine feste Anzahl von Malen wiederholen

## Beispiellauf

## Anforderungen

- [ ] Eine `for`-Loop mit einem Zähler von 1 bis 30. (Lernziel 08.3)

## Regeln

## Kriterien

- **Loop und Bedingungen:** Die Loop läuft genau von 1 bis zur Grenze.
```

- *Title.* The heading of the first level is the word of section 3,
  `# Aufgabe` or `# Assignment`. The first paragraph after it starts with
  the title of the assignment in bold, a dash and the scenario: what the
  student builds and why.
- *Chapter.* A paragraph starts with `**Kapitel:**` or `**Chapter:**` and a
  link to the README of the chapter of the assignment.
- *Sections.* The sections are the learning objectives, the example run (or
  the expected output), the requirements, the rules and the criteria, with
  the names of section 3.
- *Learning objectives.* Each item names one objective of the table of its
  own chapter or of an earlier chapter, at most once: its number as a link to
  the table of the chapter, then its level from the table in brackets, then a
  colon and the concrete form of the objective in this assignment:
  `- [08.3](…#lernziele-taxonomie-nach-bloom) (K3 – Anwenden): <text>`. The
  level is a copy of the level in the table of the chapter: when the table
  changes, every assignment that names the objective changes too.
- *Example run.* A code block with the output of a run of a reference
  solution: the questions, the answers and the output.
- *Requirements.* A checklist: each requirement is an item `- [ ] …`, a fact
  about the work that a check or a reader can confirm. A program numbers them
  R1 to Rn in their order. A larger assignment groups its requirements under
  headings of the third level inside the section, for example `### Teil A`
  or `### main.ts`.
- *Marks of the objectives.* A requirement or a rule names the objectives
  that it serves at the end of its first paragraph: `(Lernziel 08.3)` or
  `(Lernziele 05.4, 06.4)`, in English `(objective 08.3)` or
  `(objectives 05.4, 06.4)`. The numbers are sorted, and each is a number of
  the learning objectives of the assignment. When the first paragraph ends
  with a colon that introduces a list or a code block, the mark stands
  before the colon. An item that serves no objective has no mark.
- *Rules.* A list of the limits that make the exercise an exercise: which
  construct the student uses, what is not allowed, what the program computes
  instead of a typed value.
- *Criteria.* Items `- **<name>:** <text>`. A program numbers them C1 to Cm
  in their order.
- *Workspace.* The files of the work of the student are in the folder
  `workspace/` of the assignment. The README and the feedback file are not
  parts of the work of the student.

## 8. The feedback file

The file `FEEDBACK.md` next to the README of an assignment holds the
feedback on the work of the student. Its comment of the format has the kind
`feedback`. Only the feedback program writes it; a student does not change
it.

- The title is `# Feedback: <title of the assignment> – <time>`, with the
  time as `DD.MM.YYYY HH:MM`.
- The sections are the assessment, the best practices, the suggestions and
  the summary, with the names of section 3.
- The assessment has one item for each requirement, in the order of the
  requirements, with its status, its number, its short text and a comment:
  `- ✅ **1. Eine for-Loop mit einem Zähler von 1 bis 30.** – <comment>`.
  The status is ✅ met, ⚠️ partly met or ❌ missing. Then one item for each
  criterion, `- **<name>:** <comment>`, the item of the program run and the
  item of the number of commits.
- The summary holds the score, `**Ergebnis: 85 %** – <text>` or
  `**Score: 85 %** – <text>`. When a check found that the work does not run,
  a line with ⚠️ before the score says why, and the score is at most 50 %.
- An update after a later push appends a line `---`, the heading
  `## Update – <time>`, a line about the changes, and the same sections one
  level lower (`###`). An update never changes earlier text.

## 9. Checks

`course check [folder]` reports each place where a file of a course differs
from these rules, with the file and the line:

- a missing comment of the format, a comment with an unknown kind, or a
  comment of a higher major version;
- a missing section, title or chapter link;
- an objective of a chapter whose number, level or columns do not have the
  form of section 5, and a number that two objectives share;
- an objective of an assignment that no table of a chapter has, a level that
  differs from the level in the table, an objective that the list names
  twice, and an item that does not have the form of section 7;
- a requirement that is no item of the checklist, a criterion that does not
  have the form `- **<name>:** <text>`, and a mark of objectives that names a
  number outside the list of the assignment, is not sorted, has the wrong
  word or stands in another place;
- a feedback file without the comment of the format, without one of its
  sections or its score, or whose items of the requirements are not numbered
  from 1 in their order;
- a field of `.course/course.yml` that the module does not know, and a
  language that it does not know.

The course extension of VS Code shows the same checks as warnings in the text
editor, after a pause in typing.

## Sources

- Krathwohl, D. R. (2002). A revision of Bloom's taxonomy: An overview.
  *Theory Into Practice, 41*(4), 212–218.
  <https://doi.org/10.1207/s15430421tip4104_2>
