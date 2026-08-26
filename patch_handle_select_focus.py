import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_code = """  const handleSelectMode = (newMode: VimMode) => {
    setShowModeMenu(false);
    if (!editorRef.current?.view) return;
    const cm = getCM(editorRef.current.view);
    if (!cm || !Vim) return;

    // Always exit to normal mode first natively
    Vim.handleKey(cm, '<Esc>', 'mapping');

    if (newMode === 'normal') {
      return;
    }

    // Dispatch the new mode key synchronously
    let key = '';
    if (newMode === 'insert') key = 'i';
    if (newMode === 'visual') key = 'v';
    if (newMode === 'visual-line') key = 'V';
    
    if (key) {
      Vim.handleKey(cm, key, 'mapping');
    }
  };"""

new_code = """  const handleSelectMode = (newMode: VimMode) => {
    setShowModeMenu(false);
    if (!editorRef.current?.view) return;
    const cm = getCM(editorRef.current.view);
    if (!cm || !Vim) return;

    // Always exit to normal mode first natively
    Vim.handleKey(cm, '<Esc>', 'mapping');

    if (newMode === 'normal') {
      editorRef.current.view.focus();
      return;
    }

    // Dispatch the new mode key synchronously
    let key = '';
    if (newMode === 'insert') key = 'i';
    if (newMode === 'visual') key = 'v';
    if (newMode === 'visual-line') key = 'V';
    
    if (key) {
      Vim.handleKey(cm, key, 'mapping');
    }
    
    // Focus immediately (synchronously) so mobile browsers allow the soft keyboard to appear
    editorRef.current.view.focus();
  };"""

content = content.replace(old_code, new_code)
with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
