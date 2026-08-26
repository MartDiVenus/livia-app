import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_code = """  const handleSelectMode = (newMode: VimMode) => {
    setShowModeMenu(false);
    const trigger = document.getElementById('simulated-key-trigger');
    if (!trigger) return;

    // Always exit to normal mode first via Escape
    trigger.setAttribute('data-key', 'Escape');
    trigger.click();

    if (newMode === 'normal') {
      return;
    }

    // Dispatch the new mode key synchronously
    let key = '';
    if (newMode === 'insert') key = 'i';
    if (newMode === 'visual') key = 'v';
    if (newMode === 'visual-line') key = 'V';
    
    if (key) {
      trigger.setAttribute('data-key', key);
      trigger.click();
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

content = content.replace(old_code, new_code)
with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
