import re

with open('src/types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "help: HELP_TEMPLATE\n\nexport const TEMPLATES_EN",
    "help: HELP_TEMPLATE\n};\n\nexport const TEMPLATES_EN"
)

with open('src/types.ts', 'w', encoding='utf-8') as f:
    f.write(content)

