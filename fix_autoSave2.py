with open("src/components/VimEditor.tsx", "r") as f:
    vim = f.read()

vim = vim.replace('autoSaveId="livia-layout" ', '')

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(vim)
