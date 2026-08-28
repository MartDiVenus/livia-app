import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

# Replace main background colors (black to grey)
content = content.replace("dark:bg-[#0D0F12]", "dark:bg-[#282C34]")
content = content.replace("dark:bg-[#16181D]", "dark:bg-[#21252B]")

# Replace caret colors to magenta (fuchsia-500)
# Block caret
content = re.sub(
    r'bg-amber-400 dark:bg-\[#8AB4F8\] rounded-xs ring-2 ring-amber-500',
    r'bg-fuchsia-500 dark:bg-fuchsia-500 rounded-xs ring-2 ring-fuchsia-600',
    content
)
content = re.sub(
    r'bg-amber-400 text-black dark:bg-\[#8AB4F8\] dark:text-\[#0D0F12\] font-bold rounded-xs px-px ring-2 ring-amber-500 dark:ring-blue-300',
    r'bg-fuchsia-500 text-white dark:bg-fuchsia-500 dark:text-white font-bold rounded-xs px-px ring-2 ring-fuchsia-600 dark:ring-fuchsia-400',
    content
)

# Half block caret
content = re.sub(
    r'bg-gray-800 dark:bg-\[#8AB4F8\] opacity-90 rounded-xs ring-1 ring-blue-400',
    r'bg-fuchsia-600 dark:bg-fuchsia-400 opacity-90 rounded-xs ring-1 ring-fuchsia-500',
    content
)
content = re.sub(
    r'bg-gray-800 text-white dark:bg-\[#8AB4F8\] dark:text-\[#0D0F12\] font-bold rounded-xs px-px ring-1 ring-blue-400',
    r'bg-fuchsia-600 text-white dark:bg-fuchsia-400 dark:text-white font-bold rounded-xs px-px ring-1 ring-fuchsia-500',
    content
)

# Line caret (insert mode)
content = re.sub(
    r'bg-blue-600 dark:bg-\[#8AB4F8\] shadow-md animate-pulse',
    r'bg-fuchsia-500 dark:bg-fuchsia-400 shadow-md animate-pulse',
    content
)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
print("Colors updated to grey background and magenta cursor.")
