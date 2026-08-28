import re
with open("src/App.tsx", "r") as f:
    content = f.read()

pattern = r"              return \{ success: true, message: '', isEmptyHistory: true \};\n            \}\}"
replacement = r"""              // empty history
              setFilename('');
              setContent('');
              setFormat('txt');
              return { success: true, message: lang === 'it' ? 'Editor svuotato' : 'Editor cleared', isEmptyHistory: true };
            }}"""

content = re.sub(pattern, replacement, content)

with open("src/App.tsx", "w") as f:
    f.write(content)
