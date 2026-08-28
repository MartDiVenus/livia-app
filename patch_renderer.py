import re

with open("src/utils/previewRenderer.tsx", "r") as f:
    content = f.read()

# Pre-process references
ref_anchor = "if (format === 'md' || format === 'docx' || format === 'txt') {"
ref_insert = """if (format === 'md' || format === 'docx' || format === 'txt') {
    const lines = content.split('\\n');
    
    // Pass 1: Extract all reference links [refName]: url
    const references: Record<string, string> = {};
    for (const line of lines) {
      const refMatch = line.match(/^\\[(.*?)\\]:\\s*(.+)$/);
      if (refMatch) {
        references[refMatch[1]] = refMatch[2].trim();
      }
    }
"""
if ref_anchor in content:
    content = content.replace("if (format === 'md' || format === 'docx' || format === 'txt') {\n    const lines = content.split('\\n');", ref_insert)
else:
    print("Could not find ref_anchor")

# Replace imgMatch parsing to handle both standard and reference links, and Drive links
img_anchor = """        // Images ![alt](url)
        const imgMatch = remaining.match(/^!\\[(.*?)\\]\\((.*?)\\)/);
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
        }"""

img_insert = """        // Images ![alt](url) or ![alt][ref]
        const imgMatch = remaining.match(/^!\\[(.*?)\\]\\((.*?)\\)/);
        const refImgMatch = remaining.match(/^!\\[(.*?)\\]\\[(.*?)\\]/);
        
        let matched = false;
        let altText = '';
        let url = '';
        let matchLength = 0;

        if (imgMatch) {
          altText = imgMatch[1];
          url = imgMatch[2];
          matchLength = imgMatch[0].length;
          matched = true;
        } else if (refImgMatch) {
          altText = refImgMatch[1];
          const refKey = refImgMatch[2];
          if (references[refKey]) {
             url = references[refKey];
             matchLength = refImgMatch[0].length;
             matched = true;
          }
        }

        if (matched) {
          // Transform Google Drive viewer URLs to direct content URLs
          if (url.includes('drive.google.com/file/d/')) {
            const driveIdMatch = url.match(/file\\/d\\/([^/]+)/);
            if (driveIdMatch && driveIdMatch[1]) {
              url = `https://drive.google.com/uc?id=${driveIdMatch[1]}`;
            }
          }
        
          parts.push(
            <img
              key={keyCounter++}
              src={url}
              alt={altText || 'Immagine'}
              className="max-w-full h-auto my-3 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800"
            />
          );
          remaining = remaining.substring(matchLength);
          continue;
        }"""

if img_anchor in content:
    content = content.replace(img_anchor, img_insert)
else:
    print("Could not find img_anchor")


with open("src/utils/previewRenderer.tsx", "w") as f:
    f.write(content)

print("previewRenderer.tsx patched successfully.")
