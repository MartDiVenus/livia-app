import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

# Replace handleSelectMode
old_handle_select = """  const handleSelectMode = (newMode: VimMode) => {
    setShowModeMenu(false);
    if (!editorRef.current?.view) return;
    const cm = getCM(editorRef.current.view);
    if (!cm) return;

    // We must focus the editor first, otherwise some keys might not be processed correctly
    editorRef.current.view.focus();
    
    // Always escape to normal mode first
    if (Vim.exitInsertMode) Vim.exitInsertMode(cm as any);
    if (Vim.exitVisualMode) Vim.exitVisualMode(cm as any);

    if (newMode === 'insert') {
      Vim.handleKey(cm, 'i', 'mapping');
    } else if (newMode === 'visual') {
      Vim.handleKey(cm, 'v', 'mapping');
    } else if (newMode === 'visual-line') {
      Vim.handleKey(cm, 'V', 'mapping');
    }
  };"""

new_handle_select = """  const handleSelectMode = (newMode: VimMode) => {
    setShowModeMenu(false);
    if (!editorRef.current?.view) return;
    const cm = getCM(editorRef.current.view);
    if (!cm) return;

    editorRef.current.view.focus();
    
    // Always escape to normal mode first natively
    Vim.handleKey(cm, '<Esc>', 'mapping');

    setTimeout(() => {
      if (newMode === 'insert') {
        Vim.handleKey(cm, 'i', 'mapping');
      } else if (newMode === 'visual') {
        Vim.handleKey(cm, 'v', 'mapping');
      } else if (newMode === 'visual-line') {
        Vim.handleKey(cm, 'V', 'mapping');
      }
    }, 10);
  };"""

content = content.replace(old_handle_select, new_handle_select)

# Replace simulated-key-trigger
old_sim_key = """        <button
          id="simulated-key-trigger"
          onClick={(e) => {
             let key = e.currentTarget.getAttribute('data-key');
             if (key && editorRef.current?.view) {
                const cm = getCM(editorRef.current.view);
                if (cm && Vim) {
                   if (key === 'Escape' || key === '<Esc>') {
                      if (Vim.exitInsertMode) Vim.exitInsertMode(cm as any);
                      if (Vim.exitVisualMode) Vim.exitVisualMode(cm as any);
                   } else {
                      Vim.handleKey(cm, key, 'mapping');
                   }
                }
             }
          }}
        />"""

new_sim_key = """        <button
          id="simulated-key-trigger"
          onClick={(e) => {
             let key = e.currentTarget.getAttribute('data-key');
             if (key && editorRef.current?.view) {
                const cm = getCM(editorRef.current.view);
                if (key === 'Escape') key = '<Esc>';
                if (cm && Vim) {
                   editorRef.current.view.focus();
                   Vim.handleKey(cm, key, 'mapping');
                }
             }
          }}
        />"""

content = content.replace(old_sim_key, new_sim_key)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
