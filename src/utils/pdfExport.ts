/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { downloadBlob } from './downloadHelper';

/**
 * Sanitizes and cleans emoji/special characters for PDF rendering using standard Type 1 fonts (Helvetica/Courier).
 * Preserves all Italian accented characters (à, è, é, ì, ò, ù, À, È, É, Ì, Ò, Ù), quotes, and punctuation,
 * while converting graphical emojis to elegant typographical equivalents to avoid WinAnsi encoding crashes.
 */
export function sanitizePdfText(str: string): string {
  if (!str) return '';
  return str
    .replace(/🪶/g, '[LiViA]')
    .replace(/⌨️?/g, '[Comandi]')
    .replace(/🖋️?/g, '[Tipografia]')
    .replace(/✅|✓|✔/g, '[✓]')
    .replace(/❌|✗|×/g, '[x]')
    .replace(/⚠️?/g, '[!]')
    .replace(/💡/g, '[Idea]')
    .replace(/📌/g, '[Nota]')
    .replace(/🚀/g, '[>>]')
    .replace(/⭐|★/g, '[*]')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
}

/**
 * Parses hex or named color strings into RGB tuples for jsPDF.
 */
export function hexToRgb(colorStr: string): [number, number, number] {
  if (!colorStr) return [30, 41, 59]; // slate-800
  let c = colorStr.trim().replace(/^#/, '');

  const namedColors: Record<string, [number, number, number]> = {
    red: [239, 68, 68],
    green: [16, 185, 129],
    blue: [59, 130, 246],
    yellow: [245, 158, 11],
    amber: [245, 158, 11],
    orange: [249, 115, 22],
    purple: [139, 92, 246],
    violet: [139, 92, 246],
    pink: [236, 72, 153],
    gray: [100, 116, 139],
    grey: [100, 116, 139],
    black: [15, 23, 42],
    white: [255, 255, 255],
    emerald: [16, 185, 129],
    indigo: [99, 102, 241],
    cyan: [6, 182, 212],
    teal: [15, 118, 110],
  };

  if (namedColors[c.toLowerCase()]) {
    return namedColors[c.toLowerCase()];
  }

  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }

  if (c.length >= 6) {
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return [r, g, b];
    }
  }

  return [30, 41, 59];
}

interface StyledSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
  color?: [number, number, number];
  link?: string;
}

/**
 * Tokenizes markdown text into spans with style attributes (color, bold, italics, code, strike, link).
 */
