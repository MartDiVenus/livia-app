with open("src/components/VimEditor.tsx", "r") as f:
    vim = f.read()

vim = vim.replace('autoSaveId="livia-layout"', 'autoSaveId="livia-layout"')
# Wait, it suggested autoSave? Let's use autoSaveId="livia-layout" -> autoSaveId="livia-layout" (already there).
# In react-resizable-panels it's actually `autoSaveId`. Let me look at the API, or just remove it to be safe.
vim = vim.replace('autoSaveId="livia-layout"', 'autoSaveId="livia-layout" id="livia-layout"')

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(vim)
