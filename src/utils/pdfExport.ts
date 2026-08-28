/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';

/**
 * Clean strings for PDF headers/footers to avoid garbled encoding characters
 */
function sanitizeAscii(str: string): string {
  return str
    .replace(/[^\x00-\x7F]/g, '')
    .trim();
}

/**
 * Remove markdown inline formatting markers for clean vector PDF text output
 */
function stripMarkdownInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')      // bold **text**
    .replace(/__(.*?)__/g, '$1')          // bold __text__
    .replace(/\*(.*?)\*/g, '$1')          // italic *text*
    .replace(/_(.*?)_/g, '$1')            // italic _text_
    .replace(/~~(.*?)~~/g, '$1')          // strikethrough ~~text~~
    .replace(/`([^`]+)`/g, '$1')          // inline code `code`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links [text](url)
    .replace(/<color:[^>]+>(.*?)<\/color>/g, '$1') // custom color tags
    .replace(/<[^>]+>/g, '')             // other html tags
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // remove inline images
    .replace(/!\[([^\]]*)\]\[[^\]]+\]/g, ''); // remove inline ref images
}

/**
 * Exports document content into a crisp, vector-rendered, fully selectable PDF.
 * Uses native jsPDF vector text routines to guarantee:
 * 1. 100% selectable and copyable text
 * 2. Zero text slicing across page breaks
 * 3. Compact file sizes
 * 4. Beautiful typography with headers, footers, and page numbers
 */
export async function exportToPDF(filename: string, content: string, includeHeader: boolean = true): Promise<void> {
  const cleanName = filename.replace(/\.[^/.]+$/, "");

  // Helper to load image data
  const loadImageData = async (url: string): Promise<{ dataUrl: string, width: number, height: number } | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      if (!url.startsWith('data:') && !url.startsWith('blob:')) {
        img.crossOrigin = 'Anonymous';
      }
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.9), width: img.width, height: img.height });
        } else resolve(null);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const rawLines = content.split(/\r?\n/);
  const references: Record<string, string> = {};
  for (const line of rawLines) {
    const refMatch = line.match(/^\[(.*?)\]:\s*(.+)$/);
    if (refMatch) references[refMatch[1]] = refMatch[2].trim();
  }

  const safeDocTitle = filename || cleanName || 'documento';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();   // 595.28 pt
  const pageHeight = doc.internal.pageSize.getHeight(); // 841.89 pt

  const leftMargin = 48;
  const rightMargin = 48;
  const topMargin = includeHeader ? 60 : 48;
  const bottomMargin = 55;
  const contentWidth = pageWidth - leftMargin - rightMargin;
  const maxY = pageHeight - bottomMargin;

  let currentY = topMargin;

  // Helper to add a new page
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > maxY) {
      doc.addPage();
      currentY = topMargin;
    }
  };

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  for (let idx = 0; idx < rawLines.length; idx++) {
    const rawLine = rawLines[idx];
    const trimmed = rawLine.trim();

    // 1. Code block delimiter (```)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block: render collected lines
        const codeFontSize = 8.5;
        const codeLineHeight = 12;
        const blockPadding = 8;
        const totalCodeHeight = (codeBlockLines.length * codeLineHeight) + (blockPadding * 2);

        checkPageBreak(Math.min(totalCodeHeight, 100));

        // Draw light background container for code
        const startY = currentY;
        doc.setFont('courier', 'normal');
        doc.setFontSize(codeFontSize);
        doc.setTextColor(30, 41, 59);

        for (const cLine of codeBlockLines) {
          checkPageBreak(codeLineHeight);
          const wrapped = doc.splitTextToSize(cLine || ' ', contentWidth - (blockPadding * 2));
          for (const wLine of wrapped) {
            checkPageBreak(codeLineHeight);
            doc.text(wLine, leftMargin + blockPadding, currentY + 9);
            currentY += codeLineHeight;
          }
        }

        // Draw border box around rendered block
        const blockHeight = currentY - startY + 4;
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.rect(leftMargin, startY - 2, contentWidth, blockHeight, 'S');

        currentY += 10;
        inCodeBlock = false;
        codeBlockLines = [];
      } else {
        inCodeBlock = true;
        codeBlockLines = [];
      }
      continue;
    }
    
    // Ignore reference link definitions in the output
    if (trimmed.match(/^\[(.*?)\]:\s*(.+)$/)) continue;

    // Detect images on their own lines or isolated
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)/);
    const refImgMatch = trimmed.match(/^!\[(.*?)\]\[(.*?)\]/);
    
    if (imgMatch || refImgMatch) {
      let url = '';
      if (imgMatch) {
        url = imgMatch[2];
      } else if (refImgMatch) {
        const refKey = refImgMatch[2];
        url = references[refKey] || '';
      }
      
      if (url) {
        if (url.includes('drive.google.com')) {
            const driveIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
            if (driveIdMatch && driveIdMatch[1]) {
              // The thumbnail endpoint is currently the most reliable way to hotlink Drive images
              url = `https://drive.google.com/thumbnail?id=${driveIdMatch[1]}&sz=w1000`;
            }
          }
        
        const imgData = await loadImageData(url);
        if (imgData) {
          // Calculate dimensions to fit width
          const maxWidth = contentWidth;
          const scale = Math.min(1, maxWidth / imgData.width);
          const drawWidth = imgData.width * scale;
          const drawHeight = imgData.height * scale;
          
          checkPageBreak(drawHeight + 20);
          
          // Center image
          const xOffset = leftMargin + (contentWidth - drawWidth) / 2;
          currentY += 10;
          doc.addImage(imgData.dataUrl, 'JPEG', xOffset, currentY, drawWidth, drawHeight);
          currentY += drawHeight + 15;
          continue;
        }
      }
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // 2. Empty line
    if (!trimmed) {
      currentY += 8;
      checkPageBreak(12);
      continue;
    }

    // 3. Horizontal rule (---, ___, ***)
    if (/^([-*_]){3,}$/.test(trimmed)) {
      checkPageBreak(16);
      currentY += 6;
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.75);
      doc.line(leftMargin, currentY, leftMargin + contentWidth, currentY);
      currentY += 10;
      continue;
    }

    // 4. Headings
    if (trimmed.startsWith('# ')) {
      const text = stripMarkdownInline(trimmed.substring(2).trim());
      checkPageBreak(32);
      currentY += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(17, 24, 39);
      
      const wrapped = doc.splitTextToSize(text, contentWidth);
      for (const wLine of wrapped) {
        checkPageBreak(20);
        doc.text(wLine, leftMargin, currentY);
        currentY += 20;
      }
      // Accent underline below H1
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, currentY - 4, leftMargin + contentWidth, currentY - 4);
      currentY += 6;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      const text = stripMarkdownInline(trimmed.substring(3).trim());
      checkPageBreak(26);
      currentY += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(31, 41, 55);

      const wrapped = doc.splitTextToSize(text, contentWidth);
      for (const wLine of wrapped) {
        checkPageBreak(17);
        doc.text(wLine, leftMargin, currentY);
        currentY += 17;
      }
      currentY += 4;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      const text = stripMarkdownInline(trimmed.substring(4).trim());
      checkPageBreak(22);
      currentY += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);

      const wrapped = doc.splitTextToSize(text, contentWidth);
      for (const wLine of wrapped) {
        checkPageBreak(15);
        doc.text(wLine, leftMargin, currentY);
        currentY += 15;
      }
      currentY += 3;
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      const text = stripMarkdownInline(trimmed.substring(5).trim());
      checkPageBreak(18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);

      const wrapped = doc.splitTextToSize(text, contentWidth);
      for (const wLine of wrapped) {
        checkPageBreak(14);
        doc.text(wLine, leftMargin, currentY);
        currentY += 14;
      }
      currentY += 2;
      continue;
    }

    // 5. Blockquotes (> quote)
    if (trimmed.startsWith('>')) {
      const quoteText = stripMarkdownInline(trimmed.replace(/^>\s*/, '').trim());
      checkPageBreak(18);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(75, 85, 99);

      const quoteLeft = leftMargin + 14;
      const quoteWidth = contentWidth - 14;
      const wrapped = doc.splitTextToSize(quoteText, quoteWidth);
      
      const startQuoteY = currentY;
      for (const wLine of wrapped) {
        checkPageBreak(14);
        doc.text(wLine, quoteLeft, currentY);
        currentY += 14;
      }

      // Draw quote vertical bar on left
      doc.setDrawColor(156, 163, 175);
      doc.setLineWidth(2);
      doc.line(leftMargin + 3, startQuoteY - 8, leftMargin + 3, currentY - 4);
      currentY += 4;
      continue;
    }

    // 6. Bullet lists (- item, * item, • item)
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      const itemText = stripMarkdownInline(bulletMatch[1]);
      checkPageBreak(15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(31, 41, 55);

      // Draw bullet point symbol
      doc.text('•', leftMargin + 4, currentY);

      const itemLeft = leftMargin + 14;
      const itemWidth = contentWidth - 14;
      const wrapped = doc.splitTextToSize(itemText, itemWidth);

      for (let i = 0; i < wrapped.length; i++) {
        if (i > 0) checkPageBreak(14);
        doc.text(wrapped[i], itemLeft, currentY);
        currentY += 13.5;
      }
      continue;
    }

    // 7. Numbered lists (1. item)
    const numMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);
    if (numMatch) {
      const numLabel = numMatch[1];
      const itemText = stripMarkdownInline(numMatch[2]);
      checkPageBreak(15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(31, 41, 55);

      doc.text(numLabel, leftMargin + 2, currentY);

      const itemLeft = leftMargin + 18;
      const itemWidth = contentWidth - 18;
      const wrapped = doc.splitTextToSize(itemText, itemWidth);

      for (let i = 0; i < wrapped.length; i++) {
        if (i > 0) checkPageBreak(14);
        doc.text(wrapped[i], itemLeft, currentY);
        currentY += 13.5;
      }
      continue;
    }

    // 8. Regular text paragraph
    const cleanParagraph = stripMarkdownInline(trimmed);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(31, 41, 55);

    const wrapped = doc.splitTextToSize(cleanParagraph, contentWidth);
    for (const wLine of wrapped) {
      checkPageBreak(14);
      doc.text(wLine, leftMargin, currentY);
      currentY += 13.5;
    }
  }

  // Handle any unclosed code block
  if (inCodeBlock && codeBlockLines.length > 0) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    for (const cLine of codeBlockLines) {
      checkPageBreak(12);
      doc.text(cLine, leftMargin + 6, currentY);
      currentY += 12;
    }
  }

  // Final Pass: Apply Header and Footer to every page with accurate total page count
  const totalPages = doc.getNumberOfPages();
  const dateStr = new Date().toLocaleDateString();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Top Header (if enabled)
    if (includeHeader) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128); // gray-500
      doc.text(`LiViA Editor - ${safeDocTitle}`, leftMargin, 32);
      
      doc.setFont('helvetica', 'normal');
      doc.text(dateStr, pageWidth - rightMargin - doc.getTextWidth(dateStr), 32);

      // Header separator line
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, 38, pageWidth - rightMargin, 38);
    }

    // Bottom Footer
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, pageHeight - 32, pageWidth - rightMargin, pageHeight - 32);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text('Generato con LiViA Editor', leftMargin, pageHeight - 20);

    const pageNumStr = `Pagina ${i} di ${totalPages}`;
    const pageNumWidth = doc.getTextWidth(pageNumStr);
    doc.text(pageNumStr, pageWidth - rightMargin - pageNumWidth, pageHeight - 20);
  }

  // Save the generated vector PDF
  doc.save(`${cleanName || 'livi_document'}.pdf`);
}
