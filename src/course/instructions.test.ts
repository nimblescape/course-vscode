// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { commentLines } from './comment';
import { topicList, topicText, topics } from './instructions';
import { languages } from './languages';

const format = fs.readFileSync(path.resolve(__dirname, '../../docs/format.md'), 'utf8');

describe('the instructions', () => {
  it('prints each topic with the start of the document and its sections', () => {
    for (const topic of topics) {
      const text = topicText(topic.name)!;
      expect(text.startsWith('# The format of the files of a course')).toBe(true);
      for (const number of topic.sections) {
        expect(text).toMatch(new RegExp(`^## ${number}\\. `, 'm'));
      }
      expect(text).not.toContain('SPDX-License-Identifier');
    }
  });

  it('keeps the examples of a section whole, with the headings inside their code blocks', () => {
    const assignment = topicText('assignment')!;
    const example = assignment.slice(assignment.indexOf('## 7. '), assignment.indexOf('## 14. '));
    expect(example).toContain('## Anforderungen');
    expect(example).toContain('## Kriterien');
    expect(topicText('feedback')).toContain('### Judging the work');
  });

  it('prints the sources with the topics that cite them', () => {
    expect(topicText('objectives')).toContain('## Sources');
    expect(topicText('objectives')).toContain('https://doi.org/10.1207/s15430421tip4104_2');
    expect(topicText('feedback')).not.toContain('## Sources');
  });

  it('lists the topics, and knows no other topic', () => {
    expect(topicList('cs')).toContain('  assignment  ');
    expect(topicList('cs')).toContain('  cheat-sheet ');
    expect(topicList('cs')).toContain('Print one: cs instructions <topic>');
    expect(topicList('cs')).toContain('Start a new course: cs create <folder> [--language de|en]');
    expect(topicText('lesson')).toBeUndefined();
  });

  it('adds the own rules of the course for every file and for the topic, and the topics of the course', () => {
    const rules = new Map([
      ['all', '## Language\n\nGerman texts.'],
      ['walkthrough', '## Videos\n\nThe videos follow the inputs.'],
      ['essentials', '# Essentials\n\nFrom another repository.'],
    ]);
    const text = topicText('walkthrough', rules)!;
    expect(text.indexOf('## 10. A walkthrough')).toBeLessThan(text.indexOf('# The rules of this course'));
    expect(text.indexOf('German texts.')).toBeLessThan(text.indexOf('The videos follow the inputs.'));
    expect(text).toContain('`all.md` for every file and `walkthrough.md`');
    expect(topicText('chapter', rules)).toContain('German texts.');
    expect(topicText('chapter', rules)).not.toContain('The videos follow the inputs.');
    expect(topicText('chapter')).not.toContain('# The rules of this course');
    expect(topicText('essentials', rules)).toMatch(/^# The rules of this course/);
    expect(topicText('all', rules)).toBeUndefined();
    expect(topicList('cs', rules)).toContain('Topics of this course, from .course/instructions/:');
    expect(topicList('cs', rules)).toMatch(/ {2}essentials +Essentials/);
  });
});

describe('docs/format.md', () => {
  it('shows the comment of the format as the module writes it', () => {
    expect(format).toContain(commentLines('assignment').join('\n'));
  });

  it('names each section of each language that the module knows (section 3)', () => {
    const table = format.slice(format.indexOf('## 3. '), format.indexOf('## 4. '));
    for (const language of Object.values(languages)) {
      const names = [
        ...Object.values(language.chapter).flat().map((name) => `\`## ${name}\``),
        `\`# ${language.assignment.heading}\``,
        `\`**${language.assignment.due}:**\``,
        `\`**${language.assignment.chapter}:**\``,
        ...[language.assignment.objectives, language.assignment.exampleRun, language.assignment.requirements, language.assignment.rules, language.assignment.criteria].flat().map((name) => `\`## ${name}\``),
        `(${language.mark.one} `,
        `(${language.mark.many} `,
        `\`## ${language.feedback.assessment}\``,
        `\`## ${language.feedback.bestPractices}\``,
        `\`## ${language.feedback.suggestions}\``,
        `\`## ${language.feedback.summary}\``,
        `\`**${language.feedback.run}:**\``,
        `**${language.feedback.score}: <n> %**`,
        ...[language.tutorial.mistakes, language.tutorial.tryIt].flat().map((name) => `\`## ${name}\``),
        `\`# ${language.walkthrough.title}: <name>\``,
        ...[language.walkthrough.chapter, language.walkthrough.lessons, ...language.walkthrough.inputs].map((name) => `\`**${name}:**\``),
        ...[language.walkthrough.objectives, language.walkthrough.prepare, language.walkthrough.opening, language.walkthrough.workTime, language.walkthrough.closing, language.walkthrough.material]
          .flat()
          .map((name) => `\`## ${name}\``),
        `\`## ${language.walkthrough.input} – <name> (≈ <n> min)\``,
        `\`### ${language.walkthrough.handOff}\``,
        ...[language.walkthrough.stumbling, language.walkthrough.miniInputs, language.walkthrough.differentiation].flat().map((name) => `\`### ${name}\``),
        ...[language.plan.coursePlan, language.plan.walkthroughs].flat().map((name) => `\`## ${name}\``),
        `\`# ${language.cheatSheet}\``,
      ];
      for (const name of names) {
        expect(table, `${language.code}: ${name}`).toContain(name);
      }
    }
  });

  it('names the levels of each language (section 6)', () => {
    const table = format.slice(format.indexOf('## 6. '), format.indexOf('## 7. '));
    languages.de.levels.forEach((names, index) => {
      expect(table).toContain(`| K${index + 1} | ${names[0]} | ${languages.en.levels[index][0]}`);
    });
  });
});
