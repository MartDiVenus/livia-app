import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  LevelFormat,
} from "docx";
import { downloadBlob } from "./downloadHelper";

/**
 * Cleans string of control characters invalid in XML 1.0 (Word OpenXML)
 */
function cleanXmlString(str: string): string {
  if (!str) return "";
  // Word/XML 1.0 allows \t, \n, \r, but disallows 0x00-0x08, 0x0B-0x0C, 0x0E-0x1F, 0x7F
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

interface StyledSpan {
  text: string;
  bold?: boolean;
  italics?: boolean;
  color?: string;
  code?: boolean;
  strike?: boolean;
}

/**
 * Normalizes CSS/Markdown hex or named colors to a valid 6-character hex string for OpenXML (Word).
 */
function normalizeColor(colorStr: string): string {
  let c = colorStr.trim().replace(/^#/, '');
  const namedColors: Record<string, string> = {
    red: 'EF4444',
    green: '10B981',
    blue: '3B82F6',
    yellow: 'F59E0B',
    amber: 'F59E0B',
    orange: 'F97316',
    purple: '8B5CF6',
    violet: '8B5CF6',
    pink: 'EC4899',
    gray: '6B7280',
    grey: '6B7280',
    black: '000000',
    white: 'FFFFFF',
    emerald: '10B981',
  };
  if (namedColors[c.toLowerCase()]) {
    return namedColors[c.toLowerCase()];
  }
  if (c.length === 3) {
    return (c[0] + c[0] + c[1] + c[1] + c[2] + c[2]).toUpperCase();
  }
  if (c.length > 6) {
    return c.substring(0, 6).toUpperCase();
  }
  return c.toUpperCase();
}

/**
 * Recursively tokenizes markdown text into spans with inherited styles (color, bold, italics, code, strike).
 */
function parseFormattedSpans(text: string, currentStyle: Partial<StyledSpan> = {}): StyledSpan[] {
  const clean = cleanXmlString(text);
  if (!clean) return [];

  const regex = /(<color:(#?[a-zA-Z0-9_]+)>(.*?)<\/color>)|(\[([^\]]+)\]\(([^)]+)\))|(`([^`]+)`)|(\*\*\*([^*]+)\*\*\*)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(__([^_]+)__)|(_([^_]+)_)|(~~([^~]+)~~)/g;
  const spans: StyledSpan[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(clean)) !== null) {
    if (match.index > lastIdx) {
      const plain = clean.substring(lastIdx, match.index);
      if (plain) spans.push({ text: plain, ...currentStyle });
    }

    if (match[1]) {
      // Color tag: <color:#HEX>content</color>
      const colorVal = normalizeColor(match[2]);
      const inner = match[3];
      spans.push(...parseFormattedSpans(inner, { ...currentStyle, color: colorVal }));
    } else if (match[4]) {
      // Link: [text](url) -> styled with blue text
      const linkText = match[5];
      spans.push(...parseFormattedSpans(linkText, { ...currentStyle, color: "2563EB" }));
    } else if (match[7]) {
      // Inline Code: `code`
      spans.push({ text: match[8], ...currentStyle, code: true });
    } else if (match[9]) {
      // Bold + Italic: ***text***
      spans.push(...parseFormattedSpans(match[10], { ...currentStyle, bold: true, italics: true }));
    } else if (match[11]) {
      // Bold: **text**
      spans.push(...parseFormattedSpans(match[12], { ...currentStyle, bold: true }));
    } else if (match[13]) {
      // Italic: *text*
      spans.push(...parseFormattedSpans(match[14], { ...currentStyle, italics: true }));
    } else if (match[15]) {
      // Bold: __text__
      spans.push(...parseFormattedSpans(match[16], { ...currentStyle, bold: true }));
    } else if (match[17]) {
      // Italic: _text_
      spans.push(...parseFormattedSpans(match[18], { ...currentStyle, italics: true }));
    } else if (match[19]) {
      // Strike: ~~text~~
      spans.push(...parseFormattedSpans(match[20], { ...currentStyle, strike: true }));
    }

    lastIdx = regex.lastIndex;
  }

  if (lastIdx < clean.length) {
    const remaining = clean.substring(lastIdx);
    if (remaining) spans.push({ text: remaining, ...currentStyle });
  }

  return spans;
}

/**
 * Parses markdown inline styles into docx TextRun elements with exact formatting and colors.
 */
function parseInlineMarkdown(rawText: string, extraStyle: Partial<StyledSpan> = {}): TextRun[] {
  const spans = parseFormattedSpans(rawText, extraStyle);
  if (spans.length === 0) {
    const clean = cleanXmlString(rawText);
    return clean ? [new TextRun({ text: clean, ...extraStyle })] : [];
  }
  return spans.map(s => new TextRun({
    text: s.text,
    bold: s.bold,
    italics: s.italics,
    strike: s.strike,
    color: s.color,
    font: s.code ? "Consolas" : undefined,
    shading: s.code ? { fill: "F3F4F6" } : undefined,
  }));
}

/**
 * Helper to decode base64 data URL to Uint8Array safely in browser
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function createDocxBlob(content: string): Promise<Blob> {
  const sanitizedContent = cleanXmlString(content || "");
  const lines = sanitizedContent.split(/\r?\n/);
  const children: (Paragraph | Table)[] = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let tableBuffer: string[] = [];

  const flushTableBuffer = () => {
    if (tableBuffer.length === 0) return;
    
    // Parse table rows
    const rowsData: string[][] = [];
    for (const rowLine of tableBuffer) {
      const trimmed = rowLine.trim();
      // Skip separator rows like |---|---|
      if (/^\|(\s*[-:]+\s*\|)+$/.test(trimmed)) continue;
      
      const cells = trimmed
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(c => c.trim());
      rowsData.push(cells);
    }

    if (rowsData.length > 0) {
      const numCols = Math.max(...rowsData.map(r => r.length));
      const colWidthPercent = Math.floor(100 / (numCols || 1));

      const tableRows = rowsData.map((rowCells, rIdx) => {
        const isHeader = rIdx === 0;
        return new TableRow({
          children: Array.from({ length: numCols }).map((_, cIdx) => {
            const cellText = rowCells[cIdx] || "";
            return new TableCell({
              width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
              shading: isHeader ? { fill: "F1F5F9" } : undefined,
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
              },
              children: [
                new Paragraph({
                  children: parseInlineMarkdown(cellText, isHeader ? { bold: true } : {}),
                }),
              ],
            });
          }),
        });
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        })
      );
      children.push(new Paragraph({ text: "" }));
    }

    tableBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check code blocks ```
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        inCodeBlock = false;
        for (const cLine of codeBuffer) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: cLine || " ",
                  font: "Consolas",
                  size: 20, // 10pt
                }),
              ],
              shading: { fill: "F8FAFC" },
            })
          );
        }
        children.push(new Paragraph({ text: "" }));
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

    // Check table lines | ... |
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      tableBuffer.push(trimmed);
      continue;
    } else if (tableBuffer.length > 0) {
      flushTableBuffer();
    }

    // Empty line
    if (!trimmed) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    // Ignore reference links at bottom: [key]: url
    if (trimmed.match(/^\[(.*?)\]:\s*(.+)$/)) continue;

    // Detect images: ![alt](url) or ![alt][ref]
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    const refImgMatch = trimmed.match(/^!\[(.*?)\]\[(.*)\]$/);
    
    if (imgMatch || refImgMatch) {
      let url = '';
      let altText = '';
      if (imgMatch) {
        altText = imgMatch[1];
        url = imgMatch[2];
      } else if (refImgMatch) {
        altText = refImgMatch[1];
        const refKey = refImgMatch[2];
        const refLine = lines.find(l => l.trim().startsWith(`[${refKey}]:`));
        if (refLine) {
          url = refLine.trim().split(']:')[1].trim();
        }
      }

      if (url) {
        try {
          let imageBuffer: Uint8Array | null = null;
          let imgType: 'png' | 'jpg' | 'gif' | 'bmp' = 'png';

          if (url.startsWith('data:image/')) {
            // Embedded base64 image data URL
            const mimeMatch = url.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
            if (mimeMatch) {
              const formatPart = mimeMatch[1].toLowerCase();
              if (formatPart.includes('jpeg') || formatPart.includes('jpg')) imgType = 'jpg';
              else if (formatPart.includes('gif')) imgType = 'gif';
              else if (formatPart.includes('bmp')) imgType = 'bmp';
              else imgType = 'png';

              imageBuffer = base64ToUint8Array(mimeMatch[2]);
            }
          } else {
            // External HTTP/HTTPS image
            if (url.includes('drive.google.com')) {
              const driveIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
              if (driveIdMatch && driveIdMatch[1]) {
                url = `https://drive.google.com/thumbnail?id=${driveIdMatch[1]}&sz=w1000`;
              }
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
              const contentType = response.headers.get('content-type') || '';
              if (contentType.includes('jpeg') || contentType.includes('jpg')) imgType = 'jpg';
              else if (contentType.includes('gif')) imgType = 'gif';
              else if (contentType.includes('bmp')) imgType = 'bmp';
              else imgType = 'png';

              const arrayBuf = await response.arrayBuffer();
              imageBuffer = new Uint8Array(arrayBuf);
            }
          }

          if (imageBuffer && imageBuffer.length > 0) {
            children.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    transformation: {
                      width: 450,
                      height: 300,
                    },
                    type: imgType,
                  }),
                ],
              })
            );
            if (altText) {
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: altText, italics: true, size: 18, color: "64748B" })],
                })
              );
            }
            continue;
          }
        } catch (e) {
          console.warn("Could not embed image into DOCX, using fallback text:", e);
        }

        // Fallback for image
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Immagine: ${altText || url}]`,
                italics: true,
                color: "64748B",
              }),
            ],
          })
        );
        continue;
      }
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: parseInlineMarkdown(trimmed.substring(2)),
      }));
    } else if (trimmed.startsWith('## ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: parseInlineMarkdown(trimmed.substring(3)),
      }));
    } else if (trimmed.startsWith('### ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: parseInlineMarkdown(trimmed.substring(4)),
      }));
    } else if (trimmed.startsWith('#### ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_4,
        children: parseInlineMarkdown(trimmed.substring(5)),
      }));
    } else if (trimmed.startsWith('##### ') || trimmed.startsWith('###### ')) {
      const hashCount = trimmed.startsWith('##### ') ? 6 : 7;
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_5,
        children: parseInlineMarkdown(trimmed.substring(hashCount)),
      }));
    } else if (/^[-*+]\s+\[([ xX])\]\s+/.test(trimmed)) {
      // Task list item: - [x] or - [ ]
      const isChecked = /^[-*+]\s+\[[xX]\]/.test(trimmed);
      const taskText = trimmed.replace(/^[-*+]\s+\[([ xX])\]\s+/, '');
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: isChecked ? "[✓] " : "[ ] ",
            bold: true,
            color: isChecked ? "10B981" : "64748B",
          }),
          ...parseInlineMarkdown(taskText),
        ],
      }));
    } else if (/^[-*+]\s+/.test(trimmed)) {
      // Bullet list items with indent calculation
      const leadingSpaces = rawLine.search(/\S|$/);
      const indentLevel = Math.min(2, Math.floor(leadingSpaces / 2));
      const textAfterBullet = trimmed.replace(/^[-*+]\s+/, '');
      
      children.push(new Paragraph({
        numbering: { reference: "standard-bullets", level: indentLevel },
        children: parseInlineMarkdown(textAfterBullet),
      }));
    } else if (/^\d+\.\s+/.test(trimmed)) {
      // Numbered list items
      const textAfterNumber = trimmed.replace(/^\d+\.\s+/, '');
      children.push(new Paragraph({
        children: [
          new TextRun({ text: trimmed.match(/^\d+\.\s+/)?.[0] || "1. ", bold: true }),
          ...parseInlineMarkdown(textAfterNumber),
        ],
      }));
    } else if (trimmed.startsWith('> ')) {
      // Blockquotes
      children.push(new Paragraph({
        indent: { left: 720 }, // 0.5 inch
        children: parseInlineMarkdown(trimmed.substring(2)),
      }));
    } else {
      // Standard paragraph with inline formatting
      children.push(new Paragraph({
        children: parseInlineMarkdown(trimmed),
      }));
    }
  }

  // Flush any dangling table buffer
  flushTableBuffer();

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "standard-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 1,
              format: LevelFormat.BULLET,
              text: "\u25E6",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
            },
            {
              level: 2,
              format: LevelFormat.BULLET,
              text: "\u25AA",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 2160, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: children.length > 0 ? children : [new Paragraph({ text: "" })],
    }],
  });

  return await Packer.toBlob(doc);
}

export async function exportToDocx(filename: string, content: string): Promise<void> {
  const blob = await createDocxBlob(content);
  const cleanName = filename.replace(/\.[^/.]+$/, "");
  const downloadName = `${cleanName || 'documento'}.docx`;
  downloadBlob(blob, downloadName);
}
