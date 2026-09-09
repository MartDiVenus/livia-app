import re

with open("src/components/Toolbar.tsx", "r") as f:
    content = f.read()

# Make Preview button always visible
content = content.replace("{format === 'md' && setShowMdPreview && (", "{setShowMdPreview && (")

with open("src/components/Toolbar.tsx", "w") as f:
    f.write(content)
