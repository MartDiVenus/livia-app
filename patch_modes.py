import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_code = """    // Always escape to normal mode first
    Vim.handleKey(cm, '<Esc>', 'mapping');"""

new_code = """    // Always escape to normal mode first
    if (Vim.exitInsertMode) Vim.exitInsertMode(cm);
    if (Vim.exitVisualMode) Vim.exitVisualMode(cm);"""

content = content.replace(old_code, new_code)
with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
