<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# The format of the files of a course

These are the rules for the files of a course in a Git repository. Programs
read the README of the course, the README of each chapter, the README of each
assignment and the feedback file of each assignment. People read the tutorial
pages, the walkthroughs, the course plan, the cheat sheet and the overviews of
the folders. The rules are for people and for AI agents. The course module of
nimblescape reads the files as structured data, and `cs check` reports each
place where a file differs from these rules. Print the rules of one topic with
`npx -y @nimblescape/course instructions <topic>`; the topics are `course`,
`chapter`, `assignment`, `objectives`, `feedback`, `tutorial`, `walkthrough`,
`plan`, `cheat-sheet` and `overview`.

A course keeps only its own rules in its repository, in the folder
`.course/instructions/` (section 2): its students, its language, its
conventions and the topics of its chapters. The forms of the files are the
rules of this document, and a course does not copy them. `cs create <folder>`
writes the files of a new course.

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
  `chapter`, `assignment`, `feedback`, `tutorial`, `walkthrough`, `plan`,
  `cheat-sheet` or `overview`, and it decides the rules of the file. The
  command in the comment prints the rules of that kind and the own rules of
  the course.
- The comment stands at the start of the file, with a blank line after it.
  The comment of another format, for example of nimblescape Markdown Notes
  in a README with notes, may stand before or after it; both stand at the
  start of the file, in any order. The README files of a course have no
  front matter, because GitHub shows a front matter as a table. GitHub and
  the Markdown preview do not show the comment.
- The version is a semantic version. A higher major version is a form that an
  older version reads wrongly; a higher minor version adds optional parts
  that an older version reads and keeps; a higher patch version changes only
  the words of the comment or of this document. A program writes the comment
  anew only when its own version is higher than the version in the file. A
  program that finds a higher major version changes nothing in the file and
  says why.
- `cs format` writes the comment into each file of a course that has none,
  and the course extension of VS Code writes it when a file of a course is
  saved.

## 2. The settings of a course

The file `.course/course.yml` holds the settings of a course. The folder
`.course/` holds only the files of the course module: the settings and the
own rules of the course.

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
| `tutorials` | The pattern of the tutorial pages. | `10-course/10-tutorials/*/*.md` |
| `walkthroughs` | The pattern of the README files of the walkthroughs. | `10-course/20-sessions/*/README.md` |
| `plan` | The README of the walkthroughs with the course plan. | `10-course/20-sessions/README.md` |
| `cheat-sheet` | The cheat sheet. | `reference-material/10-cheat-sheet.md` |
| `overviews` | The patterns of the overviews of the folders. | `10-course/README.md`, `10-course/10-tutorials/README.md`, `20-assignments/README.md`, `20-assignments/*/README.md`, `reference-material/README.md` |

A pattern is a path relative to the folder of the course; `*` stands for any
part of one name and `**` for any number of folders. A pattern may also be a
list of patterns. When a file matches several patterns, the first field of the
table decides its kind: the README of a chapter matches the pattern of the
tutorial pages too, and it is a chapter. The kind in the comment of the format
of a file wins over the patterns: a file with a comment is read with the rules
of its kind, wherever it is. The patterns find the files that have no comment
yet, so that `cs check` reports them and `cs format` writes their comment.

*The own rules of a course.* The folder `.course/instructions/` holds the
rules of the course that this document does not give, in Markdown files:

- `all.md` holds the rules for every file of the course, for example its
  students, its language, its conventions of code and which concepts a
  chapter may use.
- `<topic>.md` holds the rules for the files of one topic, for example
  `chapter.md` or `assignment.md`.
- A file with another name is a topic of the course, for example
  `essentials.md`.

`cs instructions <topic>` prints the rules of the topic from this document,
then `all.md`, then `<topic>.md`. Without a topic it lists the topics of this
document and of the course. The comment of the format in each file names the
command, so an AI agent finds the own rules of the course through it. The
folder starts with a dot like `.github/`, so the rules for the authors of the
course stay apart from the material for the students.

