import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

if "onCloseFileState?: (force: boolean) => { success: boolean; message: string; isEmptyHistory?: boolean };" not in content:
    content = content.replace(
        "onOpenFileState?: (targetName: string) => { found: boolean; name: string };",
        "onOpenFileState?: (targetName: string) => { found: boolean; name: string };\n  onCloseFileState?: (force: boolean) => { success: boolean; message: string; isEmptyHistory?: boolean };"
    )

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
