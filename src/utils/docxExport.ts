import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

export async function exportToDocx(filename: string, content: string): Promise<void> {
  const lines = content.split('\n');
  const children: any[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    if (trimmed.startsWith('# ')) {
      children.push(new Paragraph({ text: trimmed.substring(2), heading: HeadingLevel.HEADING_1 }));
    } else if (trimmed.startsWith('## ')) {
      children.push(new Paragraph({ text: trimmed.substring(3), heading: HeadingLevel.HEADING_2 }));
    } else if (trimmed.startsWith('### ')) {
      children.push(new Paragraph({ text: trimmed.substring(4), heading: HeadingLevel.HEADING_3 }));
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      children.push(new Paragraph({
        text: trimmed.substring(2),
        bullet: { level: 0 }
      }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun(trimmed)]
      }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const cleanName = filename.replace(/\.[^/.]+$/, "");
  link.download = `${cleanName}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
