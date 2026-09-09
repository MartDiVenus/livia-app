import re

with open("src/App.tsx", "r") as f:
    app = f.read()
    
app = app.replace("{showMdPreview && (\n              <div className=\"w-1/2 h-full flex min-w-0 bg-white dark:bg-[#16181D]\">", "{showMdPreview && format === 'md' && (\n              <div className=\"w-1/2 h-full flex min-w-0 bg-white dark:bg-[#16181D]\">")

with open("src/App.tsx", "w") as f:
    f.write(app)

with open("src/components/Toolbar.tsx", "r") as f:
    toolbar = f.read()

toolbar = toolbar.replace("{setShowMdPreview && (\n              <button", "{format === 'md' && setShowMdPreview && (\n              <button")

with open("src/components/Toolbar.tsx", "w") as f:
    f.write(toolbar)
