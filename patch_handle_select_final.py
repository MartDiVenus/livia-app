import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_code = """  const handleSelectMode = (newMode: VimMode) => {
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

new_code = """  const handleSelectMode = (newMode: VimMode) => {
    setShowModeMenu(false);
    const trigger = document.getElementById('simulated-key-trigger');
    if (!trigger) return;

    // Always exit to normal mode first via Escape
    trigger.setAttribute('data-key', 'Escape');
    trigger.click();

    if (newMode === 'normal') {
      return;
    }

    // Dispatch the new mode key
    setTimeout(() => {
      let key = '';
      if (newMode === 'insert') key = 'i';
      if (newMode === 'visual') key = 'v';
      if (newMode === 'visual-line') key = 'V';
      
      if (key) {
        trigger.setAttribute('data-key', key);
        trigger.click();
      }
    }, 10);
  };"""

content = content.replace(old_code, new_code)
with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
