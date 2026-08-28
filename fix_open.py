import re

with open("src/App.tsx", "r") as f:
    content = f.read()

pattern = r'''onOpenFileState=\{\(rawTargetName\) => \{
              if \(!rawTargetName\) return \{ found: false, name: '' \};
              const cleanTarget = rawTargetName\.replace\(\/\^\["']\|\["']\$\/g, ''\)\.trim\(\);
              const baseName = cleanTarget\.split\(\/\[\\\\/\\\\\]\/\)\.pop\(\) \|\| cleanTarget;'''

replace = r'''onOpenFileState={(rawTargetName) => {
              if (!rawTargetName) return { found: false, name: '' };
              const cleanTarget = rawTargetName.replace(/^["']|["']$/g, '').trim();
              const baseName = cleanTarget.split(/[\/\\]/).pop() || cleanTarget;
              setFileHistory(prev => [...prev, filename]);'''

# Wait, the regex might fail because of the split regex. Let's just use string replacement on a simple substring.

content = content.replace("const baseName = cleanTarget.split(/[\\/\\\\]/).pop() || cleanTarget;\n              \n              // Build updated list synchronously", "const baseName = cleanTarget.split(/[\\/\\\\]/).pop() || cleanTarget;\n              setFileHistory(prev => [...prev, filename]);\n              // Build updated list synchronously")

with open("src/App.tsx", "w") as f:
    f.write(content)
