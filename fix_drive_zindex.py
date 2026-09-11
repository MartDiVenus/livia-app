import re
with open("src/App.tsx", "r") as f:
    code = f.read()

# Replace fixed inset-0 z-50 for Google Drive Modal
code = code.replace(
    '<div className="fixed inset-0 z-50 bg-white/95 dark:bg-[#0D0F12]/95 backdrop-blur-md p-6 flex flex-col font-sans">',
    '<div className="fixed inset-0 z-[100] bg-white/95 dark:bg-[#0D0F12]/95 backdrop-blur-md p-6 flex flex-col font-sans">'
)

with open("src/App.tsx", "w") as f:
    f.write(code)

