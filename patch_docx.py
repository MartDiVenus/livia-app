import re

with open("src/utils/docxExport.ts", "r") as f:
    content = f.read()

# Add ImageRun import
import_anchor = 'import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";'
import_replace = 'import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from "docx";'
if import_anchor in content:
    content = content.replace(import_anchor, import_replace)

loop_anchor = """    if (!trimmed) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }"""

loop_replace = """    if (!trimmed) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    // Ignore reference links
    if (trimmed.match(/^\\[(.*?)\\]:\\s*(.+)$/)) continue;

    // Detect images
    const imgMatch = trimmed.match(/^!\\[(.*?)\\]\\((.*?)\\)$/);
    const refImgMatch = trimmed.match(/^!\\[(.*?)\\]\\[(.*)\\]$/);
    
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
        if (url.includes('drive.google.com/file/d/')) {
          const driveIdMatch = url.match(/file\\/d\\/([^/]+)/);
          if (driveIdMatch && driveIdMatch[1]) {
            url = `https://drive.google.com/uc?id=${driveIdMatch[1]}`;
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
                }
              })
            ]
          }));
          continue;
        } catch (e) {
          console.error("Failed to load image for DOCX", e);
        }
      }
    }
"""
if loop_anchor in content:
    content = content.replace(loop_anchor, loop_replace)
else:
    print("Could not find loop anchor")

with open("src/utils/docxExport.ts", "w") as f:
    f.write(content)

print("docxExport.ts patched successfully")
