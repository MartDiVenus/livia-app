/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FileFormat } from '../types';

/**
 * Renders rich preview for Markdown (MD), XML, HTML, JSON, and DOCX files.
 */
export function renderRichPreviewContent(content: string, format: FileFormat, theme: 'light' | 'dark' | 'system'): React.ReactNode {
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (!content || !content.trim()) {
    return (
      <div className="p-8 text-center text-gray-400 dark:text-zinc-500 italic text-sm">
        Nessun contenuto da mostrare nell'anteprima.
      </div>
    );
  }

  // 1. MARKDOWN / DOCX / TXT Rich Preview
  if (format === 'md' || format === 'docx' || format === 'txt') {
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBuffer: string[] = [];
    let elements: React.ReactNode[] = [];

    const parseInline = (str: string): React.ReactNode[] => {
      const parts: React.ReactNode[] = [];
      let remaining = str;
      let keyCounter = 0;

      while (remaining.length > 0) {
        // Color tags <color:#HEX>text</color>
        const colorMatch = remaining.match(/^<color:(#?[a-zA-Z0-9_]+)>(.*?)<\/color>/i);
        if (colorMatch) {
          const colorVal = colorMatch[1];
          const innerTxt = colorMatch[2];
          parts.push(
            <span key={keyCounter++} style={{ color: colorVal, fontWeight: 600 }}>
              {parseInline(innerTxt)}
            </span>
          );
          remaining = remaining.substring(colorMatch[0].length);
          continue;
        }

        // Images ![alt](url)
        const imgMatch = remaining.match(/^!\[(.*?)\]\((.*?)\)/);
        if (imgMatch) {
          parts.push(
            <img
              key={keyCounter++}
              src={imgMatch[2]}
              alt={imgMatch[1] || 'Immagine'}
              className="max-w-full h-auto my-3 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800"
            />
          );
          remaining = remaining.substring(imgMatch[0].length);
          continue;
        }

        // Link [text](url)
        const linkMatch = remaining.match(/^\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
          parts.push(
            <a
              key={keyCounter++}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline font-medium hover:text-blue-800"
            >
              {linkMatch[1]}
            </a>
          );
          remaining = remaining.substring(linkMatch[0].length);
          continue;
        }

        // Inline Code `code`
        const codeMatch = remaining.match(/^`(.*?)`/);
        if (codeMatch) {
          parts.push(
            <code
              key={keyCounter++}
              className="bg-gray-100 dark:bg-zinc-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded text-[11px] font-mono border border-gray-200 dark:border-zinc-700"
            >
              {codeMatch[1]}
            </code>
          );
          remaining = remaining.substring(codeMatch[0].length);
          continue;
        }

        // Bold **text**
        const boldMatch = remaining.match(/^\*\*(.*?)\*\*/);
        if (boldMatch) {
          parts.push(<strong key={keyCounter++} className="font-bold text-gray-900 dark:text-white">{boldMatch[1]}</strong>);
          remaining = remaining.substring(boldMatch[0].length);
          continue;
        }

        // Italic *text*
        const italicMatch = remaining.match(/^\*(.*?)\*/);
        if (italicMatch) {
          parts.push(<em key={keyCounter++} className="italic text-gray-800 dark:text-zinc-200">{italicMatch[1]}</em>);
          remaining = remaining.substring(italicMatch[0].length);
          continue;
        }

        // Plain text until next special char
        const nextSpecial = remaining.search(/[!<*`\[]/);
        if (nextSpecial === -1) {
          parts.push(remaining);
          break;
        } else if (nextSpecial === 0) {
          parts.push(remaining[0]);
          remaining = remaining.substring(1);
        } else {
          parts.push(remaining.substring(0, nextSpecial));
          remaining = remaining.substring(nextSpecial);
        }
      }

      return parts;
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
          elements.push(
            <div key={`code-${i}`} className="my-3 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800 bg-[#1E2127] text-[#ABB2BF] text-xs font-mono p-3">
              <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1.5 border-b border-zinc-800 pb-1 flex justify-between">
                <span>{codeBlockLang || 'code'}</span>
              </div>
              <pre className="whitespace-pre overflow-x-auto leading-5">{codeBuffer.join('\n')}</pre>
            </div>
          );
          codeBuffer = [];
        } else {
          inCodeBlock = true;
          codeBlockLang = line.trim().replace(/^```/, '');
          codeBuffer = [];
        }
        i++;
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        i++;
        continue;
      }

      // Tables
      if (/^\s*\|.*\|\s*$/.test(line)) {
        const tableLines: string[] = [];
        let j = i;
        while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j])) {
          tableLines.push(lines[j]);
          j++;
        }
        i = j;

        const tableRows = tableLines.map(rowStr => rowStr.trim().split('|').slice(1, -1));
        if (tableRows.length > 0) {
          const headerRow = tableRows[0];
          const bodyRows = tableRows.slice(1).filter(row => !row.every(cell => /^[\s\-:]+$/.test(cell)));

          elements.push(
            <div key={`table-${i}`} className="my-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm">
              <table className="w-full border-collapse text-xs font-sans text-left">
                <thead className="bg-gray-100 dark:bg-zinc-800/80 text-gray-900 dark:text-zinc-100 font-bold border-b border-gray-200 dark:border-zinc-700">
                  <tr>
                    {headerRow.map((cell, cIdx) => (
                      <th key={cIdx} className="p-2.5 border-r last:border-r-0 border-gray-200 dark:border-zinc-700">
                        {parseInline(cell.trim())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-gray-800 dark:text-zinc-200 bg-white dark:bg-[#0D0F12]">
                  {bodyRows.map((r, rIdx) => (
                    <tr key={rIdx} className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/30 transition-colors">
                      {r.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2.5 border-r last:border-r-0 border-gray-100 dark:border-zinc-800/60">
                          {parseInline(cell.trim())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        continue;
      }

      // Headers
      if (/^#\s+/.test(line)) {
        elements.push(
          <h1 key={i} className="text-2xl font-bold text-blue-600 dark:text-[#8AB4F8] mt-6 mb-3 border-b border-gray-200 dark:border-zinc-800 pb-2 font-sans tracking-tight">
            {parseInline(line.replace(/^#\s+/, ''))}
          </h1>
        );
        i++;
        continue;
      }
      if (/^##\s+/.test(line)) {
        elements.push(
          <h2 key={i} className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-5 mb-2 font-sans tracking-tight">
            {parseInline(line.replace(/^##\s+/, ''))}
          </h2>
        );
        i++;
        continue;
      }
      if (/^###\s+/.test(line)) {
        elements.push(
          <h3 key={i} className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-4 mb-2 font-sans">
            {parseInline(line.replace(/^###\s+/, ''))}
          </h3>
        );
        i++;
        continue;
      }

      // Blockquotes
      if (/^>\s+/.test(line)) {
        elements.push(
          <blockquote key={i} className="border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 my-2.5 rounded-r text-gray-700 dark:text-zinc-300 italic text-xs">
            {parseInline(line.replace(/^>\s+/, ''))}
          </blockquote>
        );
        i++;
        continue;
      }

      // Lists (Unordered & Ordered with sub-level support)
      const unorderedListMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
      if (unorderedListMatch) {
        const indentSpaces = unorderedListMatch[1].length;
        const level = Math.min(Math.floor(indentSpaces / 2), 4);
        const marginClasses = ['ml-5', 'ml-10', 'ml-16', 'ml-22', 'ml-28'];
        const bulletStyles = ['list-disc', 'list-[circle]', 'list-[square]', 'list-disc'];
        const itemContent = unorderedListMatch[3];
        elements.push(
          <li key={i} className={`${marginClasses[level]} ${bulletStyles[level % 3]} my-1 text-gray-800 dark:text-zinc-200 text-xs leading-relaxed font-sans`}>
            {parseInline(itemContent)}
          </li>
        );
        i++;
        continue;
      }

      const orderedListMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (orderedListMatch) {
        const indentSpaces = orderedListMatch[1].length;
        const level = Math.min(Math.floor(indentSpaces / 2), 4);
        const marginClasses = ['ml-5', 'ml-10', 'ml-16', 'ml-22', 'ml-28'];
        const itemContent = orderedListMatch[3];
        elements.push(
          <li key={i} className={`${marginClasses[level]} list-decimal my-1 text-gray-800 dark:text-zinc-200 text-xs leading-relaxed font-sans`}>
            {parseInline(itemContent)}
          </li>
        );
        i++;
        continue;
      }

      // Horizontal Rule
      if (/^(---|\*\*\*|___)\s*$/.test(line)) {
        elements.push(<hr key={i} className="my-4 border-gray-200 dark:border-zinc-800" />);
        i++;
        continue;
      }

      // Paragraph
      if (line.trim() === '') {
        elements.push(<div key={i} className="h-2" />);
      } else {
        elements.push(
          <p key={i} className="my-1.5 text-gray-800 dark:text-zinc-200 text-xs leading-relaxed font-sans">
            {parseInline(line)}
          </p>
        );
      }
      i++;
    }

    return (
      <div className="p-4 sm:p-6 bg-white dark:bg-[#0D0F12] rounded-lg shadow-inner max-w-4xl mx-auto border border-gray-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-[#8AB4F8]">
          <span>📄 ANTEPRIMA DOCUMENTO FORMATTATO</span>
        </div>
        {elements}
      </div>
    );
  }

  // 2. XML / HTML Structured View
  if (format === 'xml' || format === 'html') {
    return (
      <div className="p-4 bg-zinc-900 text-zinc-100 font-mono text-xs rounded-lg border border-zinc-800 overflow-x-auto">
        <div className="text-[10px] uppercase font-bold text-amber-400 mb-3 flex items-center gap-2 pb-2 border-b border-zinc-800">
          <span>⚙️ {format === 'xml' ? 'ANTEPRIMA STRUTTURA XML' : 'ANTEPRIMA CODICE HTML'}</span>
        </div>
        <div className="whitespace-pre leading-6">
          {content.split('\n').map((line, idx) => {
            const isComment = /<!--.*?-->/.test(line);
            
            let lineContent: React.ReactNode = line;
            if (isComment) {
              lineContent = <span className="text-zinc-500 italic">{line}</span>;
            } else if (/<[^>]+>/.test(line)) {
              const parts = line.split(/(<\/?[a-zA-Z0-9_:-]+|"[^"]*"|'[^']*'|\/?>|=)/g);
              lineContent = parts.map((part, pIdx) => {
                if (part.startsWith('</') || part.startsWith('<')) {
                  return <span key={pIdx} className="text-rose-400 font-bold">{part}</span>;
                }
                if (part === '>' || part === '/>') {
                  return <span key={pIdx} className="text-rose-400 font-bold">{part}</span>;
                }
                if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
                  return <span key={pIdx} className="text-emerald-300">{part}</span>;
                }
                if (/^[a-zA-Z0-9_:-]+$/.test(part.trim()) && parts[pIdx + 1] === '=') {
                  return <span key={pIdx} className="text-amber-300 font-medium">{part}</span>;
                }
                return <span key={pIdx} className="text-zinc-200">{part}</span>;
              });
            }

            return (
              <div key={idx} className="flex hover:bg-zinc-800/40 px-1 rounded">
                <span className="w-10 text-right pr-3 text-zinc-600 select-none shrink-0">{idx + 1}</span>
                <span className="overflow-x-auto">{lineContent}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. JSON Pretty View
  if (format === 'json') {
    let prettyJson = content;
    try {
      const parsed = JSON.parse(content);
      prettyJson = JSON.stringify(parsed, null, 2);
    } catch (e) {
      // Keep original if invalid JSON
    }

    return (
      <div className="p-4 bg-[#1E2127] text-[#98C379] font-mono text-xs rounded-lg border border-zinc-800 overflow-x-auto">
        <div className="text-[10px] uppercase font-bold text-[#61AFEF] mb-3 flex items-center gap-2 pb-2 border-b border-zinc-800">
          <span>📊 ANTEPRIMA STRUTTURATA JSON</span>
        </div>
        <pre className="whitespace-pre leading-5 text-zinc-200">{prettyJson}</pre>
      </div>
    );
  }

  // 4. Default Code / Text View
  return (
    <div className="p-4 font-mono text-xs whitespace-pre bg-gray-50 dark:bg-[#0D0F12] text-gray-800 dark:text-zinc-200 rounded-lg">
      {content}
    </div>
  );
}
