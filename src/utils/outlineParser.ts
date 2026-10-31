/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileFormat } from '../types';

export interface OutlineElement {
  id: string;
  label: string;
  type: 'class' | 'function' | 'method' | 'loop' | 'section' | 'tag' | 'key';
  line: number; // 0-indexed line
  indent: number; // Visual nesting indentation level
}

/**
 * Parses the file content and extracts structured symbols (functions, classes, sections, loops, etc.)
 */
export function parseOutline(content: string, format: FileFormat): OutlineElement[] {
  if (!content) return [];

  const lines = content.split('\n');
  const elements: OutlineElement[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Calculate indentation level (using spaces/tabs)
    const leadingWhitespace = rawLine.match(/^\s*/)?.[0] || '';
    const indent = Math.floor(leadingWhitespace.replace(/\t/g, '    ').length / 4);

    const id = `outline-el-${i}-${elements.length}`;

    // --- PYTHON ---
    if (format === 'py') {
      // Classes
      const classMatch = trimmed.match(/^class\s+([a-zA-Z0-9_]+)/);
      if (classMatch) {
        elements.push({
          id,
          label: `class ${classMatch[1]}`,
          type: 'class',
          line: i,
          indent
        });
        continue;
      }
      // Functions / Methods
      const defMatch = trimmed.match(/^def\s+([a-zA-Z0-9_]+)/);
      if (defMatch) {
        elements.push({
          id,
          label: `def ${defMatch[1]}()`,
          type: indent > 0 ? 'method' : 'function',
          line: i,
          indent
        });
        continue;
      }
      // Loops
      if (trimmed.startsWith('for ') && trimmed.endsWith(':')) {
        const loopLabel = trimmed.substring(0, Math.min(trimmed.length, 30)) + (trimmed.length > 30 ? '...' : '');
        elements.push({ id, label: loopLabel, type: 'loop', line: i, indent });
        continue;
      }
      if (trimmed.startsWith('while ') && trimmed.endsWith(':')) {
        elements.push({ id, label: trimmed, type: 'loop', line: i, indent });
        continue;
      }
    }

    // --- KOTLIN ---
    else if (format === 'kt') {
      // Classes/Interfaces
      const classMatch = trimmed.match(/^(?:class|interface|object|enum class)\s+([a-zA-Z0-9_]+)/);
      if (classMatch) {
        elements.push({
          id,
          label: `class ${classMatch[1]}`,
          type: 'class',
          line: i,
          indent
        });
        continue;
      }
      // Functions
      const funMatch = trimmed.match(/^fun\s+([a-zA-Z0-9_]+)/) || trimmed.match(/^(?:private|public|protected|internal|override)?\s*fun\s+([a-zA-Z0-9_]+)/);
      if (funMatch) {
        elements.push({
          id,
          label: `fun ${funMatch[1]}()`,
          type: indent > 0 ? 'method' : 'function',
          line: i,
          indent
        });
        continue;
      }
      // Loops
      if (trimmed.startsWith('for') && trimmed.includes('(')) {
        elements.push({ id, label: trimmed.split('{')[0].trim(), type: 'loop', line: i, indent });
        continue;
      }
      if (trimmed.startsWith('while') && trimmed.includes('(')) {
        elements.push({ id, label: trimmed.split('{')[0].trim(), type: 'loop', line: i, indent });
        continue;
      }
    }

    // --- JAVASCRIPT & TYPESCRIPT ---
    else if (format === 'js' || format === 'ts') {
      // Classes
      const classMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([a-zA-Z0-9_$]+)/);
      if (classMatch) {
        elements.push({
          id,
          label: `class ${classMatch[1]}`,
          type: 'class',
          line: i,
          indent
        });
        continue;
      }
      // Interfaces / Types / Enums
      const interfaceMatch = trimmed.match(/^(?:export\s+)?(interface|type|enum)\s+([a-zA-Z0-9_$]+)/);
      if (interfaceMatch) {
        elements.push({
          id,
          label: `${interfaceMatch[1]} ${interfaceMatch[2]}`,
          type: 'class',
          line: i,
          indent
        });
        continue;
      }
      // Standard Functions
      const funcMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([a-zA-Z0-9_$]+)/);
      if (funcMatch) {
        elements.push({
          id,
          label: `function ${funcMatch[1]}()`,
          type: indent > 0 ? 'method' : 'function',
          line: i,
          indent
        });
        continue;
      }
      // Arrow functions & function expressions assigned to const/let/var
      const arrowOrExprMatch =
        trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*(?::[^=]+)?=>/) ||
        trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*(?::[^=]+)?=\s*(?:async\s+)?function\b/) ||
        trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:React\.)?(?:memo|forwardRef|useCallback)\s*\(/);
      if (arrowOrExprMatch) {
        elements.push({
          id,
          label: `${arrowOrExprMatch[1]}()`,
          type: indent > 0 ? 'method' : 'function',
          line: i,
          indent
        });
        continue;
      }
      // Object property function / method: name: function(...) or name: (...) =>
      const objMethodMatch = trimmed.match(/^([a-zA-Z0-9_$]+)\s*:\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>)/);
      if (objMethodMatch) {
        elements.push({
          id,
          label: `${objMethodMatch[1]}()`,
          type: 'method',
          line: i,
          indent
        });
        continue;
      }
      // Methods inside classes/objects
      const methodMatch = trimmed.match(/^(?:public|private|protected|readonly|static|override|async|get|set|\*|\s)*([a-zA-Z0-9_$]+)\s*\([^;]*\)\s*(?::\s*[^{;]+)?\{/);
      if (
        methodMatch &&
        !['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'sizeof', 'typeof'].includes(methodMatch[1])
      ) {
        elements.push({
          id,
          label: `${methodMatch[1]}()`,
          type: 'method',
          line: i,
          indent
        });
        continue;
      }
      // Loops
      if ((trimmed.startsWith('for ') || trimmed.startsWith('for(') || trimmed.startsWith('while ') || trimmed.startsWith('while(')) && trimmed.includes('(')) {
        elements.push({ id, label: trimmed.split('{')[0].trim(), type: 'loop', line: i, indent });
        continue;
      }
    }

    // --- JAVA / C / C++ / RUST / GO ---
    else if (format === 'java' || format === 'c' || format === 'cpp' || format === 'rs' || format === 'go') {
      const typeMatch = trimmed.match(/^(?:pub\s+|public\s+|private\s+|protected\s+|abstract\s+|final\s+)*(class|struct|interface|enum|trait|impl)\s+([a-zA-Z0-9_<>:]+)/);
      if (typeMatch) {
        elements.push({
          id,
          label: `${typeMatch[1]} ${typeMatch[2]}`,
          type: 'class',
          line: i,
          indent
        });
        continue;
      }
      const fnMatch =
        trimmed.match(/^(?:pub\s+|async\s+|unsafe\s+)*fn\s+([a-zA-Z0-9_]+)/) ||
        trimmed.match(/^func\s+(?:\([^)]+\)\s*)?([a-zA-Z0-9_]+)/) ||
        trimmed.match(/^(?:(?:public|private|protected|static|final|synchronized|virtual|inline|constexpr|explicit)\s+)*(?:[a-zA-Z0-9_<>:*&]+\s+)+([a-zA-Z0-9_~]+)\s*\([^;]*\)\s*(?:const\s*)?(?:throws\s+[^{]+)?\{/);
      if (fnMatch && !['if', 'for', 'while', 'switch', 'catch'].includes(fnMatch[1])) {
        elements.push({
          id,
          label: `${fnMatch[1]}()`,
          type: indent > 0 ? 'method' : 'function',
          line: i,
          indent
        });
        continue;
      }
      if ((trimmed.startsWith('for ') || trimmed.startsWith('for(') || trimmed.startsWith('while ') || trimmed.startsWith('while('))) {
        elements.push({ id, label: trimmed.split('{')[0].trim(), type: 'loop', line: i, indent });
        continue;
      }
    }

    // --- BASH ---
    else if (format === 'bash') {
      // Functions
      const fnMatch = trimmed.match(/^function\s+([a-zA-Z0-9_-]+)/) || trimmed.match(/^([a-zA-Z0-9_-]+)\s*\(\s*\)/);
      if (fnMatch && !['if', 'for', 'while'].includes(fnMatch[1])) {
        elements.push({
          id,
          label: `${fnMatch[1] || fnMatch[2]}()`,
          type: 'function',
          line: i,
          indent
        });
        continue;
      }
      // Loops & If/Fi structures
      if (trimmed.startsWith('for ') || trimmed.startsWith('while ')) {
        elements.push({ id, label: trimmed.split(';')[0].trim(), type: 'loop', line: i, indent });
        continue;
      }
      if (trimmed.startsWith('if ') || trimmed === 'if' || trimmed.startsWith('if [') || trimmed.startsWith('if [[')) {
        elements.push({ id, label: trimmed.substring(0, Math.min(trimmed.length, 30)), type: 'loop', line: i, indent });
        continue;
      }
      if (trimmed === 'fi') {
        elements.push({ id, label: 'fi', type: 'loop', line: i, indent });
        continue;
      }
    }

    // --- LATEX ---
    else if (format === 'tex') {
      const sectionMatch = trimmed.match(/^\\(section|subsection|subsubsection)\*?\{(.*?)\}/);
      if (sectionMatch) {
        const level = sectionMatch[1] === 'section' ? 0 : sectionMatch[1] === 'subsection' ? 1 : 2;
        elements.push({
          id,
          label: `§ ${sectionMatch[2]}`,
          type: 'section',
          line: i,
          indent: level
        });
        continue;
      }
      const titleMatch = trimmed.match(/^\\title\{(.*?)\}/);
      if (titleMatch) {
        elements.push({
          id,
          label: `Title: ${titleMatch[1]}`,
          type: 'section',
          line: i,
          indent: 0
        });
        continue;
      }
      const envMatch = trimmed.match(/^\\begin\{(.*?)\}/);
      if (envMatch) {
        elements.push({
          id,
          label: `\\begin{${envMatch[1]}}`,
          type: 'loop',
          line: i,
          indent: 1
        });
        continue;
      }
    }

    // --- MARKDOWN & DOCX ---
    else if (format === 'md' || format === 'docx') {
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length - 1;
        elements.push({
          id,
          label: `${'#'.repeat(level + 1)} ${headingMatch[2]}`,
          type: 'section',
          line: i,
          indent: level
        });
        continue;
      }
    }

    // --- XML & HTML ---
    else if (format === 'xml' || format === 'html') {
      const tagMatch = trimmed.match(/^<([a-zA-Z0-9_:-]+)/);
      if (tagMatch && !tagMatch[1].startsWith('?') && !tagMatch[1].startsWith('!')) {
        // Show tags nested hierarchically
        elements.push({
          id,
          label: `<${tagMatch[1]}>`,
          type: 'tag',
          line: i,
          indent
        });
        continue;
      }
    }

    // --- CSS ---
    else if (format === 'css') {
      if (trimmed.endsWith('{') && !trimmed.startsWith('/*')) {
        const selector = trimmed.slice(0, -1).trim();
        if (selector) {
          elements.push({
            id,
            label: selector,
            type: selector.startsWith('@') ? 'section' : 'class',
            line: i,
            indent
          });
          continue;
        }
      }
    }

    // --- SQL ---
    else if (format === 'sql') {
      const sqlMatch = trimmed.match(/^(CREATE|ALTER|DROP|SELECT|INSERT|UPDATE|DELETE)\b(.*)$/i);
      if (sqlMatch) {
        const label = trimmed.substring(0, Math.min(trimmed.length, 40)) + (trimmed.length > 40 ? '...' : '');
        elements.push({
          id,
          label,
          type: 'section',
          line: i,
          indent
        });
        continue;
      }
    }

    // --- JSON ---
    else if (format === 'json') {
      const keyMatch = trimmed.match(/^"([a-zA-Z0-9_.-]+)"\s*:/);
      if (keyMatch) {
        elements.push({
          id,
          label: `"${keyMatch[1]}"`,
          type: 'key',
          line: i,
          indent
        });
        continue;
      }
    }
  }

  return elements;
}
