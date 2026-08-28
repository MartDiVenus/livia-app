import re

files = [
    "src/utils/previewRenderer.tsx",
    "src/utils/pdfExport.ts",
    "src/utils/docxExport.ts"
]

for file in files:
    with open(file, "r") as f:
        content = f.read()

    # The block we used previously:
    # url.includes('drive.google.com') ...
    # url = `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
    # or corsproxy with lh3...
    
    # We will replace the entire block that checks for 'drive.google.com'
    # It looks something like:
    # if (url.includes('drive.google.com')) {
    #   const driveIdMatch = ...
    #   if (driveIdMatch && driveIdMatch[1]) {
    #       ...
    #   }
    # }
    
    # Let's find the exact regex to replace
    
    # In previewRenderer.tsx:
    #           if (url.includes('drive.google.com')) {
    #             const driveIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
    #             if (driveIdMatch && driveIdMatch[1]) {
    #               // Try the lh3.googleusercontent.com endpoint which is often more permissive for embedding
    #               url = `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
    #             }
    #           }
    
    if "lh3.googleusercontent.com" in content or "corsproxy.io" in content:
        # Just rewrite it using regex sub
        pattern = re.compile(r'if \(url\.includes\(\'drive\.google\.com\'\)\) \{[\s\S]*?\}[\s]*\}', re.MULTILINE)
        
        replacement = r'''if (url.includes('drive.google.com')) {
            const driveIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
            if (driveIdMatch && driveIdMatch[1]) {
              // The thumbnail endpoint is currently the most reliable way to hotlink Drive images
              url = `https://drive.google.com/thumbnail?id=${driveIdMatch[1]}&sz=w1000`;
            }
          }'''
        
        content = pattern.sub(replacement, content)
        
        with open(file, "w") as f:
            f.write(content)
        print(f"Patched {file}")

