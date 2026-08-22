/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility functions for 2-way Google Docs & DOCX integration with LiViA:
 * 1. Convert Markdown/Text -> HTML formatted specifically for Google Docs Clipboard, Export & PDF
 * 2. Convert Google Docs HTML / DOCX Clipboard -> Clean Markdown for LiViA with list depth, colors, tables, images
 * 3. Copy rich HTML to Clipboard (for seamless Ctrl+V in Google Docs)
 * 4. Export as Google Docs document via Google Drive API
 */

export function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // strip zero-width spaces and BOMs
}

/**
 * Converts Markdown or plain text into styled HTML that Google Docs interprets natively when pasted or imported.
 */
export function convertMarkdownToGoogleDocsHtml(textInput: string): string {
  const text = sanitizeText(textInput);
  if (!text) return '';

  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let htmlLines: string[] = [];

  const processInline = (str: string): string => {
    let s = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Color tags <color:#3B82F6>text</color>
    s = s.replace(/&lt;color:(#?[a-zA-Z0-9_]+)&gt;(.*?)&lt;\/color&gt;/gi, '<span style="color: $1; font-weight: 600;">$2</span>');
    s = s.replace(/<color:(#?[a-zA-Z0-9_]+)>(.*?)<\/color>/gi, '<span style="color: $1; font-weight: 600;">$2</span>');

    // Images ![alt](url)
    s = s.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 6px; margin: 8pt 0;" />');

    // Bold + Italic ***text***
    s = s.replace(/\*\*\*(.*?)\*\*\*/g, '<strong style="font-weight: 700; font-style: italic;">$1</strong>');
    // Bold **text** or __text__
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: #111827;">$1</strong>');
    s = s.replace(/__(.*?)__/g, '<strong style="font-weight: 700; color: #111827;">$1</strong>');
    // Italic *text* or _text_
    s = s.replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>');
    s = s.replace(/_(.*?)_/g, '<em style="font-style: italic;">$1</em>');
    // Inline Code `code`
    s = s.replace(/`(.*?)`/g, '<code style="font-family: \'Courier New\', Courier, monospace; background-color: #F3F4F6; padding: 2px 5px; border-radius: 3px; font-size: 9.5pt; color: #1F2937;">$1</code>');
    // Links [text](url)
    s = s.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #1A73E8; text-decoration: underline;">$1</a>');

    return s;
  };

  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (!inTable || tableRows.length === 0) return;
    let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin-top: 10pt; margin-bottom: 10pt; font-family: Arial, sans-serif; font-size: 10pt; border: 1px solid #D1D5DB;">';
    
    tableRows.forEach((row, idx) => {
      // Check if second row is separator row like | --- | --- |
      const isSeparator = row.every(cell => /^[\s\-:]+$/.test(cell));
      if (isSeparator) return;

      const isHeader = idx === 0;
      tableHtml += '<tr>';
      row.forEach(cell => {
        const tag = isHeader ? 'th' : 'td';
        const bg = isHeader ? 'background-color: #F3F4F6; font-weight: 700; color: #111827;' : 'background-color: #FFFFFF; color: #374151;';
        const processed = processInline(cell.trim());
        tableHtml += `<${tag} style="${bg} border: 1px solid #D1D5DB; padding: 6pt 10pt; text-align: left;">${processed}</${tag}>`;
      });
      tableHtml += '</tr>';
    });

    tableHtml += '</table>';
    htmlLines.push(tableHtml);
    tableRows = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Table detection
    if (/^\s*\|.*\|\s*$/.test(rawLine)) {
      if (inList) {
        if (listType === 'ul') htmlLines.push('</ul>');
        if (listType === 'ol') htmlLines.push('</ol>');
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

    // Code block toggle
    if (rawLine.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        const codeText = codeBuffer.join('\n')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        htmlLines.push(
          `<pre style="background-color: #282C34; color: #ABB2BF; font-family: 'Courier New', Courier, monospace; font-size: 9.5pt; padding: 12pt; border-radius: 6px; margin-top: 8pt; margin-bottom: 8pt; white-space: pre-wrap; line-height: 1.4;"><code>${codeText}</code></pre>`
        );
        codeBuffer = [];
      } else {
        inCodeBlock = true;
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Close list if line is not a list item
    const isUlItem = /^(\s*[-*+]\s+)/.test(rawLine);
    const isOlItem = /^(\s*\d+\.\s+)/.test(rawLine);

    if (inList && !isUlItem && !isOlItem) {
      if (listType === 'ul') htmlLines.push('</ul>');
      if (listType === 'ol') htmlLines.push('</ol>');
      inList = false;
      listType = null;
    }

    // Headings (H1, H2, H3, H4)
    if (/^#\s+/.test(rawLine)) {
      const title = processInline(rawLine.replace(/^#\s+/, ''));
      htmlLines.push(`<h1 style="font-family: Arial, Helvetica, sans-serif; font-size: 20pt; font-weight: 700; color: #1a73e8; margin-top: 18pt; margin-bottom: 6pt; line-height: 1.25;">${title}</h1>`);
      continue;
    }
    if (/^##\s+/.test(rawLine)) {
      const title = processInline(rawLine.replace(/^##\s+/, ''));
      htmlLines.push(`<h2 style="font-family: Arial, Helvetica, sans-serif; font-size: 15pt; font-weight: 700; color: #202124; margin-top: 14pt; margin-bottom: 4pt; line-height: 1.3;">${title}</h2>`);
      continue;
    }
    if (/^###\s+/.test(rawLine)) {
      const title = processInline(rawLine.replace(/^###\s+/, ''));
      htmlLines.push(`<h3 style="font-family: Arial, Helvetica, sans-serif; font-size: 12pt; font-weight: 700; color: #3c4043; margin-top: 12pt; margin-bottom: 4pt;">${title}</h3>`);
      continue;
    }
    if (/^####\s+/.test(rawLine)) {
      const title = processInline(rawLine.replace(/^####\s+/, ''));
      htmlLines.push(`<h4 style="font-family: Arial, Helvetica, sans-serif; font-size: 11pt; font-weight: 700; color: #5f6368; margin-top: 10pt; margin-bottom: 3pt;">${title}</h4>`);
      continue;
    }

    // Blockquote
    if (/^>\s+/.test(rawLine)) {
      const quote = processInline(rawLine.replace(/^>\s+/, ''));
      htmlLines.push(`<blockquote style="border-left: 3px solid #1a73e8; padding-left: 10pt; margin-top: 6pt; margin-bottom: 6pt; color: #5f6368; font-style: italic; font-family: Arial, sans-serif;">${quote}</blockquote>`);
      continue;
    }

    // List items
    if (isUlItem) {
      if (!inList || listType !== 'ul') {
        if (inList) htmlLines.push(listType === 'ol' ? '</ol>' : '</ul>');
        htmlLines.push('<ul style="font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #202124; margin-top: 4pt; margin-bottom: 6pt; padding-left: 20pt; line-height: 1.5;">');
        inList = true;
        listType = 'ul';
      }
      const indentMatch = rawLine.match(/^(\s*)/);
      const indentSpaces = indentMatch ? indentMatch[1].length : 0;
      const level = Math.floor(indentSpaces / 2);
      const marginLeft = level > 0 ? ` margin-left: ${level * 18}pt; list-style-type: ${level === 1 ? 'circle' : level >= 2 ? 'square' : 'disc'};` : '';
      const itemText = processInline(rawLine.replace(/^(\s*[-*+]\s+)/, ''));
      htmlLines.push(`<li style="margin-bottom: 3pt;${marginLeft}">${itemText}</li>`);
      continue;
    }

    if (isOlItem) {
      if (!inList || listType !== 'ol') {
        if (inList) htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        htmlLines.push('<ol style="font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #202124; margin-top: 4pt; margin-bottom: 6pt; padding-left: 20pt; line-height: 1.5;">');
        inList = true;
        listType = 'ol';
      }
      const indentMatch = rawLine.match(/^(\s*)/);
      const indentSpaces = indentMatch ? indentMatch[1].length : 0;
      const level = Math.floor(indentSpaces / 2);
      const marginLeft = level > 0 ? ` margin-left: ${level * 18}pt;` : '';
      const itemText = processInline(rawLine.replace(/^(\s*\d+\.\s+)/, ''));
      htmlLines.push(`<li style="margin-bottom: 3pt;${marginLeft}">${itemText}</li>`);
      continue;
    }

    // Horizontal Rule
    if (/^(---|\*\*\*|___)\s*$/.test(rawLine)) {
      htmlLines.push('<hr style="border: none; border-top: 1px solid #dadce0; margin-top: 12pt; margin-bottom: 12pt;" />');
      continue;
    }

    // Paragraph
    if (rawLine.trim() === '') {
      htmlLines.push('<p style="font-family: Arial, Helvetica, sans-serif; font-size: 11pt; margin-top: 0; margin-bottom: 6pt; line-height: 1.5;">&nbsp;</p>');
    } else {
      const pText = processInline(rawLine);
      htmlLines.push(`<p style="font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #202124; margin-top: 0; margin-bottom: 6pt; line-height: 1.5;">${pText}</p>`);
    }
  }

  if (inTable) flushTable();

  if (inList) {
    htmlLines.push(listType === 'ol' ? '</ol>' : '</ul>');
  }

  const bodyContent = htmlLines.join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Google Docs Export</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #202124; line-height: 1.5; padding: 20px; background-color: #ffffff;">
${bodyContent}
</body>
</html>`;
}

/**
 * Copies formatted text into system clipboard as both 'text/html' and 'text/plain'.
 */
export async function copyFormattedForGoogleDocs(text: string): Promise<boolean> {
  try {
    const html = convertMarkdownToGoogleDocsHtml(text);
    const plain = text;

    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([plain], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });
      await navigator.clipboard.write([item]);
      return true;
    } else {
      await navigator.clipboard.writeText(plain);
      return true;
    }
  } catch (err) {
    console.warn('Fallback standard clipboard write:', err);
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return false;
    }
  }
}

/**
 * Helper to convert color RGB or hex string into hex code #RRGGBB
 */
function rgbToHex(colorStr: string): string | null {
  if (!colorStr) return null;
  const hexMatch = colorStr.match(/#([0-9a-fA-F]{6})/);
  if (hexMatch) return `#${hexMatch[1]}`;
  const rgbMatch = colorStr.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }
  return null;
}

/**
 * Cleans and post-processes Markdown generated or pasted from Google Docs / DOCX / HTML.
 * Eliminates redundant bold wrappers around headings (e.g. **### Title** -> ### Title),
 * removes duplicate bullet characters in list items (e.g. - **• Item** -> - **Item**),
 * fixes double bullet symbols (* • Item -> - Item), and cleans up malformed Markdown tags.
 */
export function cleanGoogleDocsMarkdown(input: string): string {
  if (!input) return '';
  let s = sanitizeText(input);

  // 1. Fix header lines wrapped in bold or containing nested bold
  s = s.replace(/^\s*\*\*+(#+\s*.*?)\*\*+\s*$/gm, '$1');
  s = s.replace(/^\s*(#+\s*)\*\*+(.*?)\*\*+\s*$/gm, '$1$2');
  s = s.replace(/^\s*(#+\s*)__(.*?)__\s*$/gm, '$1$2');

  // 2. Fix list items with double bullets or bolded bullets
  // e.g. "- **• Modal Editing Core:**" -> "- **Modal Editing Core:**"
  s = s.replace(/^(\s*[-*+]\s+)\*\*+[•◦▪▫➢▶❖\-*+–—\s]+(.*?)\*\*+/gm, '$1**$2**');
  // e.g. "- • Item" -> "- Item"
  s = s.replace(/^(\s*[-*+]\s+)[•◦▪▫➢▶❖\s]+\s*/gm, '$1');
  // e.g. "* • Item" -> "- Item"
  s = s.replace(/^\s*[*+]\s+[•◦▪▫➢▶❖]\s*/gm, '- ');
  // e.g. "• Item" -> "- Item"
  s = s.replace(/^\s*[•◦▪▫➢▶❖]\s*/gm, '- ');

  // 3. Fix nested or malformed bold syntax
  s = s.replace(/\*\*\*\*(.*?)\*\*\*\*/g, '**$1**');
  s = s.replace(/\*\* \*\*(.*?)\*\*/g, '**$1**');

  // 4. Remove empty bold tags
  s = s.replace(/\*\*\s*\*\*/g, '');

  // 5. Clean up excessive empty lines
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}

/**
 * Converts HTML pasted or imported from Google Docs or Mammoth DOCX into clean Markdown / Plain Text for LiViA.
 * Accurately preserves nested list depths, text colors, tables, and images without redundant styling or duplicate bullets.
 */
export function convertGoogleDocsHtmlToMarkdown(htmlStringInput: string): string {
  if (!htmlStringInput || !htmlStringInput.trim()) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlStringInput, 'text/html');

  const cleanHeadingText = (str: string): string => {
    let s = str.trim();
    s = s.replace(/^#+\s*/, '');
    s = s.replace(/^\*\*+(.*?)\*\*+$/, '$1');
    s = s.replace(/^__+(.*?)__+$/, '$1');
    s = s.replace(/^\*\*|\*\*$/g, '');
    return s.trim();
  };

  const cleanListItemText = (str: string): string => {
    let s = str.trim();
    // Remove leading bold wrappers around bullet characters e.g. **• Item** -> **Item**
    s = s.replace(/^(\*\*|__|[*_])\s*[•◦▪▫➢▶❖\-*+–—\s]+\s*/, '$1');
    // Remove standalone leading bullet glyphs
    s = s.replace(/^[•◦▪▫➢▶❖\-*+–—\s]+\s*/, '');
    // Clean double bold markers
    s = s.replace(/\*\*\*\*(.*?)\*\*\*\*/g, '**$1**');
    return s.trim();
  };

  const walk = (node: Node, depth: number = 0): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    const style = el.getAttribute('style') || '';

    // Children walk
    const nextDepth = (tagName === 'ul' || tagName === 'ol') ? depth + 1 : depth;
    const childrenText = Array.from(el.childNodes).map(child => walk(child, nextDepth)).join('');

    const isBold = tagName === 'b' || tagName === 'strong' || /font-weight:\s*(700|800|900|bold)/i.test(style);
    const isItalic = tagName === 'i' || tagName === 'em' || /font-style:\s*italic/i.test(style);

    let text = childrenText;

    if (tagName === 'span') {
      if (!text.trim()) return text;
      const trimmed = text.trim();
      // If inner text is already a Markdown block structure, do not wrap in bold/italic
      if (/^(#+|-|\*|\d+\.|>|\|)/.test(trimmed)) return text;

      if (isBold && isItalic) return `***${trimmed}***`;
      if (isBold) return `**${trimmed}**`;
      if (isItalic) return `*${trimmed}*`;
      return text;
    }

    if (tagName === 'h1') return `\n\n# ${cleanHeadingText(text)}\n\n`;
    if (tagName === 'h2') return `\n\n## ${cleanHeadingText(text)}\n\n`;
    if (tagName === 'h3') return `\n\n### ${cleanHeadingText(text)}\n\n`;
    if (tagName === 'h4') return `\n\n#### ${cleanHeadingText(text)}\n\n`;
    if (tagName === 'h5' || tagName === 'h6') return `\n\n##### ${cleanHeadingText(text)}\n\n`;

    if (tagName === 'p' || tagName === 'div') {
      if (!text.trim()) return '\n';
      const trimmed = text.trim();

      // Check if p/div acts as a Title/Heading in Google Docs HTML
      const fontSizeMatch = style.match(/font-size:\s*(\d+(?:\.\d+)?)pt/i);
      const fontSize = fontSizeMatch ? parseFloat(fontSizeMatch[1]) : 0;
      const isTitleClass = el.className.toLowerCase().includes('title');

      if (fontSize >= 18 || isTitleClass) {
        return `\n\n# ${cleanHeadingText(trimmed)}\n\n`;
      }
      if (fontSize >= 14 && isBold) {
        return `\n\n## ${cleanHeadingText(trimmed)}\n\n`;
      }

      return `\n${trimmed}\n`;
    }

    if (tagName === 'li') {
      // Calculate indentation level from depth (parent ul/ol elements)
      const indentSpaces = '  '.repeat(Math.max(0, depth - 1));
      const cleanedItem = cleanListItemText(text);
      return cleanedItem ? `${indentSpaces}- ${cleanedItem}\n` : '';
    }

    if (tagName === 'ul' || tagName === 'ol') {
      return `\n${childrenText}\n`;
    }

    if (tagName === 'table') {
      // Convert HTML table to Markdown table
      const rows = Array.from(el.querySelectorAll('tr'));
      if (rows.length === 0) return text;

      let mdTable = '\n\n';
      rows.forEach((row, rIdx) => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        const cellTexts = cells.map(c => c.textContent?.trim().replace(/\|/g, '\\|') || '');
        mdTable += `| ${cellTexts.join(' | ')} |\n`;

        if (rIdx === 0) {
          // Add header separator
          const separators = cellTexts.map(() => '---');
          mdTable += `| ${separators.join(' | ')} |\n`;
        }
      });
      return mdTable + '\n\n';
    }

    if (tagName === 'img') {
      const src = el.getAttribute('src') || '';
      const alt = el.getAttribute('alt') || 'Immagine';
      return src ? `\n![${alt}](${src})\n` : '';
    }

    if (tagName === 'a') {
      const href = el.getAttribute('href') || '';
      return `[${text.trim()}](${href})`;
    }

    if (tagName === 'code' || tagName === 'pre') {
      return `\`${text.trim()}\``;
    }

    if (tagName === 'b' || tagName === 'strong') {
      const trimmed = text.trim();
      if (/^(#+|-|\*|\d+\.|>|\|)/.test(trimmed)) return text;
      return `**${trimmed}**`;
    }
    if (tagName === 'i' || tagName === 'em') {
      const trimmed = text.trim();
      if (/^(#+|-|\*|\d+\.|>|\|)/.test(trimmed)) return text;
      return `*${trimmed}*`;
    }

    return text;
  };

  const rawResult = walk(doc.body);
  const resultWithColors = sanitizeText(rawResult)
    .replace(/<color:#[a-zA-Z0-9_]+>(.*?)<\/color>/gi, '$1')
    .replace(/<\/?color:[^>]*>/gi, '');

  return cleanGoogleDocsMarkdown(resultWithColors);
}

/**
 * Saves document directly to Google Drive as a native Google Document (.gdoc).
 */
export async function saveAsGoogleDoc(
  accessToken: string,
  filename: string,
  content: string
): Promise<{ id: string; name: string }> {
  const htmlContent = convertMarkdownToGoogleDocsHtml(content);

  const docTitle = filename.replace(/\.(txt|md|docx|json|xml|py|kt|js|ts|sh|tex)$/i, '');

  const metadata = {
    name: docTitle,
    mimeType: 'application/vnd.google-apps.document',
  };

  const boundary = 'livia_gdocs_boundary_999';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
    htmlContent +
    closeDelim;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Errore creazione Google Doc:', errText);
    throw new Error('Impossibile creare il documento in Google Docs');
  }

  const data = await res.json();
  return { id: data.id, name: docTitle };
}
