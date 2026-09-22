/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Ensure html2canvas is available on window for jsPDF html plugin
if (typeof window !== 'undefined' && !(window as any).html2canvas) {
  (window as any).html2canvas = html2canvas;
}

/**
 * Converts Markdown or DOCX-formatted text into rich, beautifully styled HTML
 * specifically prepared for high-fidelity PDF rendering with pagination,
 * true bold/italic typography, styled tables, code blocks, blockquotes, and lists.
 */
export function convertMarkdownToPdfHtml(content: string, filename: string): string {
  if (!content) return '<p style="color: #64748b; font-style: italic;">Nessun contenuto nel documento.</p>';

  const lines = content.split(/\r?\n/);

  // Pass 1: Extract reference link definitions [ref]: url
  const references: Record<string, string> = {};
  for (const line of lines) {
    const refMatch = line.match(/^\[(.*?)\]:\s*(.+)$/);
    if (refMatch) {
      references[refMatch[1]] = refMatch[2].trim();
    }
  }

  const isCodeFile = /\.(py|js|ts|jsx|tsx|c|cpp|h|hpp|java|html|css|json|sql|sh|bash|rs|go|php|rb|xml|yaml|yml)$/i.test(filename);

  // If it's a dedicated programming code file, render it as clean code listing with line numbers
  if (isCodeFile) {
    const escapedCodeLines = lines.map((l, i) => {
      const escaped = l
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<tr>
        <td style="width: 42px; text-align: right; padding-right: 12px; color: #94a3b8; font-size: 8pt; user-select: none; border-right: 1px solid #e2e8f0; vertical-align: top;">${i + 1}</td>
        <td style="padding-left: 12px; font-family: 'Courier New', Courier, monospace; font-size: 8.5pt; color: #1e293b; white-space: pre-wrap; word-break: break-all; vertical-align: top;">${escaped || '&nbsp;'}</td>
      </tr>`;
    }).join('\n');

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; padding: 6px 0;">
        <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: baseline;">
          <h2 style="margin: 0; font-size: 14pt; color: #0f172a; font-weight: 700;">${filename}</h2>
          <span style="font-size: 9pt; color: #64748b;">${lines.length} righe</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-family: 'Courier New', Courier, monospace;">
          <tbody>${escapedCodeLines}</tbody>
        </table>
      </div>
    `;
  }

  // Markdown / DOCX parsing
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBuffer: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let htmlLines: string[] = [];

  const processInline = (str: string): string => {
    let s = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Custom Color tags <color:#3B82F6>text</color>
    s = s.replace(/&lt;color:(#?[a-zA-Z0-9_]+)&gt;(.*?)&lt;\/color&gt;/gi, (_m, col, txt) => {
      const c = col.startsWith('#') || /^[a-zA-Z]+$/.test(col) ? col : `#${col}`;
      return `<span style="color: ${c}; font-weight: 600;">${txt}</span>`;
    });
    s = s.replace(/<color:(#?[a-zA-Z0-9_]+)>(.*?)<\/color>/gi, (_m, col, txt) => {
      const c = col.startsWith('#') || /^[a-zA-Z]+$/.test(col) ? col : `#${col}`;
      return `<span style="color: ${c}; font-weight: 600;">${txt}</span>`;
    });

    // Images with reference ![alt][ref]
    s = s.replace(/!\[(.*?)\]\[(.*?)\]/g, (match, alt, refKey) => {
      let url = references[refKey] || '';
      if (url.includes('drive.google.com')) {
        const driveIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
        if (driveIdMatch && driveIdMatch[1]) {
          url = `https://drive.google.com/thumbnail?id=${driveIdMatch[1]}&sz=w1000`;
        }
      }
      return url ? `<div style="text-align: center; margin: 12pt 0; break-inside: avoid; page-break-inside: avoid;"><img src="${url}" alt="${alt}" style="max-width: 90%; max-height: 380px; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.12); border: 1px solid #e2e8f0; display: inline-block;" /></div>` : '';
    });

    // Standard inline images ![alt](url)
    s = s.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, rawUrl) => {
      let url = rawUrl;
      if (url.includes('drive.google.com')) {
        const driveIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
        if (driveIdMatch && driveIdMatch[1]) {
          url = `https://drive.google.com/thumbnail?id=${driveIdMatch[1]}&sz=w1000`;
        }
      }
      return `<div style="text-align: center; margin: 12pt 0; break-inside: avoid; page-break-inside: avoid;"><img src="${url}" alt="${alt}" style="max-width: 90%; max-height: 380px; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.12); border: 1px solid #e2e8f0; display: inline-block;" /></div>`;
    });

    // Links with references [text][ref]
    s = s.replace(/\[(.*?)\]\[(.*?)\]/g, (match, txt, refKey) => {
      const url = references[refKey] || '#';
      return `<a href="${url}" style="color: #2563eb; text-decoration: underline; font-weight: 500;">${txt}</a>`;
    });

    // Standard Links [text](url)
    s = s.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #2563eb; text-decoration: underline; font-weight: 500;">$1</a>');

    // Bold + Italic ***text*** or ___text___
    s = s.replace(/\*\*\*(.*?)\*\*\*/g, '<strong style="font-weight: 700; font-style: italic; color: #0f172a;">$1</strong>');
    s = s.replace(/___(.*?)___/g, '<strong style="font-weight: 700; font-style: italic; color: #0f172a;">$1</strong>');

    // Bold **text** or __text__
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: #0f172a;">$1</strong>');
    s = s.replace(/__(.*?)__/g, '<strong style="font-weight: 700; color: #0f172a;">$1</strong>');

    // Italic *text* or _text_
    s = s.replace(/\*(.*?)\*/g, '<em style="font-style: italic; color: #334155;">$1</em>');
    s = s.replace(/_(.*?)_/g, '<em style="font-style: italic; color: #334155;">$1</em>');

    // Strikethrough ~~text~~
    s = s.replace(/~~(.*?)~~/g, '<del style="text-decoration: line-through; color: #64748b;">$1</del>');

    // Inline Code `code`
    s = s.replace(/`([^`]+)`/g, '<code style="font-family: \'Courier New\', Courier, monospace; background-color: #f1f5f9; color: #be185d; padding: 2px 5px; border-radius: 4px; font-size: 9pt; border: 1px solid #e2e8f0;">$1</code>');

    return s;
  };

  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (!inTable || tableRows.length === 0) return;

    let tableHtml = '<div style="margin: 12pt 0; break-inside: avoid; page-break-inside: avoid; overflow-x: auto;"><table style="width: 100%; border-collapse: collapse; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; font-size: 9.5pt; border: 1px solid #cbd5e1;">';

    let alignments: ('left' | 'center' | 'right')[] = [];
    let hasHeader = false;

    // Check if second row is markdown alignment row like | :--- | :---: | ---: |
    if (tableRows.length >= 2 && tableRows[1].every(cell => /^[\s\-:]+$/.test(cell))) {
      hasHeader = true;
      alignments = tableRows[1].map(cell => {
        const c = cell.trim();
        if (c.startsWith(':') && c.endsWith(':')) return 'center';
        if (c.endsWith(':')) return 'right';
        return 'left';
      });
    }

    tableRows.forEach((row, idx) => {
      // Skip the separator row
      if (hasHeader && idx === 1) return;

      const isHeader = hasHeader && idx === 0;
      tableHtml += '<tr>';

      row.forEach((cell, cellIdx) => {
        const tag = isHeader ? 'th' : 'td';
        const align = alignments[cellIdx] || 'left';
        const bg = isHeader
          ? 'background-color: #f1f5f9; font-weight: 700; color: #0f172a;'
          : (idx % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;');

        const processed = processInline(cell.trim());
        tableHtml += `<${tag} style="${bg} border: 1px solid #cbd5e1; padding: 6pt 10pt; text-align: ${align}; vertical-align: top; line-height: 1.4;">${processed}</${tag}>`;
      });

      tableHtml += '</tr>';
    });

    tableHtml += '</table></div>';
    htmlLines.push(tableHtml);
    tableRows = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Ignore reference link definitions in document body
    if (/^\[(.*?)\]:\s*(.+)$/.test(trimmed)) {
      continue;
    }

    // Table detection: line starting and ending with pipe |
    if (/^\s*\|.*\|\s*$/.test(rawLine)) {
      if (inList) {
        htmlLines.push(listType === 'ol' ? '</ol>' : '</ul>');
        inList = false;
        listType = null;
      }
      inTable = true;
      const cells = rawLine.trim().split('|').slice(1, -1);
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Code block toggle (```)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        const codeText = codeBuffer.join('\n')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const langBadge = codeBlockLang ? `<div style="font-size: 8pt; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 6pt; border-bottom: 1px solid #334155; padding-bottom: 3pt;">${codeBlockLang}</div>` : '';
        htmlLines.push(
          `<div style="margin: 10pt 0; background-color: #1e293b; color: #f8fafc; border-radius: 6px; padding: 10pt 12pt; font-family: 'Courier New', Courier, monospace; font-size: 8.5pt; line-height: 1.45; white-space: pre-wrap; word-break: break-all; break-inside: avoid; page-break-inside: avoid;">${langBadge}<code>${codeText}</code></div>`
        );
        codeBuffer = [];
        codeBlockLang = '';
      } else {
        inCodeBlock = true;
        codeBlockLang = trimmed.replace(/^```/, '').trim();
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Check for Task List items: - [ ] or - [x]
    const taskMatch = rawLine.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) htmlLines.push(listType === 'ol' ? '</ol>' : '</ul>');
        htmlLines.push('<ul style="list-style: none; padding-left: 0; margin: 6pt 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; font-size: 10.5pt; color: #1e293b; line-height: 1.5;">');
        inList = true;
        listType = 'ul';
      }
      const indentSpaces = taskMatch[1].length;
      const isChecked = taskMatch[2].toLowerCase() === 'x';
      const taskText = processInline(taskMatch[3]);
      const indentPx = Math.floor(indentSpaces / 2) * 18;

      const checkboxIcon = isChecked
        ? '<span style="display: inline-block; width: 13px; height: 13px; border: 1.5px solid #2563eb; border-radius: 3px; background-color: #2563eb; color: #ffffff; font-size: 9.5px; line-height: 11px; text-align: center; vertical-align: middle; margin-right: 7px; font-weight: bold;">✓</span>'
        : '<span style="display: inline-block; width: 13px; height: 13px; border: 1.5px solid #94a3b8; border-radius: 3px; background-color: #ffffff; vertical-align: middle; margin-right: 7px;"></span>';

      htmlLines.push(`<li style="margin-bottom: 4pt; margin-left: ${indentPx}pt; display: flex; align-items: baseline;">${checkboxIcon}<span style="${isChecked ? 'text-decoration: line-through; color: #64748b;' : ''}">${taskText}</span></li>`);
      continue;
    }

    // Standard Bullet list item
    const isUlItem = /^(\s*[-*+]\s+)/.test(rawLine);
    if (isUlItem) {
      if (!inList || listType !== 'ul') {
        if (inList) htmlLines.push(listType === 'ol' ? '</ol>' : '</ul>');
        htmlLines.push('<ul style="margin: 6pt 0; padding-left: 20pt; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; font-size: 10.5pt; color: #1e293b; line-height: 1.5;">');
        inList = true;
        listType = 'ul';
      }
      const indentSpaces = (rawLine.match(/^(\s*)/) || [''])[0].length;
      const level = Math.floor(indentSpaces / 2);
      const marginLeft = level > 0 ? ` margin-left: ${level * 16}pt; list-style-type: ${level === 1 ? 'circle' : 'square'};` : '';
      const itemText = processInline(rawLine.replace(/^(\s*[-*+]\s+)/, ''));
      htmlLines.push(`<li style="margin-bottom: 3.5pt;${marginLeft}">${itemText}</li>`);
      continue;
    }

    // Numbered list item
    const isOlItem = /^(\s*\d+\.\s+)/.test(rawLine);
    if (isOlItem) {
      if (!inList || listType !== 'ol') {
        if (inList) htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        htmlLines.push('<ol style="margin: 6pt 0; padding-left: 20pt; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; font-size: 10.5pt; color: #1e293b; line-height: 1.5;">');
        inList = true;
        listType = 'ol';
      }
      const indentSpaces = (rawLine.match(/^(\s*)/) || [''])[0].length;
      const level = Math.floor(indentSpaces / 2);
      const marginLeft = level > 0 ? ` margin-left: ${level * 16}pt;` : '';
      const itemText = processInline(rawLine.replace(/^(\s*\d+\.\s+)/, ''));
      htmlLines.push(`<li style="margin-bottom: 3.5pt;${marginLeft}">${itemText}</li>`);
      continue;
    }

    // Close any open list if this line is neither ul nor ol
    if (inList) {
      htmlLines.push(listType === 'ol' ? '</ol>' : '</ul>');
      inList = false;
      listType = null;
    }

    // Headings (H1 to H6)
    if (/^#\s+/.test(trimmed)) {
      const title = processInline(trimmed.replace(/^#\s+/, ''));
      htmlLines.push(`<h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20pt; font-weight: 700; color: #1e3a8a; margin-top: 18pt; margin-bottom: 8pt; padding-bottom: 5pt; border-bottom: 1.5px solid #e2e8f0; line-height: 1.25; break-after: avoid; page-break-after: avoid;">${title}</h1>`);
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      const title = processInline(trimmed.replace(/^##\s+/, ''));
      htmlLines.push(`<h2 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15pt; font-weight: 700; color: #0f766e; margin-top: 15pt; margin-bottom: 6pt; line-height: 1.3; break-after: avoid; page-break-after: avoid;">${title}</h2>`);
      continue;
    }
    if (/^###\s+/.test(trimmed)) {
      const title = processInline(trimmed.replace(/^###\s+/, ''));
      htmlLines.push(`<h3 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12.5pt; font-weight: 600; color: #334155; margin-top: 12pt; margin-bottom: 4pt; break-after: avoid; page-break-after: avoid;">${title}</h3>`);
      continue;
    }
    if (/^####\s+/.test(trimmed)) {
      const title = processInline(trimmed.replace(/^####\s+/, ''));
      htmlLines.push(`<h4 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11pt; font-weight: 600; color: #475569; margin-top: 10pt; margin-bottom: 3pt; break-after: avoid; page-break-after: avoid;">${title}</h4>`);
      continue;
    }
    if (/^#####\s+/.test(trimmed)) {
      const title = processInline(trimmed.replace(/^#####\s+/, ''));
      htmlLines.push(`<h5 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10pt; font-weight: 600; color: #64748b; margin-top: 8pt; margin-bottom: 2pt; break-after: avoid; page-break-after: avoid;">${title}</h5>`);
      continue;
    }
    if (/^######\s+/.test(trimmed)) {
      const title = processInline(trimmed.replace(/^######\s+/, ''));
      htmlLines.push(`<h6 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9.5pt; font-weight: 600; color: #64748b; margin-top: 6pt; margin-bottom: 2pt; break-after: avoid; page-break-after: avoid;">${title}</h6>`);
      continue;
    }

    // Blockquote
    if (/^>\s*/.test(trimmed)) {
      const quote = processInline(trimmed.replace(/^>\s*/, ''));
      htmlLines.push(`<blockquote style="border-left: 3.5px solid #3b82f6; background-color: #f8fafc; padding: 7pt 12pt; margin: 8pt 0; color: #475569; font-style: italic; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-radius: 0 4px 4px 0; break-inside: avoid; page-break-inside: avoid;">${quote}</blockquote>`);
      continue;
    }

    // Horizontal Rule
    if (/^(---|\*\*\*|___)\s*$/.test(trimmed)) {
      htmlLines.push('<hr style="border: none; border-top: 1.5px solid #e2e8f0; margin: 14pt 0;" />');
      continue;
    }

    // Paragraph or blank line
    if (trimmed === '') {
      htmlLines.push('<div style="height: 6pt;"></div>');
    } else {
      const pText = processInline(trimmed);
      htmlLines.push(`<p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10.5pt; color: #1e293b; margin-top: 0; margin-bottom: 6pt; line-height: 1.6;">${pText}</p>`);
    }
  }

  if (inTable) flushTable();
  if (inList) htmlLines.push(listType === 'ol' ? '</ol>' : '</ul>');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #ffffff; line-height: 1.6; word-wrap: break-word;">
      ${htmlLines.join('\n')}
    </div>
  `;
}

/**
 * Enhanced Fallback: exports vector PDF when DOM/canvas rendering is unavailable
 */
async function exportVectorFallback(filename: string, content: string, includeHeader: boolean): Promise<void> {
  const cleanName = filename.replace(/\.[^/.]+$/, "");
  const safeDocTitle = filename || cleanName || 'documento';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 44;
  const rightMargin = 44;
  const topMargin = includeHeader ? 54 : 44;
  const bottomMargin = 50;
  const contentWidth = pageWidth - leftMargin - rightMargin;
  const maxY = pageHeight - bottomMargin;

  let currentY = topMargin;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > maxY) {
      doc.addPage();
      currentY = topMargin;
    }
  };

  const rawLines = content.split(/\r?\n/);
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  for (let idx = 0; idx < rawLines.length; idx++) {
    const rawLine = rawLines[idx];
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        doc.setFont('courier', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);

        const startBlockY = currentY;
        for (const cLine of codeBlockLines) {
          checkPageBreak(12);
          doc.text(cLine || ' ', leftMargin + 8, currentY + 8);
          currentY += 12;
        }

        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.rect(leftMargin, startBlockY - 2, contentWidth, currentY - startBlockY + 6, 'S');
        currentY += 10;

        inCodeBlock = false;
        codeBlockLines = [];
      } else {
        inCodeBlock = true;
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    if (!trimmed) {
      currentY += 8;
      checkPageBreak(12);
      continue;
    }

    // Strip markers for clean vector output
    const cleanText = trimmed
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<color:[^>]+>(.*?)<\/color>/g, '$1')
      .replace(/<[^>]+>/g, '');

    if (trimmed.startsWith('# ')) {
      checkPageBreak(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      doc.text(cleanText.replace(/^#\s+/, ''), leftMargin, currentY);
      currentY += 22;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      checkPageBreak(24);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 118, 110);
      doc.text(cleanText.replace(/^##\s+/, ''), leftMargin, currentY);
      currentY += 18;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(51, 65, 85);
      doc.text(cleanText.replace(/^###\s+/, ''), leftMargin, currentY);
      currentY += 16;
      continue;
    }

    // Bullet
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      checkPageBreak(14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(31, 41, 55);
      doc.text('•', leftMargin + 4, currentY);
      const wrapped = doc.splitTextToSize(cleanText.replace(/^[-*•]\s+/, ''), contentWidth - 16);
      for (const w of wrapped) {
        checkPageBreak(13);
        doc.text(w, leftMargin + 16, currentY);
        currentY += 13;
      }
      continue;
    }

    // Paragraph
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(31, 41, 55);
    const wrapped = doc.splitTextToSize(cleanText, contentWidth);
    for (const w of wrapped) {
      checkPageBreak(13.5);
      doc.text(w, leftMargin, currentY);
      currentY += 13.5;
    }
  }

  const totalPages = doc.getNumberOfPages();
  const dateStr = new Date().toLocaleDateString();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (includeHeader) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`LiViA Editor - ${safeDocTitle}`, leftMargin, 26);

      doc.setFont('helvetica', 'normal');
      const dateWidth = doc.getTextWidth(dateStr);
      doc.text(dateStr, pageWidth - rightMargin - dateWidth, 26);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, 30, pageWidth - rightMargin, 30);
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, pageHeight - 26, pageWidth - rightMargin, pageHeight - 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Generato con LiViA Editor', leftMargin, pageHeight - 14);

    const pageNumStr = `Pagina ${i} di ${totalPages}`;
    const pageNumWidth = doc.getTextWidth(pageNumStr);
    doc.text(pageNumStr, pageWidth - rightMargin - pageNumWidth, pageHeight - 14);
  }

  doc.save(`${cleanName || 'documento'}.pdf`);
}

/**
 * Exports Markdown, DOCX, or Code documents into a crisp, high-fidelity PDF
 * where full rendering (la resa) takes place:
 * - Proper heading fonts, sizes, and accent colors
 * - Rendered tables with borders, shaded headers, and padding
 * - Rendered task checkboxes (✓) and lists
 * - True bold and italic styles
 * - Styled code blocks and inline code badges
 * - Blockquotes with accent vertical bar
 * - Running headers and footers with pagination on each page
 */
export async function exportToPDF(filename: string, content: string, includeHeader: boolean = true): Promise<void> {
  const cleanName = filename.replace(/\.[^/.]+$/, "");
  const safeDocTitle = filename || cleanName || 'documento';

  // Check if we are running in browser with DOM support
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return exportVectorFallback(filename, content, includeHeader);
  }

  try {
    const renderedHtml = convertMarkdownToPdfHtml(content, filename);

    // Create offscreen render sandbox
    const windowWidth = 794; // Standard A4 pixel width at 96 DPI
    const container = document.createElement('div');
    container.id = 'pdf-export-sandbox';
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = `${windowWidth}px`;
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.boxSizing = 'border-box';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#1e293b';
    container.innerHTML = renderedHtml;

    document.body.appendChild(container);

    // Wait for any images to load or timeout safely
    const images = Array.from(container.querySelectorAll('img'));
    if (images.length > 0) {
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 2500);
          });
        })
      );
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();   // 595.28 pt
    const pageHeight = doc.internal.pageSize.getHeight(); // 841.89 pt
    const marginX = 40;
    const marginY = 44;
    const contentWidth = pageWidth - (marginX * 2);      // 515.28 pt

    await new Promise<void>((resolve, reject) => {
      doc.html(container, {
        x: marginX,
        y: marginY,
        width: contentWidth,
        windowWidth: windowWidth,
        autoPaging: 'text',
        html2canvas: {
          useCORS: true,
          allowTaint: true,
          scale: 2,
          logging: false
        },
        callback: function (pdf) {
          try {
            const totalPages = pdf.getNumberOfPages();
            const dateStr = new Date().toLocaleDateString();

            for (let i = 1; i <= totalPages; i++) {
              pdf.setPage(i);

              // Top Running Header (if enabled)
              if (includeHeader) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(8);
                pdf.setTextColor(100, 116, 139); // slate-500
                pdf.text(`LiViA Editor - ${safeDocTitle}`, marginX, 24);

                pdf.setFont('helvetica', 'normal');
                const dateWidth = pdf.getTextWidth(dateStr);
                pdf.text(dateStr, pageWidth - marginX - dateWidth, 24);

                pdf.setDrawColor(226, 232, 240); // slate-200
                pdf.setLineWidth(0.5);
                pdf.line(marginX, 30, pageWidth - marginX, 30);
              }

              // Bottom Running Footer with page numbering
              pdf.setDrawColor(226, 232, 240);
              pdf.setLineWidth(0.5);
              pdf.line(marginX, pageHeight - 26, pageWidth - marginX, pageHeight - 26);

              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(8);
              pdf.setTextColor(148, 163, 184); // slate-400
              pdf.text('Generato con LiViA Editor', marginX, pageHeight - 14);

              const pageNumStr = `Pagina ${i} di ${totalPages}`;
              const pageNumWidth = pdf.getTextWidth(pageNumStr);
              pdf.text(pageNumStr, pageWidth - marginX - pageNumWidth, pageHeight - 14);
            }

            pdf.save(`${cleanName || 'documento'}.pdf`);
            resolve();
          } catch (e) {
            reject(e);
          } finally {
            if (container.parentNode) {
              container.parentNode.removeChild(container);
            }
          }
        }
      });
    });
  } catch (err) {
    console.warn('doc.html export failed, falling back to enhanced vector rendering:', err);
    await exportVectorFallback(filename, content, includeHeader);
  }
}
