import os
import glob
import re

# Modals in src/components/
for filepath in glob.glob("src/components/*Modal.tsx"):
    with open(filepath, "r") as f:
        content = f.read()
    
    # Replace z-50 or z-[100] with z-[9999] in modals
    content = re.sub(r'className="([^"]*)z-50([^"]*)"', r'className="\1z-[9999]\2"', content)
    content = re.sub(r'className="([^"]*)z-\[100\]([^"]*)"', r'className="\1z-[9999]\2"', content)
    
    with open(filepath, "w") as f:
        f.write(content)

# Drive and Pending Modals in src/App.tsx
with open("src/App.tsx", "r") as f:
    content = f.read()

content = re.sub(r'className="([^"]*)z-50([^"]*)bg-white/95', r'className="\1z-[9999]\2bg-white/95', content)
content = re.sub(r'className="([^"]*)z-\[60\]([^"]*)"', r'className="\1z-[9999]\2"', content)

with open("src/App.tsx", "w") as f:
    f.write(content)

print("Modals fixed!")
