import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_code = """      if (e.mode === 'visual') m = 'visual';"""
new_code = """      if (e.mode === 'visual') {
        if (e.subMode === 'linewise') m = 'visual-line';
        else m = 'visual';
      }"""

content = content.replace(old_code, new_code)
with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