*A new course.* `cs create <folder> [--language de|en]` writes the files of
a new, empty course into a folder: `.course/course.yml`,
`.course/instructions/all.md`, the README of the course, the overviews of the
folders, the plan of the walkthroughs and the cheat sheet, each with the
comment of the format of its kind. It keeps each file that exists, and it
writes nothing into a folder that already holds `.course/course.yml`.

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
| Assignment | Example | `## Beispiellauf`, `## Erwartete Ausgabe` or `## Designvorlage` | `## Example Run`, `## Expected Output` or `## Design Reference` |
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
| Tutorial page | Common mistakes | `## Häufige Fehler` | `## Common Mistakes` |
| Tutorial page | Try it | `## Probier es aus` | `## Try It` |
| Walkthrough | Title | `# Walkthrough: <name>` | `# Walkthrough: <name>` |
| Walkthrough | Chapter | `**Kapitel:**` | `**Chapter:**` |
| Walkthrough | Double lessons | `**Doppelstunden:**` | `**Double lessons:**` |
| Walkthrough | Inputs | `**Inputs:**` or `**Input:**` | `**Inputs:**` or `**Input:**` |
| Walkthrough | Learning objectives | `## Lernziele` | `## Learning Objectives` |
| Walkthrough | Before you start | `## Vorbereitung` | `## Before You Start` |
| Walkthrough | Opening question | `## Einstiegsfrage (optional)` | `## Opening Question (optional)` |
| Walkthrough | Input | `## Input – <name> (≈ <n> min)`, `## Input A – <name> (≈ <n> min)` | `## Input – <name> (≈ <n> min)`, `## Input A – <name> (≈ <n> min)` |
| Walkthrough | Hand-off | `### Übergabe`, `### Übergabe A` | `### Hand-off`, `### Hand-off A` |
| Walkthrough | Work time | `## Während der Arbeitszeit` | `## During the Work Time` |
| Walkthrough | Stumbling blocks | `### Stolpersteine` | `### Stumbling Blocks` |
| Walkthrough | Mini-inputs | `### Mini-Inputs bei Bedarf (≤ 5 min)` | `### Mini-Inputs on Demand (≤ 5 min)` |
| Walkthrough | Differentiation | `### Differenzierung` | `### Differentiation` |
| Walkthrough | Closing reflection | `## Abschlussreflexion (optional)` | `## Closing Reflection (optional)` |
| Walkthrough | Material | `## Material` | `## Material` |
| Plan | Course plan | `## Kursplan` | `## Course Plan` |
| Plan | Walkthroughs | `## Walkthroughs` | `## Walkthroughs` |
| Cheat sheet | Title | `# Cheat Sheet` | `# Cheat Sheet` |

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
- *Sections.* The sections are the learning objectives, the example, the
  requirements, the rules and the criteria, with the names of section 3.
  Other sections may stand between them, for example `## Optional Extensions`
  or a section with the steps of the task. The example is optional: an
  assignment whose work is neither a program that prints nor a page, for
  example a drawing of the memory, shows its example inside its task.
- *Learning objectives.* Each item names one objective of the table of its
  own chapter or of an earlier chapter, at most once: its number as a link to
  the table of the chapter, then its level from the table in brackets, then a
  colon and the concrete form of the objective in this assignment:
  `- [08.3](…#lernziele-taxonomie-nach-bloom) (K3 – Anwenden): <text>`. The
  level is a copy of the level in the table of the chapter: when the table
  changes, every assignment that names the objective changes too.
- *Example.* The example of the result of a reference solution: for a
  program that prints, the example run or the expected output, a code block
  with the questions, the answers and the output; for a page, the design
  reference, the description or the picture of the page.
- *Requirements.* A checklist: each requirement is an item `- [ ] …`, a fact
  about the work that a check or a reader can confirm. A program numbers them
  R1 to Rn in their order. A larger assignment groups its requirements under
  headings of the third level inside the section, for example `### Teil A`
  or `### main.ts`. A list without boxes after a paragraph that ends with a
  colon describes the task and is no requirement; every other item of the
  section is an item of the checklist.
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

