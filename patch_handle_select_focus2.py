import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_code = """    if (key) {
      Vim.handleKey(cm, key, 'mapping');
    }
    
    // Focus immediately (synchronously) so mobile browsers allow the soft keyboard to appear
    editorRef.current.view.focus();
  };"""

new_code = """    if (key) {
      Vim.handleKey(cm, key, 'mapping');
    }
    
    // Ensure keyboard state is open when entering insert mode, then focus
    if (newMode === 'insert' && onSoftKeyboardChange) {
      onSoftKeyboardChange(true);
    }
    // Focus immediately (synchronously) so mobile browsers allow the soft keyboard to appear
    editorRef.current.view.focus();
  };"""

content = content.replace(old_code, new_code)
with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
