import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

content = content.replace(
    'bg-amber-400 dark:bg-[#8AB4F8] rounded-xs ring-2 ring-amber-500',
    'bg-amber-400 dark:bg-amber-500/80 rounded-xs ring-2 ring-amber-500 dark:ring-amber-400'
)

content = content.replace(
    'bg-gray-800 dark:bg-[#8AB4F8] opacity-90 rounded-xs ring-1 ring-blue-400',
    'bg-amber-400 dark:bg-amber-500/80 opacity-90 rounded-xs ring-1 ring-amber-500 dark:ring-amber-400'
)

content = content.replace(
    'bg-blue-600 dark:bg-[#8AB4F8] shadow-md animate-pulse',
    'bg-amber-400 dark:bg-amber-500 shadow-md animate-pulse'
)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
print("Fixed uninjected cursor colors")
