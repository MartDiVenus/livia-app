import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_code = """  const handleSelectMode = (newMode: VimMode) => {
    setShowModeMenu(false);
    if (!editorRef.current?.view) return;
    const cm = getCM(editorRef.current.view);
    if (!cm) return;

    editorRef.current.view.focus();
    
    // Always escape to normal mode first natively
    Vim.handleKey(cm, '<Esc>', 'mapping');

    if (newMode === 'insert') {
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

    // Use exit modes to force state to normal cleanly
    if (Vim.exitInsertMode) Vim.exitInsertMode(cm as any);
    if (Vim.exitVisualMode) Vim.exitVisualMode(cm as any);

    // If changing to normal, we are done
    if (newMode === 'normal') {
      editorRef.current.view.focus();
      return;
    }

    // Schedule the new mode keypress slightly later to allow CM state to settle
    setTimeout(() => {
      if (newMode === 'insert') {
        Vim.handleKey(cm, 'i', 'mapping');
      } else if (newMode === 'visual') {
        Vim.handleKey(cm, 'v', 'mapping');
      } else if (newMode === 'visual-line') {
        Vim.handleKey(cm, 'V', 'mapping');
      }
      // Focus after state is set
      editorRef.current?.view?.focus();
    }, 10);
  };"""

content = content.replace(old_code, new_code)
with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
