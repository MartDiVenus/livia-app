import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from "docx";

export async function exportToDocx(filename: string, content: string): Promise<void> {
  const lines = content.split('\n');
  const children: any[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    // Ignore reference links
    if (trimmed.match(/^\[(.*?)\]:\s*(.+)$/)) continue;

    // Detect images
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    const refImgMatch = trimmed.match(/^!\[(.*?)\]\[(.*)\]$/);
    
    if (imgMatch || refImgMatch) {
      let url = '';
      if (imgMatch) {
        url = imgMatch[2];
      } else if (refImgMatch) {
        // Need to extract references first. Let's do a quick pass if not already done.
        const refKey = refImgMatch[2];
        const refLine = lines.find(l => l.startsWith(`[${refKey}]:`));
        if (refLine) {
          url = refLine.split(']:')[1].trim();
        }
      }

      if (url) {
        if (url.includes('drive.google.com')) {
            const driveIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
            if (driveIdMatch && driveIdMatch[1]) {
              // The thumbnail endpoint is currently the most reliable way to hotlink Drive images
              url = `https://drive.google.com/thumbnail?id=${driveIdMatch[1]}&sz=w1000`;
            }
          }

        try {
          // Fetch image buffer
          const response = await fetch(url);
          const buffer = await response.arrayBuffer();
          
          children.push(new Paragraph({
            children: [
              new ImageRun({
                data: buffer,
                transformation: {
                  width: 400,
                  height: 300
                },
                type: 'png' // Add type to satisfy CoreImageOptions
              })
            ]
          }));
          continue;
        } catch (e) {
          console.error("Failed to load image for DOCX", e);
        }
      }
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
