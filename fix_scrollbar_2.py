import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

# Remove duplicate scrollbarWidth: "none" if any
content = re.sub(r'scrollbarWidth:\s*\'none\',\s*scrollbarWidth:\s*"none"', 'scrollbarWidth: "none"', content)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
print("Scrollbar duplication fix applied.")
