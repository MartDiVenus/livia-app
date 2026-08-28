import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

# Replace bg-white dark:bg-[#0D0F12] with bg-gray-50 dark:bg-[#16181D] for the Editor Main Canvas
# It's inside: <div className={`flex-1 flex relative overflow-hidden bg-white dark:bg-[#0D0F12] transition-colors duration-200 min-w-0 min-h-0 ${
old_canvas = '<div className={`flex-1 flex relative overflow-hidden bg-white dark:bg-[#0D0F12] transition-colors duration-200 min-w-0 min-h-0 ${'
new_canvas = '<div className={`flex-1 flex relative overflow-hidden bg-gray-50 dark:bg-[#16181D] transition-colors duration-200 min-w-0 min-h-0 ${'

if old_canvas in content:
    content = content.replace(old_canvas, new_canvas)
    print("Fixed canvas background")
else:
    print("Could not find canvas background")

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