export function parsePdfFormattedSpans(text: string, inheritedStyle: Partial<StyledSpan> = {}): StyledSpan[] {
  if (!text) return [];

  const regex = /(<color:(#?[a-zA-Z0-9_]+)>(.*?)<\/color>)|(\[([^\]]+)\]\(([^)]+)\))|(`([^`]+)`)|(\*\*\*([^*]+)\*\*\*)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(__([^_]+)__)|(_([^_]+)_)|(~~([^~]+)~~)/g;
  const spans: StyledSpan[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      const plain = text.substring(lastIdx, match.index);
      if (plain) spans.push({ text: plain, ...inheritedStyle });
    }

    if (match[1]) {
      // Color tag: <color:#HEX>text</color>
      const col = hexToRgb(match[2]);
      const inner = match[3];
      spans.push(...parsePdfFormattedSpans(inner, { ...inheritedStyle, color: col }));
    } else if (match[4]) {
      // Link: [text](url)
      const linkText = match[5];
      const linkUrl = match[6];
      spans.push(...parsePdfFormattedSpans(linkText, { ...inheritedStyle, color: [37, 99, 235], link: linkUrl }));
    } else if (match[7]) {
      // Inline Code: `code`
      spans.push({ text: match[8], ...inheritedStyle, code: true, color: [190, 24, 93] });
    } else if (match[9]) {
      // Bold + Italic: ***text***
      spans.push(...parsePdfFormattedSpans(match[10], { ...inheritedStyle, bold: true, italic: true }));
    } else if (match[11]) {
      // Bold: **text**
      spans.push(...parsePdfFormattedSpans(match[12], { ...inheritedStyle, bold: true }));
    } else if (match[13]) {
      // Italic: *text*
      spans.push(...parsePdfFormattedSpans(match[14], { ...inheritedStyle, italic: true }));
    } else if (match[15]) {
      // Bold: __text__
      spans.push(...parsePdfFormattedSpans(match[16], { ...inheritedStyle, bold: true }));
    } else if (match[17]) {
      // Italic: _text_
      spans.push(...parsePdfFormattedSpans(match[18], { ...inheritedStyle, italic: true }));
    } else if (match[19]) {
      // Strike: ~~text~~
      spans.push(...parsePdfFormattedSpans(match[20], { ...inheritedStyle, strike: true, color: [100, 116, 139] }));
    }

    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    const remaining = text.substring(lastIdx);
    if (remaining) spans.push({ text: remaining, ...inheritedStyle });
  }

  return spans;
}

/**
 * Backward compatibility: generates clean HTML representation of markdown.
 */
export function convertMarkdownToPdfHtml(content: string, filename: string): string {
  if (!content) return '<p>Nessun contenuto</p>';
  return `<pre>${content}</pre>`;
}

/**
 * Pure vector, high-fidelity PDF exporter.
 *
 * Renders Markdown, DOCX, and Code documents into a beautifully formatted,
 * crisp, searchable PDF with:
 * - Proper headings, font sizes, weights, and colors
 * - Text colors via <color:#HEX> or named colors
 * - Tables with shaded headers, borders, and column alignments
 * - Code blocks with rounded background box and monospace font
 * - Task lists with colored checkboxes
 * - Bullet lists and numbered lists with multi-level indents
 * - Blockquotes with accent vertical bar
 * - Running headers and footers with pagination on every page
 * - 100% vector output (crisp, zoomable, selectable, lightweight, fast)
 * - Safe browser download across desktop, mobile, and iframe sandboxes
 */
export async function exportToPDF(
  filename: string,
  content: string,
  includeHeader: boolean = true
): Promise<void> {
  const cleanName = filename.replace(/\.[^/.]+$/, "");
  const safeDocTitle = filename || cleanName || 'documento';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();   // 595.28 pt
  const pageHeight = doc.internal.pageSize.getHeight(); // 841.89 pt
  const leftMargin = 44;
  const rightMargin = 44;
  const topMargin = includeHeader ? 54 : 44;
  const bottomMargin = 50;
  const contentWidth = pageWidth - leftMargin - rightMargin; // ~507.28 pt
  const maxY = pageHeight - bottomMargin;

  let currentY = topMargin;

  const checkPageBreak = (neededHeight: number): void => {
    if (currentY + neededHeight > maxY) {
      doc.addPage();
      currentY = topMargin;
    }
  };

  const rawLines = (content || "").split(/\r?\n/);
  const isCodeFile = /\.(py|js|ts|jsx|tsx|c|cpp|h|hpp|java|html|css|json|sql|sh|bash|rs|go|php|rb|xml|yaml|yml)$/i.test(filename);

  // Dedicated source code file rendering
  if (isCodeFile) {
    // Document Title Banner
    checkPageBreak(36);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(leftMargin, currentY, contentWidth, 28, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(filename, leftMargin + 10, currentY + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const lineCountStr = `${rawLines.length} righe`;
    const countWidth = doc.getTextWidth(lineCountStr);
    doc.text(lineCountStr, pageWidth - rightMargin - countWidth - 10, currentY + 18);

    currentY += 38;

    // Code lines with line numbers
    const numColWidth = 36;
    const codeAreaWidth = contentWidth - numColWidth - 8;

    doc.setFont('courier', 'normal');
    doc.setFontSize(8);

    for (let i = 0; i < rawLines.length; i++) {
      checkPageBreak(12);

      // Line number
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      const numStr = String(i + 1);
      const numWidth = doc.getTextWidth(numStr);
      doc.text(numStr, leftMargin + numColWidth - numWidth - 6, currentY);

      // Vertical line separator
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(leftMargin + numColWidth, currentY - 8, leftMargin + numColWidth, currentY + 4);

      // Code text
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      const codeLine = sanitizePdfText(rawLines[i]) || ' ';
      const wrapped = doc.splitTextToSize(codeLine, codeAreaWidth);
      for (let wIdx = 0; wIdx < wrapped.length; wIdx++) {
        if (wIdx > 0) checkPageBreak(11);
        doc.text(wrapped[wIdx], leftMargin + numColWidth + 8, currentY);
        currentY += 11;
      }
    }
  } else {
    // Markdown & Rich Text Document Rendering
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];
    let tableBuffer: string[] = [];

    // Helper to render formatted paragraph with word-wrap
    const renderFormattedParagraph = (
      rawText: string,
      fontSize: number = 9.5,
      lineHeight: number = 14,
      indentX: number = 0,
      defaultColor: [number, number, number] = [30, 41, 59],
      baseStyle: Partial<StyledSpan> = {}
    ) => {
      const sanitized = sanitizePdfText(rawText);
      const spans = parsePdfFormattedSpans(sanitized, baseStyle);
      if (spans.length === 0) return;

      const availWidth = contentWidth - indentX;
      let lineTokens: {
        text: string;
        width: number;
        trailingSpace: boolean;
        bold?: boolean;
        italic?: boolean;
        code?: boolean;
        strike?: boolean;
        color: [number, number, number];
        link?: string;
      }[] = [];
      let currentLineWidth = 0;

      const flushLine = () => {
        if (lineTokens.length === 0) return;
        checkPageBreak(lineHeight);

        let x = leftMargin + indentX;
        for (const token of lineTokens) {
          const fontName = token.code ? 'courier' : 'helvetica';
          let fontStyle = 'normal';
          if (token.bold && token.italic) fontStyle = 'bolditalic';
          else if (token.bold) fontStyle = 'bold';
          else if (token.italic) fontStyle = 'italic';

          doc.setFont(fontName, fontStyle);
          doc.setFontSize(fontSize);

          // Inline code pill background
          if (token.code) {
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(x - 1, currentY - fontSize * 0.78, token.width + 2, fontSize * 1.05, 1.5, 1.5, 'F');
          }

          // Text render
          doc.setTextColor(token.color[0], token.color[1], token.color[2]);
          doc.text(token.text, x, currentY);

          // Strikethrough line
          if (token.strike) {
            doc.setDrawColor(token.color[0], token.color[1], token.color[2]);
            doc.setLineWidth(0.6);
            doc.line(x, currentY - fontSize * 0.28, x + token.width, currentY - fontSize * 0.28);
          }

          // Link underline
          if (token.link) {
            doc.setDrawColor(token.color[0], token.color[1], token.color[2]);
            doc.setLineWidth(0.6);
            doc.line(x, currentY + 1.5, x + token.width, currentY + 1.5);
          }

          const spaceW = token.trailingSpace ? doc.getTextWidth(' ') : 0;
          x += token.width + spaceW;
        }

        currentY += lineHeight;
        lineTokens = [];
        currentLineWidth = 0;
      };

      for (const span of spans) {
        const fontName = span.code ? 'courier' : 'helvetica';
        let fontStyle = 'normal';
        if (span.bold && span.italic) fontStyle = 'bolditalic';
        else if (span.bold) fontStyle = 'bold';
        else if (span.italic) fontStyle = 'italic';

        doc.setFont(fontName, fontStyle);
        doc.setFontSize(fontSize);

        const spaceWidth = doc.getTextWidth(' ');
        const words = span.text.split(/(\s+)/);

        for (let i = 0; i < words.length; i++) {
          const w = words[i];
          if (!w) continue;
          if (/^\s+$/.test(w)) continue;

          const wordWidth = doc.getTextWidth(w);
          const hasTrailingSpace = i < words.length - 1 && /^\s+$/.test(words[i + 1]);
          const effectiveTokenWidth = wordWidth + (hasTrailingSpace ? spaceWidth : 0);

          if (currentLineWidth + wordWidth > availWidth && lineTokens.length > 0) {
            flushLine();
          }

          doc.setFont(fontName, fontStyle);
          doc.setFontSize(fontSize);

          lineTokens.push({
            text: w,
            width: wordWidth,
            trailingSpace: hasTrailingSpace,
            bold: span.bold,
            italic: span.italic,
            code: span.code,
            strike: span.strike,
            color: span.color || defaultColor,
            link: span.link,
          });

          currentLineWidth += effectiveTokenWidth;
        }
      }

      flushLine();
    };

    // Helper to render Markdown tables cleanly
    const flushTable = () => {
      if (tableBuffer.length === 0) return;

      const rows: string[][] = [];
      const alignments: ('left' | 'center' | 'right')[] = [];

      for (const tLine of tableBuffer) {
        const clean = tLine.trim().replace(/^\|/, '').replace(/\|$/, '');
        const cells = clean.split('|').map(c => c.trim());

        // Check if alignment row: | :--- | :---: | ---: |
        if (/^(\s*[:]?[-]+[:]?\s*)$/.test(cells[0] || '')) {
          for (let cIdx = 0; cIdx < cells.length; cIdx++) {
            const cell = cells[cIdx];
            if (cell.startsWith(':') && cell.endsWith(':')) alignments[cIdx] = 'center';
            else if (cell.endsWith(':')) alignments[cIdx] = 'right';
            else alignments[cIdx] = 'left';
          }
          continue;
        }

        rows.push(cells);
      }

      if (rows.length > 0) {
        const colCount = Math.max(...rows.map(r => r.length));
        const colWidth = Math.floor(contentWidth / (colCount || 1));

        checkPageBreak(24);
        currentY += 4;

        for (let rIdx = 0; rIdx < rows.length; rIdx++) {
          const row = rows[rIdx];
          const isHeader = rIdx === 0;

          doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
          doc.setFontSize(8.5);

          // Calculate wrapped lines for all cells in this row to determine row height
          const cellLinesList: string[][] = [];
          for (let cIdx = 0; cIdx < colCount; cIdx++) {
            const rawCell = sanitizePdfText(row[cIdx] || '');
            const cleanCell = rawCell.replace(/<[^>]+>/g, '').replace(/[*_`~]/g, '');
            const wrapped = doc.splitTextToSize(cleanCell, colWidth - 12);
            cellLinesList.push(wrapped.length > 0 ? wrapped : [' ']);
          }

          const maxLines = Math.max(...cellLinesList.map(l => l.length), 1);
          const rowHeight = maxLines * 11 + 10;

          checkPageBreak(rowHeight);

          // Draw row background
          if (isHeader) {
            doc.setFillColor(241, 245, 249); // slate-100
          } else if (rIdx % 2 === 1) {
            doc.setFillColor(255, 255, 255);
          } else {
            doc.setFillColor(248, 250, 252); // slate-50
          }

          doc.setDrawColor(203, 213, 225); // slate-300
          doc.setLineWidth(0.5);

          for (let cIdx = 0; cIdx < colCount; cIdx++) {
            const cellX = leftMargin + (cIdx * colWidth);
            doc.rect(cellX, currentY, colWidth, rowHeight, 'FD');

            const cellLines = cellLinesList[cIdx];
            const align = alignments[cIdx] || 'left';

            doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(isHeader ? 15 : 30, isHeader ? 23 : 41, isHeader ? 42 : 59);

            for (let lIdx = 0; lIdx < cellLines.length; lIdx++) {
              const lineText = cellLines[lIdx];
              const textW = doc.getTextWidth(lineText);
              let textX = cellX + 6;
              if (align === 'center') {
                textX = cellX + Math.max(6, (colWidth - textW) / 2);
              } else if (align === 'right') {
                textX = cellX + colWidth - textW - 6;
              }

              doc.text(lineText, textX, currentY + 11 + (lIdx * 11));
            }
          }

          currentY += rowHeight;
        }

        currentY += 8;
      }

      tableBuffer = [];
    };

    for (let idx = 0; idx < rawLines.length; idx++) {
      const rawLine = rawLines[idx];
      const trimmed = rawLine.trim();

      // Code blocks
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          // Render code block
          checkPageBreak(24);
          const startBlockY = currentY;
          const codeFontSize = 8;
          const codeLineHeight = 11;
          const blockPadding = 8;

          doc.setFont('courier', 'normal');
          doc.setFontSize(codeFontSize);

          // Calculate needed block height
          const neededBlockHeight = (codeBlockLines.length * codeLineHeight) + (blockPadding * 2);
          checkPageBreak(Math.min(neededBlockHeight, 300));

          // Draw code container box
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.6);
          doc.roundedRect(leftMargin, currentY, contentWidth, neededBlockHeight, 4, 4, 'FD');

          currentY += blockPadding + 8;
          doc.setTextColor(30, 41, 59);

          for (const cLine of codeBlockLines) {
            checkPageBreak(codeLineHeight);
            doc.text(sanitizePdfText(cLine) || ' ', leftMargin + 10, currentY);
            currentY += codeLineHeight;
          }

          currentY += blockPadding + 4;
          inCodeBlock = false;
          codeBlockLines = [];
        } else {
          // Flush any pending table
          if (tableBuffer.length > 0) flushTable();
          inCodeBlock = true;
          codeBlockLines = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(rawLine);
        continue;
      }

      // Tables: lines like | Col 1 | Col 2 |
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
        tableBuffer.push(trimmed);
        continue;
      } else if (tableBuffer.length > 0) {
        flushTable();
      }

      // Empty line: vertical space
      if (!trimmed) {
        currentY += 8;
        checkPageBreak(12);
        continue;
      }

      // Ignore markdown reference link definitions at bottom [ref]: url
      if (/^\[(.*?)\]:\s*(.+)$/.test(trimmed)) {
        continue;
      }

      // Horizontal rule: --- or ***
      if (/^[-*_]{3,}$/.test(trimmed)) {
        checkPageBreak(16);
        currentY += 4;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.75);
        doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);
        currentY += 12;
        continue;
      }

      // Embedded base64 or remote image: ![alt](url)
      const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        const altText = imgMatch[1];
        const imgUrl = imgMatch[2];

        if (imgUrl.startsWith('data:image/')) {
          try {
            checkPageBreak(120);
            const imgWidth = Math.min(contentWidth * 0.7, 360);
            const imgHeight = 200;
            const imgX = leftMargin + (contentWidth - imgWidth) / 2;

            doc.addImage(imgUrl, 'PNG', imgX, currentY, imgWidth, imgHeight, undefined, 'FAST');
            currentY += imgHeight + 6;

            if (altText) {
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(8);
              doc.setTextColor(100, 116, 139);
              const altWidth = doc.getTextWidth(altText);
              doc.text(altText, leftMargin + (contentWidth - altWidth) / 2, currentY);
              currentY += 12;
            }
            continue;
          } catch (e) {
            console.warn('Could not embed base64 image in PDF:', e);
          }
        }

        // Image placeholder box with caption
        checkPageBreak(30);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(leftMargin, currentY, contentWidth, 24, 3, 3, 'FD');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`[Figura / Immagine: ${altText || imgUrl}]`, leftMargin + 8, currentY + 15);
        currentY += 32;
        continue;
      }

      // Heading 1: # Title
      if (trimmed.startsWith('# ')) {
        checkPageBreak(34);
        currentY += 8;
        const text = trimmed.substring(2);
        renderFormattedParagraph(text, 17, 22, 0, [30, 58, 138], { bold: true });
        currentY += 4;
        continue;
      }

      // Heading 2: ## Subtitle
      if (trimmed.startsWith('## ')) {
        checkPageBreak(28);
        currentY += 6;
        const text = trimmed.substring(3);
        renderFormattedParagraph(text, 13.5, 18, 0, [15, 118, 110], { bold: true });
        currentY += 3;
        continue;
      }

      // Heading 3: ### Section
      if (trimmed.startsWith('### ')) {
        checkPageBreak(24);
        currentY += 4;
        const text = trimmed.substring(4);
        renderFormattedParagraph(text, 11.5, 15, 0, [51, 65, 85], { bold: true });
        currentY += 2;
        continue;
      }

      // Heading 4 & 5
      if (trimmed.startsWith('#### ') || trimmed.startsWith('##### ')) {
        checkPageBreak(20);
        const prefixLen = trimmed.startsWith('#### ') ? 5 : 6;
        const text = trimmed.substring(prefixLen);
        renderFormattedParagraph(text, 10, 14, 0, [71, 85, 105], { bold: true });
        continue;
      }

      // Blockquotes: > text
      if (trimmed.startsWith('> ')) {
        checkPageBreak(16);
        const quoteText = trimmed.substring(2);
        const quoteStartY = currentY;

        renderFormattedParagraph(quoteText, 9.5, 13.5, 16, [71, 85, 105], { italic: true });

        // Draw left accent bar in Primary Blue
        doc.setFillColor(59, 130, 246);
        doc.rect(leftMargin + 4, quoteStartY - 8, 3, currentY - quoteStartY + 4, 'F');
        currentY += 4;
        continue;
      }

      // Task list items: - [x] or - [ ]
      const taskMatch = trimmed.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        checkPageBreak(14);
        const isChecked = taskMatch[1].toLowerCase() === 'x';
        const taskText = taskMatch[2];

        // Draw checkbox badge
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        if (isChecked) {
          doc.setTextColor(16, 185, 129); // emerald-500
          doc.text('[✓]', leftMargin + 2, currentY);
        } else {
          doc.setTextColor(148, 163, 184); // slate-400
          doc.text('[ ]', leftMargin + 2, currentY);
        }

        renderFormattedParagraph(taskText, 9.5, 13.5, 20, [30, 41, 59]);
        continue;
      }

      // Bullet list items: - item or * item
      const bulletMatch = rawLine.match(/^(\s*)([-*+])\s+(.*)$/);
      if (bulletMatch) {
        checkPageBreak(14);
        const leadingSpaces = bulletMatch[1].length;
        const indentLevel = Math.min(3, Math.floor(leadingSpaces / 2));
        const itemText = bulletMatch[3];
        const indentX = indentLevel * 14;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(59, 130, 246); // accent blue bullet
        doc.text('•', leftMargin + indentX + 2, currentY);

        renderFormattedParagraph(itemText, 9.5, 13.5, indentX + 14, [30, 41, 59]);
        continue;
      }

      // Numbered list items: 1. item
      const numMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);
      if (numMatch) {
        checkPageBreak(14);
        const numPrefix = numMatch[1];
        const itemText = numMatch[2];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(59, 130, 246);
        doc.text(numPrefix, leftMargin + 2, currentY);

        renderFormattedParagraph(itemText, 9.5, 13.5, 16, [30, 41, 59]);
        continue;
      }

      // Standard paragraph
      renderFormattedParagraph(trimmed, 9.5, 13.5, 0, [30, 41, 59]);
    }

    if (tableBuffer.length > 0) {
      flushTable();
    }
  }

  // Running Header & Footer with full pagination on all pages
  const totalPages = doc.getNumberOfPages();
  const dateStr = new Date().toLocaleDateString();

  for (let pIdx = 1; pIdx <= totalPages; pIdx++) {
    doc.setPage(pIdx);

    // Top Running Header
    if (includeHeader) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`LiViA Editor - ${safeDocTitle}`, leftMargin, 24);

      doc.setFont('helvetica', 'normal');
      const dateWidth = doc.getTextWidth(dateStr);
      doc.text(dateStr, pageWidth - rightMargin - dateWidth, 24);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, 30, pageWidth - rightMargin, 30);
    }

    // Bottom Running Footer
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, pageHeight - 26, pageWidth - rightMargin, pageHeight - 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Generato con LiViA Editor', leftMargin, pageHeight - 14);

    const pageNumStr = `Pagina ${pIdx} di ${totalPages}`;
    const pageNumWidth = doc.getTextWidth(pageNumStr);
    doc.text(pageNumStr, pageWidth - rightMargin - pageNumWidth, pageHeight - 14);
  }

  // Trigger download with robust download helper
  const pdfBlob = doc.output('blob');
  downloadBlob(pdfBlob, `${cleanName || 'documento'}.pdf`);
}
