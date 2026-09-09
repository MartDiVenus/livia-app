import re

with open("src/App.tsx", "r") as f:
    app = f.read()

app = re.sub(r'\s*showMdPreview=\{showMdPreview\}', '', app)
app = re.sub(r'\s*setShowMdPreview=\{setShowMdPreview\}', '', app)

with open("src/App.tsx", "w") as f:
    f.write(app)

with open("src/components/VimEditor.tsx", "r") as f:
    vim = f.read()

vim = vim.replace("import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';", "import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';")

# In PanelGroup we used direction="horizontal", but Group expects orientation="horizontal"
vim = vim.replace('direction="horizontal"', 'orientation="horizontal"')

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(vim)
