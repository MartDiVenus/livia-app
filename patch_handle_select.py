import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_code = """    // Always escape to normal mode first natively
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

new_code = """    // Always escape to normal mode first natively
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
