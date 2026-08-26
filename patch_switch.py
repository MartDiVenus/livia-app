import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_code = """  const handleSelectMode = (newMode: VimMode) => {
    setShowModeMenu(false);
    if (!editorRef.current?.view) return;
    const cm = getCM(editorRef.current.view);
    if (!cm) return;

    if (newMode === 'normal') {
      Vim.handleKey(cm, '<Esc>', 'mapping');
    } else if (newMode === 'insert') {
      Vim.handleKey(cm, 'i', 'mapping');
    } else if (newMode === 'visual') {
      Vim.handleKey(cm, 'v', 'mapping');
    } else if (newMode === 'visual-line') {
      Vim.handleKey(cm, 'V', 'mapping');
    }
  };"""

new_code = """  const handleSelectMode = (newMode: VimMode) => {
    setShowModeMenu(false);
    if (!editorRef.current?.view) return;
    const cm = getCM(editorRef.current.view);
    if (!cm) return;

    // Always escape to normal mode first
    Vim.handleKey(cm, '<Esc>', 'mapping');

    if (newMode === 'insert') {
      Vim.handleKey(cm, 'i', 'mapping');
    } else if (newMode === 'visual') {
      Vim.handleKey(cm, 'v', 'mapping');
    } else if (newMode === 'visual-line') {
      Vim.handleKey(cm, 'V', 'mapping');
    }
  };"""

content = content.replace(old_code, new_code)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
