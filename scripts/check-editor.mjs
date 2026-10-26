import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile('index.html', 'utf8');
const scriptTags = [...html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)];
const scripts = scriptTags
  .filter((match) => !/\btype=["']application\/ld\+json["']/.test(match[1] || ''))
  .map((match) => match[2])
  .filter((script) => script.trim());

if (!scripts.length) throw new Error('No inline editor scripts were found.');
scripts.forEach((script) => new vm.Script(script));
scriptTags
  .filter((match) => /\btype=["']application\/ld\+json["']/.test(match[1] || ''))
  .forEach((match) => JSON.parse(match[2]));
console.log(`Editor JavaScript syntax OK (${scripts.length} script).`);
