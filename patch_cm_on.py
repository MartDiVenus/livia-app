import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_code = """    const view = editorRef.current?.view;
    if (view) {
       const cm = (view as any).cm;
       if (cm && cm.on) {
          cm.on('vim-mode-change', handleVimMode);
          return () => cm.off('vim-mode-change', handleVimMode);
       }
    }"""

new_code = """    const view = editorRef.current?.view;
    if (view) {
       const cm = getCM(view);
       if (cm && (cm as any).on) {
          (cm as any).on('vim-mode-change', handleVimMode);
          return () => (cm as any).off('vim-mode-change', handleVimMode);
       }
    }"""

content = content.replace(old_code, new_code)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
