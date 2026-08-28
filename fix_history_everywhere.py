import re
with open("src/App.tsx", "r") as f:
    content = f.read()

# For .lvarc
pattern = r"setVirtualFiles\(prev => prev\.map\(f => f\.name === filename \? \{ \.\.\.f, content \} : f\)\);\n\s+setContent\(lvarcFile\.content\);"
replacement = r"setFileHistory(prev => [...prev, filename]);\n                        setVirtualFiles(prev => prev.map(f => f.name === filename ? { ...f, content } : f));\n                        setContent(lvarcFile.content);"
content = re.sub(pattern, replacement, content)

# For new file creation
pattern = r"setVirtualFiles\(prev => \[\.\.\.prev, newFile\]\);\n\s+setContent\(newFile\.content\);"
replacement = r"setFileHistory(prev => [...prev, filename]);\n                    setVirtualFiles(prev => [...prev, newFile]);\n                    setContent(newFile.content);"
content = re.sub(pattern, replacement, content)

# For opening a file from explorer
pattern = r"setVirtualFiles\(prev => prev\.map\(f => f\.name === filename \? \{ \.\.\.f, content \} : f\)\);\n\s+setContent\(file\.content\);"
replacement = r"setFileHistory(prev => [...prev, filename]);\n                            setVirtualFiles(prev => prev.map(f => f.name === filename ? { ...f, content } : f));\n                            setContent(file.content);"
content = re.sub(pattern, replacement, content)

# For the cheat sheet guides
pattern = r"setContent\(colFile\.content\);\n\s+setFilename\('help_colors\.md'\);"
replacement = r"setFileHistory(prev => [...prev, filename]);\n                        setContent(colFile.content);\n                        setFilename('help_colors.md');"
content = re.sub(pattern, replacement, content)

pattern = r"setContent\(figFile\.content\);\n\s+setFilename\('help_figures\.md'\);"
replacement = r"setFileHistory(prev => [...prev, filename]);\n                        setContent(figFile.content);\n                        setFilename('help_figures.md');"
content = re.sub(pattern, replacement, content)

pattern = r"setContent\(tabFile\.content\);\n\s+setFilename\('help_tables\.md'\);"
replacement = r"setFileHistory(prev => [...prev, filename]);\n                        setContent(tabFile.content);\n                        setFilename('help_tables.md');"
content = re.sub(pattern, replacement, content)

with open("src/App.tsx", "w") as f:
    f.write(content)