The feedback program writes the file with `cs feedback <assignment>
<answer>`: the command checks the answer of the AI model (its form prints
`cs feedback --form <assignment>`), computes the score, and writes the first
feedback with the comment of the format or appends an update. It adds the
comment of the format to an older file without it.

### Judging the work

These rules are for the AI model of the feedback program and for every
person or AI agent that writes feedback on an assignment. The own rules of
the course for feedback (`.course/instructions/feedback.md`) win over these
rules, and the README of the assignment wins over both. Give the feedback in
a polite and motivating manner.

The README of an assignment (section 7) has these parts:

- **Learning objectives** – what the student should practise.
- **Example run**, **expected output** or **design reference** – what the
  result looks like. Texts may differ in wording unless the README says they
  are fixed; values, order and structure count.
- **Requirements** – a checklist of verifiable facts, R1, R2, … in their
  order. Only they count towards the score.
- **Rules** – constraints that make the exercise an exercise (which construct
  to use, what is forbidden, which files hold what).
- **Criteria** – usually three, the last one always _Code Quality_ /
  _Codequalität_, C1, C2, … in their order.

The rules of judging:

- **Judge against the README, not against your own taste.** If the README
  says "choose your own songs", any songs are correct.
- **Behaviour first.** A requirement is met when the work _does_ what the
  README asks, for the example and for other sensible inputs. Use the output
  of the checks of the feedback program; read the code where the checks say
  nothing.
- **Respect the rules.** If the work gives the right result but ignores a
  construct the README demands, the requirement is `partly` met. If it uses a
  construct the README forbids, the requirement is `missing`.
- **Creativity is welcome.** Techniques from later chapters are fine as long
  as the README does not forbid them and the learning objective is still met.
- **Accept equivalent approaches** (the own rules of the course give
  examples).
- **Respect names required by the README.** Never suggest renaming a class,
  method, variable, file or CSS class that the README demands.
- **Teach only what the student knows.** Explain with what the chapters up to
  the chapter of the assignment teach. Never make a technique from a later
  chapter a requirement; you may mention it as an outlook in one sentence.
- **Partial work:** judge the finished parts and name what is still missing.
- **Commits:** when the README requires a number of commits or one commit per
  step and it is not reached yet, the requirement is `missing`, and the
  comment encourages the student to commit after every step – never as a
  failure.
- Mention extra effort and optional extensions under the suggestions; they do
  not change any status.

### Statuses and score

Each requirement gets one status: `met` (✅), `partly` (⚠️) or `missing` (❌).
The status agrees with its comment: when the comment names something that is
missing, wrong or against a rule of the README, the status is `partly` or
`missing`, never `met`. `cs feedback` computes the score from the statuses:
met 1 point, partly ½, missing 0, divided by the number of requirements. It
limits the score to 50 % when a check of the feedback program shows that the
work does not run. Never write a score or a percentage yourself. Be strict on
requirements and generous on creativity.

### Best practices

The best practices of each technology (the feedback program gives them as
skills) are a part of the feedback whenever they are relevant, even if the
README does not mention them, and they judge the criterion _Code Quality_.
They never change a status. An alternative that the own rules of the course
accept is never presented as a mistake. A topic of a best practice that the
course has not taught yet by the chapter of the assignment is at most a short
hint.

**Correct code with a better form.** Code can be correct and still not use
the form that fits best: an index loop where only the values matter, a loop
where an array method fits better, a shorthand before the chapter that
teaches it, or a form that type stripping cannot run. This never lowers the
score and never changes a status. Every such case gets one short hint (💡) in
the same shape:

1. Name what the student used, with the code of the student.
2. Say that it is correct and that the program works.
3. Give the reason in one short sentence, without a long explanation, and
   name the chapter that explains it in more detail ("in a later course" when
   the course has none).
