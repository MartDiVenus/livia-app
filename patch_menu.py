import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_overlay = """              <div className="fixed inset-0 z-40 bg-black/10 dark:bg-black/40" onClick={() => setShowModeMenu(false)} />"""
new_overlay = """              <div className="fixed inset-0 z-40 bg-black/10 dark:bg-black/40" onPointerDown={(e) => { e.preventDefault(); setShowModeMenu(false); }} />"""

old_btn = """                        onClick={() => handleSelectMode(m.key)}"""
new_btn = """                        onPointerDown={(e) => { e.preventDefault(); handleSelectMode(m.key); }}"""

content = content.replace(old_overlay, new_overlay)
content = content.replace(old_btn, new_btn)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
