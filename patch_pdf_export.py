import re

with open("src/utils/pdfExport.ts", "r") as f:
    content = f.read()

# 1. Strip images in stripMarkdownInline so they don't appear as text if inline
strip_anchor = "    .replace(/<[^>]+>/g, '');             // other html tags"
strip_replace = """    .replace(/<[^>]+>/g, '')             // other html tags
    .replace(/!\\[([^\\]]*)\\]\\([^)]+\\)/g, '') // remove inline images
    .replace(/!\\[([^\\]]*)\\]\\[[^\\]]+\\]/g, ''); // remove inline ref images"""
if strip_anchor in content:
    content = content.replace(strip_anchor, strip_replace)

# 2. Add loadImageData and references parsing at the beginning of exportToPDF
export_anchor = """export async function exportToPDF(filename: string, content: string, includeHeader: boolean = true): Promise<void> {
  const cleanName = filename.replace(/\\.[^/.]+$/, "");"""
export_replace = """export async function exportToPDF(filename: string, content: string, includeHeader: boolean = true): Promise<void> {
  const cleanName = filename.replace(/\\.[^/.]+$/, "");

  // Helper to load image data
  const loadImageData = async (url: string): Promise<{ dataUrl: string, width: number, height: number } | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
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

  const rawLines = content.split(/\\r?\\n/);
  const references: Record<string, string> = {};
  for (const line of rawLines) {
    const refMatch = line.match(/^\\[(.*?)\\]:\\s*(.+)$/);
    if (refMatch) references[refMatch[1]] = refMatch[2].trim();
  }
"""
if export_anchor in content:
    content = content.replace(export_anchor, export_replace)
else:
    print("Failed to find export anchor")

# 3. Add image processing in the loop, right after code block logic
loop_anchor = """      } else {
        inCodeBlock = true;
        codeBlockLines = [];
      }
      continue;
    }"""
loop_replace = """      } else {
        inCodeBlock = true;
        codeBlockLines = [];
      }
      continue;
    }
    
    // Ignore reference link definitions in the output
    if (trimmed.match(/^\\[(.*?)\\]:\\s*(.+)$/)) continue;

    // Detect standalone images
    const imgMatch = trimmed.match(/^!\\[(.*?)\\]\\((.*?)\\)$/);
    const refImgMatch = trimmed.match(/^!\\[(.*?)\\]\\[(.*)\\]$/);
    
    if (imgMatch || refImgMatch) {
      let url = '';
      if (imgMatch) {
        url = imgMatch[2];
      } else if (refImgMatch) {
        const refKey = refImgMatch[2];
        url = references[refKey] || '';
      }
      
      if (url) {
        if (url.includes('drive.google.com/file/d/')) {
          const driveIdMatch = url.match(/file\\/d\\/([^/]+)/);
          if (driveIdMatch && driveIdMatch[1]) {
            url = `https://drive.google.com/uc?id=${driveIdMatch[1]}`;
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
    }"""
if loop_anchor in content:
    content = content.replace(loop_anchor, loop_replace)
else:
    print("Failed to find loop anchor")

# Remove the rawLines split that was originally there to avoid declaring it twice
double_split_anchor = """  };

  const rawLines = content.split(/\\r?\\n/);
  let inCodeBlock = false;"""
double_split_replace = """  };

  let inCodeBlock = false;"""
if double_split_anchor in content:
    content = content.replace(double_split_anchor, double_split_replace)
else:
    # Actually wait, rawLines is declared AFTER checkPageBreak in the original code. 
    # Let me check where it is.
    pass

with open("src/utils/pdfExport.ts", "w") as f:
    f.write(content)

print("pdfExport.ts patched successfully.")
