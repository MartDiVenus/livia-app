import re
with open("src/App.tsx", "r") as f:
    content = f.read()

pattern = r"(setFileHistory\(prev => \[\.\.\.prev, filename\]\);\s*setVirtualFiles\(prev => \[\.\.\.prev\.filter\(f => f\.name !== '.*?'\), .*?\]\);\s*)setFileHistory\(prev => \[\.\.\.prev, filename\]\);"
content = re.sub(pattern, r"\1", content)

with open("src/App.tsx", "w") as f:
    f.write(content)
