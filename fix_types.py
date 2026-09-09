import re

with open("src/App.tsx", "r") as f:
    app = f.read()
    
# Fix format 'markdown' -> 'md'
app = app.replace("'markdown'", "'md'")
app = app.replace('"markdown"', '"md"')

with open("src/App.tsx", "w") as f:
    f.write(app)

with open("src/components/Toolbar.tsx", "r") as f:
    toolbar = f.read()

toolbar = toolbar.replace("'markdown'", "'md'")
toolbar = toolbar.replace('"markdown"', '"md"')

# Let's properly add the props to ToolbarProps interface
import re
interface_match = re.search(r'interface ToolbarProps \{', toolbar)
if interface_match and "showMdPreview?:" not in toolbar:
    insert_pos = interface_match.end()
    props = "\n  showMdPreview?: boolean;\n  setShowMdPreview?: (val: boolean) => void;\n  onOpenUrlImport?: () => void;"
    toolbar = toolbar[:insert_pos] + props + toolbar[insert_pos:]

# Now add the props to the component signature
sig_match = re.search(r'export function Toolbar\(\{\n', toolbar)
if sig_match and "showMdPreview," not in toolbar:
    insert_pos = sig_match.end()
    props = "  showMdPreview,\n  setShowMdPreview,\n  onOpenUrlImport,\n"
    toolbar = toolbar[:insert_pos] + props + toolbar[insert_pos:]

with open("src/components/Toolbar.tsx", "w") as f:
    f.write(toolbar)

