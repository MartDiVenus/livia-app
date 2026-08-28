import re
with open("src/App.tsx", "r") as f:
    content = f.read()

pattern = r'onOpenFileState=\{\(rawTargetName\) => \{([\s\S]*?)onCloseFileState'
match = re.search(pattern, content)
if match:
    print(match.group(1))
