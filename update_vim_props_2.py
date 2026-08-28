import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

if "onCloseFileState," not in content.split("onShowHelp")[0]:
    content = content.replace(
        "onOpenFileState,\n  onShowHelp,",
        "onOpenFileState,\n  onCloseFileState,\n  onShowHelp,"
    )

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
