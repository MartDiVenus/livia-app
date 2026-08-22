import re

with open('src/types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace `help: { ... }` in TEMPLATES
content = re.sub(
    r"help:\s*\{\s*name:\s*\"help\.txt\",\s*format:\s*\"txt\",\s*content:\s*`.*?={78}`\s*\}",
    "help: HELP_TEMPLATE",
    content,
    flags=re.DOTALL
)

with open('src/types.ts', 'w', encoding='utf-8') as f:
    f.write(content)

