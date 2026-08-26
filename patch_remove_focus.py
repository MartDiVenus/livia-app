import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_code = """                if (cm && Vim) {
                   editorRef.current.view.focus();
                   Vim.handleKey(cm, key, 'mapping');
                }"""

new_code = """                if (cm && Vim) {
                   Vim.handleKey(cm, key, 'mapping');
                }"""

content = content.replace(old_code, new_code)
with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
