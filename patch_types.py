import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

content = content.replace("Vim.exitInsertMode(cm)", "Vim.exitInsertMode(cm as any)")
content = content.replace("Vim.exitVisualMode(cm)", "Vim.exitVisualMode(cm as any)")

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