4. Give the recommendation and show it with the names of the student. Only
   for a form that type stripping cannot run is it general: "That is why … is
   normally recommended:". In every other case, the better form depends on the
   context: say why it fits better in this code ("That is why … fits better
   here:").

> You use an index loop (`for (let i = 0; i < songs.length; i++)`). This is
> correct JavaScript, and your program works. But here only the values
> matter, so the index is not needed, a case we explain in more detail in
> chapter N. That is why `for … of` fits better here:

Recommend only a form that the course has taught by the chapter of the
assignment:

- **The chapter that introduces a form** gets no hint for that form, even
  where another form would fit better – an index loop in the chapter that
  introduces index loops is fine.
- **A better form that is not taught yet** is never recommended: no hint. The
  only exception is a form that type stripping cannot run: its hint ends after
  step 3, without a recommendation.
- **Where both forms fit equally well**, as in the equivalent approaches of
  the own rules of the course, give no hint.

**A more advanced form than the assignment trains.** When the assignment
trains a form and the student uses a more advanced one – `for … of` or an
array method where the assignment trains the index loop – the feedback is
positive and still teaches what the assignment trains: praise the advanced
form, then show the trained form with the names of the student and say when
it is needed.

> You use `for … of` – a good choice, because here only the values matter.
> This assignment trains the index loop, which you need when the position
> matters, for example to number the songs:

When the README demands the trained form, the rule "Respect the rules" still
decides the status.

### Language and tone

- Write every text in the language of the course, simple and clear: short
  sentences, no jargon without explanation.
- Start with what works well, then guide towards improvements. Never use
  harsh words; use the soft phrases of the own rules of the course.
- Technical terms of JavaScript, HTML and CSS are the terms of MDN Web Docs
  (developer.mozilla.org). Where the course material uses another term, use
  the MDN term: for example template literal, type selector, selector list,
  next-sibling combinator. Terms that only React has are the terms of
  react.dev: component, props, state, hook, effect, key.
- Code examples use English identifiers, English comments and real code of
  the course, written in the conventions of the course.
- Keep it compact: one sentence per requirement and criterion, at most three
  suggestions, and a summary of one or two encouraging sentences without a
  score.

## 9. A tutorial page

A tutorial page explains one topic of a chapter to the students. It is a file
`<chapter>.<n>-<topic>.md` in the folder of its chapter, next to the README of
the chapter, for example `08.02-while-loops.md`: the number of the chapter, a
dot, the number of the page in the chapter with two digits, and the topic in
lowercase English words with hyphens. Its comment of the format has the kind
`tutorial`.

```markdown
# while-Loops

Eine `while`-Loop wiederholt Statements, solange eine Bedingung gilt …

📺 _Video-Tutorial: folgt in Kürze._

## Die Bedingung

## Häufige Fehler

## Probier es aus

📖 MDN: [while](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/while)
```

- *Title.* A heading of the first level with the name of the topic.
- *Introduction.* One or two short paragraphs: what the page explains and
  why it matters.
- *Video.* After the introduction, a paragraph that starts with 📺: the link
  to the video of the page, or a placeholder until the video exists.
- *Sections.* One section of the second level for each concept of the page,
  with a short explanation and small examples that work. A page explains
  only what the course has taught up to its chapter, and what the page
  itself teaches.
- *Common mistakes* and *Try it* are optional sections with the names of
  section 3: the typical mistakes with their fixes, and a small exercise for
  the playground of the students.
- *Documentation.* The last paragraph before the end of the page may start
  with 📖 and link the documentation of the topic, for example MDN.
- The README of the chapter links each tutorial page in its section of the
  tutorials, in the order of the numbers. The walkthrough of the chapter
  shows each concept of the page in one of its inputs, with a link to the
  section of the page.

## 10. A walkthrough

A walkthrough is the guided path of the teacher through the tutorial pages
of one chapter: short live demonstrations, the hand-off to the assignments
and the work time. Each walkthrough is the README of its own folder, which
also holds the files that the teacher writes live during an input. Its
comment of the format has the kind `walkthrough`.

```markdown
# Walkthrough: Types

**Kapitel:** [03 – Types](../../10-tutorials/03-types/README.md)\
**Doppelstunden:** 2 (Doppelstunden 6–7 des [Kursplans](../README.md#kursplan))\
**Inputs:** A – Types sehen und umwandeln (≈ 30 min) · B – undefined, null und NaN (≈ 15 min)

## Lernziele

## Vorbereitung

## Einstiegsfrage (optional)

## Input A – Types sehen und umwandeln (≈ 30 min)

1. **Den Type sehen** (≈ 4 min) –
   [03.01 › Den Type sehen](../../10-tutorials/03-types/03.01-number-string-boolean.md#den-type-sehen)
   - Zeigen: Hover über `age`, `typeof` für Zahl, String und Boolean.
   - Kernpunkt: Jeder Wert hat einen Type.

### Übergabe A

## Input B – undefined, null und NaN (≈ 15 min)

### Übergabe B

## Während der Arbeitszeit

### Stolpersteine

### Mini-Inputs bei Bedarf (≤ 5 min)

### Differenzierung

## Abschlussreflexion (optional)

## Material
```

- *Lessons.* The course is taught in double lessons of 2 × 50 minutes. A
  double lesson starts with at most one input of at most 30 minutes, input A
  or B of the current chapter; the rest of the double lesson is work time.
  During the work time the teacher coaches single students and gives a
  mini-input of at most 5 minutes when several students have the same
  problem. A chapter takes one or more double lessons.
- *Title.* `# Walkthrough: <name of the chapter>`.
- *Head.* One paragraph with three lines: the link to the README of the
  chapter, the number of double lessons with their numbers in the course
  plan, and the inputs with their letters, names and minutes. A chapter with
  one input writes `**Input:**`.
- *Learning objectives.* The learning objectives of the chapter as a list,
  in short words for the teacher.
- *Before you start.* What the students must have done, and what the
  teacher prepares.
- *Opening question* (optional). A question that activates what the
  students know, in two or three minutes.
- *Inputs.* `## Input – <name> (≈ <n> min)` for one input, or
  `## Input A – …`, `## Input B – …` for several, each of at most 30
  minutes. An input is a numbered list of steps. A step names its topic in
  bold, its minutes and the links to the sections of the tutorial pages that
  it shows, and has two items: what the teacher shows ("Zeigen:", "Show:")
  and the key point ("Kernpunkt:", "Point:"). The last step is the hand-off.
- *Hand-off.* A section of the third level in each input,
  `### Übergabe A` or `### Hand-off A`: which assignment the students start,
  and that an assignment is finished when each requirement of its README is
  met.
- *Work time.* The section of the work time has three sections of the third
  level: the stumbling blocks of the students, the mini-inputs on demand,
  and the differentiation, with tasks for fast and for slower students.
- *Closing reflection* (optional). A short round at the end of a double
  lesson or of the chapter.
- *Material.* Links to the chapter, to its assignments and to documentation.
- Other sections may stand between them, for example a presentation round in
  the final project.
- Each concept of each tutorial page of the chapter is shown in one of the
  inputs. When a tutorial page gains a concept, the walkthrough gains it in
  the same change. The videos of the course are recorded from the inputs.

## 11. The course plan

The README of the folder of the walkthroughs holds the course plan. Its
comment of the format has the kind `plan`.

- It may explain how a double lesson works and how a walkthrough is built,
  for the teachers of the course.
- *Course plan.* The section `## Kursplan` or `## Course Plan` has a table
  with three columns: the double lesson, the input, and the assignments that
  the students work on. A double lesson without an input names the
  mini-inputs on demand or a presentation round in the column of the input.
  A sentence after the table gives the number of double lessons of the
  course.
- *Walkthroughs.* The section `## Walkthroughs` links each walkthrough, in
  the order of the chapters, with its number of double lessons.
- The numbers of the double lessons in the head of each walkthrough are the
  numbers of its rows in the course plan. When a chapter needs more or fewer
  double lessons, the course plan changes in the same change.

## 12. The cheat sheet

The cheat sheet is a side note for the students while they work on the
assignments: the syntax, the names and the rules of the course in short
form, one section per chapter. It is no reference: the explanations and
complete examples are in the chapters. Its comment of the format has the
kind `cheat-sheet`.

```markdown
# Cheat Sheet

<One or two sentences: short notes for the assignments, one section per
chapter; the explanations and the examples are in the chapters.>

## Loops (08)

<one section per chapter, in the order of the chapters>
```

- *Title.* `# Cheat Sheet`, then one or two sentences.
- *Sections.* One section for each chapter, in the order of the chapters.
  The heading is the name of the chapter as in its README and its number in
  brackets: `## Loops (08)`.
- *Content*, each part optional, in this order: one code block of at most 10
  lines, one construct per line with a short comment at the end of the line
  that says what it is or what it does, never a complete program; one table
  of at most 10 rows, a look-up list with the code or the case in its first
  column (two tables only in the section of the last chapter); at most four
  items of a list with rules and typical mistakes, one or two lines each.
- *Last paragraph.* It starts with 📖, links the README of the chapter and at
  most two pages of documentation:
  `📖 [08 – Loops](../10-course/10-tutorials/08-loops/README.md) · MDN: [Loops and iteration](<url>)`.
- A section has at most 25 lines without its blank lines and without its last
  paragraph.
- Not in a cheat sheet: explanations of why, complete examples, several
  examples of the same thing, pictures and exercises. A section uses only
  what the course has taught up to its chapter, with the names of the
  documentation that it links.
- When a chapter changes its syntax or its rules, its section changes in the
  same change.

## 13. An overview

An overview is the README of a folder that leads to the files of the folder:
for example the folder of the course material, of the chapters, of the
assignments, of the assignments of one chapter, or of the reference material.
Its comment of the format has the kind `overview`.

- A title, a short introduction, and a list of links with one line about
  each file.
- It links each other Markdown file of its folder and the README of each
  folder inside it, in the order of their names. When a chapter, an
  assignment or a page is added, removed or renamed, the overview changes in
  the same change.
- The course plan (section 11) is the overview of the walkthroughs.

## 14. Checks

`cs check [folder]` reports each place where a file of a course differs
from these rules, with the file and the line:

- a missing comment of the format, a comment with an unknown kind, or a
  comment of a higher major version;
- a missing section, title or chapter link, except the optional example of
  an assignment;
- an objective of a chapter whose number, level or columns do not have the
  form of section 5, and a number that two objectives share;
- an objective of an assignment that no table of a chapter has, a level that
  differs from the level in the table, an objective that the list names
  twice, and an item that does not have the form of section 7;
- requirements without an item of the checklist, a requirement that is no
  item of the checklist, a criterion that does not
  have the form `- **<name>:** <text>`, and a mark of objectives that names a
  number outside the list of the assignment, is not sorted, has the wrong
  word or stands in another place;
- a feedback file without the comment of the format, without one of its
  sections or its score, or whose items of the requirements are not numbered
  from 1 in their order;
- a tutorial page without its title or its video, with a name that does not
  start with the number of its chapter, or that the README of its chapter
  does not link;
- a walkthrough without its title, its head, its sections, a hand-off in
  each input or the minutes of an input; an input of more than 30 minutes;
  and a tutorial page of its chapter that it does not link;
- a course plan without its table of three columns;
- a cheat sheet without a section of a chapter, a section whose heading is
  not the name and the number of a chapter or that stands out of the order
  of the chapters, a section without its last paragraph with the link to its
  chapter, and a section over its limits of code blocks, tables, items and
  lines;
- an overview or a course plan that does not link a Markdown file or a README
  of a folder of its folder;
- a field of `.course/course.yml` that the module does not know, and a
  language that it does not know.

The course extension of VS Code shows the same checks as warnings in the text
editor, after a pause in typing.

## Sources

- Krathwohl, D. R. (2002). A revision of Bloom's taxonomy: An overview.
  *Theory Into Practice, 41*(4), 212–218.
  <https://doi.org/10.1207/s15430421tip4104_2>
