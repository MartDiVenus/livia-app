import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

# Replace cursor colors
# Normal mode: bg-gray-800 dark:bg-[#8AB4F8] opacity-90 rounded-xs ring-1 ring-blue-400
# Change to: bg-amber-400 text-black dark:bg-[#8AB4F8] -> No, user wants bg-amber-400 everywhere
# Sfondo grigio (bg-gray-50 dark:bg-[#16181D]), Cursore color salmone/ambra (bg-amber-400)

old_caret_visual_nl = 'bg-amber-400 dark:bg-[#8AB4F8] rounded-xs ring-2 ring-amber-500'
new_caret_visual_nl = 'bg-amber-400 dark:bg-amber-500/80 rounded-xs ring-2 ring-amber-500 dark:ring-amber-400'

old_caret_visual_char = 'bg-amber-400 text-black dark:bg-[#8AB4F8] dark:text-[#0D0F12] font-bold rounded-xs px-px ring-2 ring-amber-500 dark:ring-blue-300'
new_caret_visual_char = 'bg-amber-400 text-black dark:bg-amber-500/80 dark:text-[#0D0F12] font-bold rounded-xs px-px ring-2 ring-amber-500 dark:ring-amber-400'

old_caret_normal_nl = 'bg-gray-800 dark:bg-[#8AB4F8] opacity-90 rounded-xs ring-1 ring-blue-400'
new_caret_normal_nl = 'bg-amber-400 dark:bg-amber-500/80 opacity-90 rounded-xs ring-1 ring-amber-500 dark:ring-amber-400'

old_caret_normal_char = 'bg-gray-800 text-white dark:bg-[#8AB4F8] dark:text-[#0D0F12] font-bold rounded-xs px-px ring-1 ring-blue-400'
new_caret_normal_char = 'bg-amber-400 text-black dark:bg-amber-500/80 dark:text-[#0D0F12] font-bold rounded-xs px-px ring-1 ring-amber-500 dark:ring-amber-400'

old_caret_insert = 'bg-blue-600 dark:bg-[#8AB4F8] shadow-md'
new_caret_insert = 'bg-amber-400 dark:bg-amber-500 shadow-md'

content = content.replace(old_caret_visual_nl, new_caret_visual_nl)
content = content.replace(old_caret_visual_char, new_caret_visual_char)
content = content.replace(old_caret_normal_nl, new_caret_normal_nl)
content = content.replace(old_caret_normal_char, new_caret_normal_char)
content = content.replace(old_caret_insert, new_caret_insert)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
print("Fixed cursor colors")
