// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { blocksOf } from './markdown';
import { readAssignment } from './course';
import { readFeedbackBlocks } from './feedback';
import { AnswerError, answerForm, feedbackFile, feedbackPart, parseAnswer, scoreOf, shortText, unmarked } from './feedbackWriter';
import { languages } from './languages';
import type { Assignment } from './types';

const fixture = path.resolve(__dirname, '../../test/fixtures/course-de');
const assignment = readAssignment(path.join(fixture, '20-assignments/02-arrays/02.01-shopping-list')) as Assignment;

/** answer returns a valid answer on the test assignment, with changes of the fields. */
const answer = (changes: Record<string, unknown> = {}): Record<string, unknown> => ({
  requirements: [
    { id: 'R1', comment: 'Das Array hat drei Preise.', status: 'met' },
    { id: 'R2', comment: 'Die Ausgabe fehlt.', status: 'missing' },
    { id: 'R3', comment: 'Die Summe stimmt, der teuerste Artikel fehlt.', status: 'partly' },
  ],
  criteria: [
    { id: 'C1', comment: 'Gut.' },
    { id: 'C2', comment: 'Klar.' },
    { id: 'C3', comment: 'Sauber.' },
  ],
  run: 'Die Ausgabe fehlt noch.',
  best_practices: [{ rating: 'improve', topic: 'Loops', text: 'Nutze for … of.' }],
  suggestions: [{ text: 'Gib jede Zeile aus.', code: 'for (const price of prices) {\n  console.log(price);\n}', language: 'TypeScript' }],
  changes: '',
  summary: 'Ein guter Start!',
  ...changes,
});

