import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

# Add scrollbarWidth: 'none' to textarea style
pattern = r"(\n\s*lineHeight:\s*'1\.5',\s*\n\s*tabSize:\s*4,\s*\n\s*MozTabSize:\s*4)(\n\s*\})"
replace = r'\1,\n              scrollbarWidth: "none"\2'

if re.search(pattern, content):
    content = re.sub(pattern, replace, content)
    with open("src/components/VimEditor.tsx", "w") as f:
        f.write(content)
    print("Fixed textarea scrollbarWidth")
else:
    print("Could not find textarea style")
