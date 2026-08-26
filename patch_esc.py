import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_code = """             const key = e.currentTarget.getAttribute('data-key');
             if (key && editorRef.current?.view) {
                const cm = getCM(editorRef.current.view);
                if (cm && Vim) {
                   Vim.handleKey(cm, key, 'mapping');
                }
             }"""

new_code = """             let key = e.currentTarget.getAttribute('data-key');
             if (key && editorRef.current?.view) {
                const cm = getCM(editorRef.current.view);
                if (key === 'Escape') key = '<Esc>';
                if (cm && Vim) {
                   Vim.handleKey(cm, key, 'mapping');
                }
             }"""

content = content.replace(old_code, new_code)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
