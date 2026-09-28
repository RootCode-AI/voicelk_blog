import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import ini from 'highlight.js/lib/languages/ini';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import plaintext from 'highlight.js/lib/languages/plaintext';
import powershell from 'highlight.js/lib/languages/powershell';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

// The languages this project actually writes about; each one adds to the bundle.
export const LANGUAGES = [
  { id: 'python', label: 'Python', lang: python },
  { id: 'javascript', label: 'JavaScript', lang: javascript, aliases: ['js', 'jsx'] },
  { id: 'typescript', label: 'TypeScript', lang: typescript, aliases: ['ts', 'tsx'] },
  { id: 'java', label: 'Java', lang: java },
  { id: 'bash', label: 'Bash', lang: bash, aliases: ['sh', 'shell', 'console'] },
  { id: 'powershell', label: 'PowerShell', lang: powershell, aliases: ['ps1', 'pwsh'] },
  { id: 'json', label: 'JSON', lang: json },
  { id: 'yaml', label: 'YAML', lang: yaml, aliases: ['yml'] },
  { id: 'xml', label: 'HTML / XML', lang: xml, aliases: ['html', 'svg'] },
  { id: 'css', label: 'CSS', lang: css },
  { id: 'sql', label: 'SQL', lang: sql },
  { id: 'cpp', label: 'C / C++', lang: cpp, aliases: ['c', 'cuda'] },
  { id: 'dockerfile', label: 'Dockerfile', lang: dockerfile, aliases: ['docker'] },
  { id: 'ini', label: 'INI / TOML', lang: ini, aliases: ['toml', 'properties'] },
  { id: 'markdown', label: 'Markdown', lang: markdown, aliases: ['md'] },
  { id: 'plaintext', label: 'Plain text', lang: plaintext, aliases: ['text', 'txt'] },
];

for (const { id, lang, aliases } of LANGUAGES) {
  hljs.registerLanguage(id, lang);
  if (aliases) hljs.registerAliases(aliases, { languageName: id });
}

const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

// Returns HTML that highlight.js has already escaped.
export function highlight(code, language) {
  if (language && hljs.getLanguage(language)) {
    return hljs.highlight(code, { language, ignoreIllegals: true }).value;
  }
  return escapeHtml(code);
}

export const languageLabel = (id) =>
  LANGUAGES.find((l) => l.id === id || l.aliases?.includes(id))?.label ?? (id || 'Code');