describe('the writer of the feedback file', () => {
  it('scores met with 1, partly with ½ and missing with 0, rounded half up, and at most 50 % for work that does not run', () => {
    expect(scoreOf(['met', 'missing', 'partly'], false)).toBe(50);
    expect(scoreOf(['met', 'met', 'partly'], false)).toBe(83);
    expect(scoreOf(['met', 'met', 'partly'], true)).toBe(50);
    expect(scoreOf(['met', 'partly', 'partly', 'missing', 'missing', 'missing', 'missing', 'missing'], false)).toBe(25);
    expect(scoreOf(['met', 'met', 'met', 'met', 'met', 'met', 'met', 'partly'], false)).toBe(94);
  });

  it('shortens a requirement to its first sentence, without bold marks and not inside inline code', () => {
    expect(shortText('Ein **Array** `prices`. Danach mehr.')).toBe('Ein Array `prices`.');
    expect(shortText('Liste:\n- erstens\n- zweitens')).toBe('Liste:');
    expect(shortText('Ruft `a.b()` auf.')).toBe('Ruft `a.b()` auf.');
    const long = 'Dieser Satz ist sehr lang und hat viele Wörter, damit er über die Grenze von neunzig Zeichen geht und gekürzt wird.';
    expect(shortText(long)).toBe('Dieser Satz ist sehr lang und hat viele Wörter, damit er über die Grenze von neunzig …');
  });

  it('prints the form of the answer with each requirement and criterion of the assignment', () => {
    const form = answerForm(assignment, false);
    expect(form).toContain('{"id": "R3", "comment": "…", "status": "met | partly | missing"}');
    expect(form).toContain('every id from C1 to C3 exactly once');
    expect(form).toContain('- `changes`: an empty string.');
    expect(answerForm(assignment, true)).toContain('- `changes`: required, this is an update');
  });

  it('takes an answer inside a fenced block with text around it', () => {
    const text = `Hier ist die Antwort:\n\`\`\`json\n${JSON.stringify(answer())}\n\`\`\`\nFertig.`;
    expect(parseAnswer(text, assignment, false).requirements[2].status).toBe('partly');
  });

  it('rejects an answer that does not have the form', () => {
    const rejected = (value: unknown, update = false): string => {
      try {
        parseAnswer(typeof value === 'string' ? value : JSON.stringify(value), assignment, update);
        return 'accepted';
      } catch (error) {
        expect(error).toBeInstanceOf(AnswerError);
        return (error as Error).message;
      }
    };
    expect(rejected('no json')).toBe('no JSON object');
    expect(rejected(answer({ requirements: [{ id: 'R1', comment: 'x', status: 'met' }] }))).toContain('requirement ids');
    expect(rejected(answer({ requirements: [...(answer().requirements as object[]).slice(0, 2), { id: 'R3', comment: 'x', status: 'done' }] }))).toBe('status "done" of R3');
    expect(rejected(answer({ criteria: [{ id: 'C1', comment: 'x' }] }))).toContain('criteria ids');
    expect(rejected(answer({ best_practices: [] }))).toBe('`best_practices` has 0 entries');
    expect(rejected(answer({ suggestions: [{ text: 'a' }, { text: 'b' }, { text: 'c' }, { text: 'd' }] }))).toBe('`suggestions` has 4 entries');
    expect(rejected(answer({ summary: 'Gut, 80 %!' }))).toContain('percentage');
    expect(rejected(answer(), true)).toBe('`changes` is missing or empty');
  });

  it('writes the first feedback with the comment of the format and an update after it, and the reader reads both', () => {
    const language = languages.de;
    const first = feedbackPart({ answer: parseAnswer(JSON.stringify(answer()), assignment, false), assignment, language, time: '03.11.2026 18:00', commit: 'bf21589', commits: 3, notRunning: [], update: false });
    expect(first.score).toBe(50);
    expect(first.text).toContain('# Feedback: Shopping List – 03.11.2026 18:00 · bf21589\n');
    expect(first.text).toContain('- ❌ **2. ');
    expect(first.text).toContain('```typescript\nfor (const price of prices) {');
    const update = feedbackPart({
      answer: parseAnswer(JSON.stringify(answer({ changes: 'Die Ausgabe ist da.', suggestions: [] })), assignment, true),
      assignment,
      language,
      time: '03.11.2026 19:00',
      commit: undefined,
      commits: 4,
      notRunning: ['die Typprüfung meldet Fehler'],
      update: true,
    });
    expect(update.text).toContain('## Update – 03.11.2026 19:00\n');
    expect(update.text).toContain('Keine weiteren Vorschläge – weiter so!');
    expect(update.text).toContain('⚠️ Die Arbeit läuft noch nicht (die Typprüfung meldet Fehler), daher höchstens 50 %.');
    const file = feedbackFile(feedbackFile(undefined, first.text), update.text);
    expect(file.startsWith('<!-- nimblescape-course v1.1.0 feedback spec=')).toBe(true);
    const { feedback, title, problems } = readFeedbackBlocks(blocksOf(file), 'FEEDBACK.md', language);
    expect(problems).toEqual([]);
    expect(title).toBe('Shopping List');
    expect(feedback.entries.map((entry) => [entry.time, entry.commit, entry.update, entry.score, entry.capped, entry.commits, entry.criteria.length])).toEqual([
      ['03.11.2026 18:00', 'bf21589', false, 50, false, 3, 3],
      ['03.11.2026 19:00', undefined, true, 50, true, 4, 3],
    ]);
  });

  it('writes each status mark once, also when the answer starts its text with the mark', () => {
    expect(unmarked('💡 Nutze for … of.')).toBe('Nutze for … of.');
    expect(unmarked('⚠️ Fast fertig.')).toBe('Fast fertig.');
    expect(unmarked('✅ ❌ Doppelt.')).toBe('Doppelt.');
    expect(unmarked('Nutze 💡 im Text.')).toBe('Nutze 💡 im Text.');
    const part = feedbackPart({
      answer: parseAnswer(
        JSON.stringify(
          answer({
            requirements: [
              { id: 'R1', comment: '✅ Das Array hat drei Preise.', status: 'met' },
              { id: 'R2', comment: 'Die Ausgabe fehlt.', status: 'missing' },
              { id: 'R3', comment: '⚠️ Die Summe stimmt.', status: 'partly' },
            ],
            best_practices: [{ rating: 'improve', topic: 'Loops', text: '💡 Nutze for … of.' }],
            suggestions: [{ text: '💡 Gib jede Zeile aus.' }],
          }),
        ),
        assignment,
        false,
      ),
      assignment,
      language: languages.de,
      time: '04.11.2026 10:00',
      commit: undefined,
      commits: 1,
      notRunning: [],
      update: false,
    });
    expect(part.text).toContain('- 💡 **Loops:** Nutze for … of.');
    expect(part.text).toContain('\n💡 Gib jede Zeile aus.\n');
    expect(part.text).toContain('** – Das Array hat drei Preise.');
    expect(part.text).toContain('** – Die Summe stimmt.');
    expect(part.text).not.toContain('💡 💡');
  });

  it('adds the comment of the format to an older feedback file without it when it appends an update', () => {
    const file = feedbackFile('# Feedback: X – 01.11.2026 10:00\n\n## Bewertung\n', '---\n\n## Update – 02.11.2026 10:00\n');
    expect(file.split('\n')[0]).toBe('<!-- nimblescape-course v1.1.0 feedback spec=https://github.com/nimblescape/course-vscode/blob/main/docs/format.md');
    expect(file).toContain('## Bewertung\n\n---\n\n## Update – 02.11.2026 10:00\n');
  });
});
