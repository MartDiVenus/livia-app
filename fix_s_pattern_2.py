import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

content = content.replace("} else if (cmd.startsWith(':s/') || cmd.startsWith(':%s/')) { || cmd.startsWith(':%s/')) {", "} else if (cmd.startsWith(':s/') || cmd.startsWith(':%s/')) {")

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)

print("Fixed typo.")
