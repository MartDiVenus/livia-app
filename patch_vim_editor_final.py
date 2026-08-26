import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

# Fix Issue A: Change onClick back to onPointerDown for the mode selector trigger, overlay, and items
content = content.replace(
    "onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModeMenu(prev => !prev); }}",
    "onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowModeMenu(prev => !prev); }}"
)

content = content.replace(
    "onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModeMenu(false); }}",
    "onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowModeMenu(false); }}"
)

content = content.replace(
    "onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectMode(m.key); }}",
    "onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectMode(m.key); }}"
)

# Fix Issue B: Fix the dark mode styling of the Gboard button so it isn't black
old_gboard_style = "bg-black/20 hover:bg-black/30 text-white/90 dark:text-zinc-900 border-transparent"
new_gboard_style = "bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-zinc-300 border-transparent"
content = content.replace(old_gboard_style, new_gboard_style)

# Also fix the initial trigger if it was missed
content = content.replace(
    "onClick={() => setShowModeMenu(prev => !prev)}",
    "onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowModeMenu(prev => !prev); }}"
)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)

print("Patch applied")
