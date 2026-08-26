import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_code = """  const extensions = [
    vim({ status: true }),"""

new_code = """  const extensions = [
    vim({ status: true }), 
    EditorView.contentAttributes.of({
      inputmode: (isSoftKeyboardOpen === false) ? 'none' : 'text',
    }),"""

content = content.replace(old_code, new_code)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
