/**
 * Markdown rendering utilities.
 * Handles code blocks, inline code, and basic markdown.
 */
import { escapeHtml } from './dom.js';

const LANG_MAP = {
  js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash',
  rb: 'ruby', yml: 'yaml', md: 'markdown', kt: 'kotlin',
  'c#': 'csharp', 'c++': 'cpp',
};

export function detectLanguage(code) {
  const trimmed = code.trim();
  const firstLine = trimmed.split('\n')[0];
  const shebangMatch = firstLine.match(/^#!\/.*\s(\w+)/);
  if (shebangMatch) return shebangMatch[1].toLowerCase();
  const jsPatterns = [
    /\bconst\s+\w+\s*=\s*require\s*\(/,
    /\bconsole\.\w+\s*\(/,
    /\bfunction\s*\(/,
    /\=>\s*\{/,
    /\bdocument\.\w+\s*\(/,
    /\bwindow\.\w+/,
    /\bimport\s+.*\s+from\s+['"]/
  ];
  const pyPatterns = [
    /\bdef\s+\w+\s*\(/,
    /\bimport\s+\w+/,
    /\bprint\s*\(/,
    /\bself\.\w+/,
    /\bclass\s+\w+.*:/,
    /\bif\s+__name__\s*==/
  ];
  const shellPatterns = [
    /\becho\s+['"]/,
    /\bif\s+\[/,
    /\bfor\s+\w+\s+in\s+/,
    /\bdocker\s+(run|build|pull)/,
    /\bkubectl\s+\w+/,
    /\bnpm\s+(install|run|start)/
  ];
  const rbPatterns = [/\bputs\s+['"]/];
  const ktPatterns = [/\bfun\s+\w+\s*\(/];
  const csPatterns = [/\busing\s+\w+/];
  const cppPatterns = [/\b#include\s*</];
  if (jsPatterns.some(p => p.test(trimmed))) return 'javascript';
  if (pyPatterns.some(p => p.test(trimmed))) return 'python';
  if (shellPatterns.some(p => p.test(trimmed))) return 'bash';
  if (rbPatterns.some(p => p.test(trimmed))) return 'ruby';
  if (ktPatterns.some(p => p.test(trimmed))) return 'kotlin';
  if (csPatterns.some(p => p.test(trimmed))) return 'csharp';
  if (cppPatterns.some(p => p.test(trimmed))) return 'cpp';
  return 'plaintext';
}

export function renderMarkdown(text) {
  if (!text) return '';
  let result = escapeHtml(text);
  result = result.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const trimmedCode = code.trimEnd();
    let detectedLang = lang;
    if (!detectedLang) detectedLang = detectLanguage(trimmedCode);
    else detectedLang = LANG_MAP[lang] || lang;
    return `<div class="code-block" data-language="${escapeHtml(detectedLang)}" data-raw="${escapeHtml(trimmedCode)}"><div class="code-header"><span class="code-lang">${escapeHtml(detectedLang)}</span><button class="copy-code-btn" title="Copy code"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button><button class="show-preview-btn" title="Show preview"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></div><pre><code>${trimmedCode}</code></pre></div>`;
  });
  result = result.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  result = result.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  result = result.replace(/~~(.+?)~~/g, '<s>$1</s>');
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  result = result.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, content) => `<h${hashes.length}>${content}</h${hashes.length}>`);
  result = result.replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>');
  result = result.replace(/^\s*[-*+]\s+\[x\]\s+(.+)$/gm, '<li class="task-item"><input type="checkbox" checked disabled> $1</li>');
  result = result.replace(/^\s*[-*+]\s+\[\s?\]\s+(.+)$/gm, '<li class="task-item"><input type="checkbox" disabled> $1</li>');
  result = result.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  result = result.replace(/^(?!<[a-z])([^<\n]+)$/gm, '<p>$1</p>');
  result = result.replace(/<\/ul>\s*<ul>/g, '\n');
  result = result.replace(/<\/p>\s*<p>/g, '\n');
  return result;
}
