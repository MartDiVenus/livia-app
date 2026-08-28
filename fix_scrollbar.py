import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

pattern = r'(\n\s*MozTabSize: 4)(\n\s*\})'
replace = r'\1,\n              scrollbarWidth: "none"\2'

new_content = re.sub(pattern, replace, content)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(new_content)
print("Scrollbar fix applied.")
