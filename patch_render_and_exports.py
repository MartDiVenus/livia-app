import re

# 1. Update previewRenderer.tsx
with open("src/utils/previewRenderer.tsx", "r") as f:
    preview = f.read()

# Add referrerPolicy
preview = preview.replace(
    'className="max-w-full h-auto my-3 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800"',
    'className="max-w-full h-auto my-3 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800"\n              referrerPolicy="no-referrer"'
)

# Hide reference links
loop_start = """    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Code blocks"""
loop_start_replace = """    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Hide reference definitions from plain text rendering
      if (line.match(/^\\[(.*?)\\]:\\s*(.+)$/)) {
        i++;
        continue;
      }

      // Code blocks"""
preview = preview.replace(loop_start, loop_start_replace)

# Google Drive URL logic in preview
drive_logic = """          // Transform Google Drive viewer URLs to direct content URLs
          if (url.includes('drive.google.com/file/d/')) {
            const driveIdMatch = url.match(/file\\/d\\/([^/]+)/);
            if (driveIdMatch && driveIdMatch[1]) {
              url = `https://drive.google.com/uc?id=${driveIdMatch[1]}`;
            }
          }"""
drive_logic_replace = """          // Transform Google Drive viewer URLs to direct content URLs
          if (url.includes('drive.google.com')) {
            const driveIdMatch = url.match(/\\/d\\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
            if (driveIdMatch && driveIdMatch[1]) {
              // Try the lh3.googleusercontent.com endpoint which is often more permissive for embedding
              url = `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
            }
          }"""
preview = preview.replace(drive_logic, drive_logic_replace)

with open("src/utils/previewRenderer.tsx", "w") as f:
    f.write(preview)

# 2. Update pdfExport.ts
with open("src/utils/pdfExport.ts", "r") as f:
    pdf = f.read()

# Don't use crossOrigin for blob/data, and use proxy/lh3 for drive
pdf_cors_logic = """    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {"""
pdf_cors_logic_replace = """    return new Promise((resolve) => {
      const img = new Image();
      if (!url.startsWith('data:') && !url.startsWith('blob:')) {
        img.crossOrigin = 'Anonymous';
      }
      img.onload = () => {"""
pdf = pdf.replace(pdf_cors_logic, pdf_cors_logic_replace)

pdf_drive_logic = """        if (url.includes('drive.google.com/file/d/')) {
          const driveIdMatch = url.match(/file\\/d\\/([^/]+)/);
          if (driveIdMatch && driveIdMatch[1]) {
            url = `https://drive.google.com/uc?id=${driveIdMatch[1]}`;
          }
        }"""
pdf_drive_logic_replace = """        if (url.includes('drive.google.com')) {
          const driveIdMatch = url.match(/\\/d\\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
          if (driveIdMatch && driveIdMatch[1]) {
            // Using corsproxy.io as fallback for PDF/Canvas CORS restrictions on Drive
            const directUrl = `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
            url = `https://corsproxy.io/?${encodeURIComponent(directUrl)}`;
          }
        }"""
pdf = pdf.replace(pdf_drive_logic, pdf_drive_logic_replace)

with open("src/utils/pdfExport.ts", "w") as f:
    f.write(pdf)

# 3. Update docxExport.ts
with open("src/utils/docxExport.ts", "r") as f:
    docx = f.read()

docx_drive_logic = """        if (url.includes('drive.google.com/file/d/')) {
          const driveIdMatch = url.match(/file\\/d\\/([^/]+)/);
          if (driveIdMatch && driveIdMatch[1]) {
            url = `https://drive.google.com/uc?id=${driveIdMatch[1]}`;
          }
        }"""
docx_drive_logic_replace = """        if (url.includes('drive.google.com')) {
          const driveIdMatch = url.match(/\\/d\\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
          if (driveIdMatch && driveIdMatch[1]) {
            const directUrl = `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
            url = `https://corsproxy.io/?${encodeURIComponent(directUrl)}`;
          }
        }"""
docx = docx.replace(docx_drive_logic, docx_drive_logic_replace)

with open("src/utils/docxExport.ts", "w") as f:
    f.write(docx)

print("Render and Exports patched successfully.")
