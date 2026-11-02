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

  it('prints the sources with the topics that cite them', () => {
    expect(topicText('objectives')).toContain('## Sources');
    expect(topicText('objectives')).toContain('https://doi.org/10.1207/s15430421tip4104_2');
    expect(topicText('feedback')).not.toContain('## Sources');
  });

  it('lists the topics, and knows no other topic', () => {
    expect(topicList('course')).toContain('  assignment  ');
    expect(topicList('course')).toContain('Print one: course instructions <topic>');
    expect(topicText('lesson')).toBeUndefined();
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
