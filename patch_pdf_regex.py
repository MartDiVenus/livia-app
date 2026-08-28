import re

with open("src/utils/pdfExport.ts", "r") as f:
    content = f.read()

# Fix the imgMatch regex to not require end-of-line anchors ($)
regex_anchor = """    // Detect standalone images
    const imgMatch = trimmed.match(/^!\\[(.*?)\\]\\((.*?)\\)$/);
    const refImgMatch = trimmed.match(/^!\\[(.*?)\\]\\[(.*)\\]$/);"""

regex_replace = """    // Detect images on their own lines or isolated
    const imgMatch = trimmed.match(/^!\\[(.*?)\\]\\((.*?)\\)/);
    const refImgMatch = trimmed.match(/^!\\[(.*?)\\]\\[(.*?)\\]/);"""

if regex_anchor in content:
    content = content.replace(regex_anchor, regex_replace)
else:
    print("Could not find regex anchor")

with open("src/utils/pdfExport.ts", "w") as f:
    f.write(content)

print("PDF regex fixed.")
