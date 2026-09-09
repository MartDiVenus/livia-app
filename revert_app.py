import re

with open("src/App.tsx", "r") as f:
    app = f.read()

# Remove the showMdPreview props from <Toolbar ... />
app = re.sub(r'        showMdPreview=\{showMdPreview\}\n        setShowMdPreview=\{setShowMdPreview\}\n', '', app)

# Remove the entire wrapper around <VimEditor>
vim_editor_start = app.find("<VimEditor")
if vim_editor_start != -1:
    # Find the start of the layout wrapper I added:
    layout_start = app.rfind('<div className="flex-1 flex min-h-0 min-w-0">', 0, vim_editor_start)
    if layout_start != -1:
        # Find where VimEditor ends
        vim_editor_end = app.find("onOpenAiProfilesModal={() => setIsAiProfilesModalOpen(true)}\n          />") + len("onOpenAiProfilesModal={() => setIsAiProfilesModalOpen(true)}\n          />")
        
        vim_tag = app[vim_editor_start:vim_editor_end]
        
        # Replace the entire wrapper with just the vim_tag
        wrapper_end = app.find("</div>\n            )}\n          </div>", vim_editor_end)
        if wrapper_end != -1:
            wrapper_end += len("</div>\n            )}\n          </div>")
            app = app[:layout_start] + vim_tag + app[wrapper_end:]

with open("src/App.tsx", "w") as f:
    f.write(app)

with open("src/components/Toolbar.tsx", "r") as f:
    toolbar = f.read()

# Remove from ToolbarProps
toolbar = re.sub(r'  showMdPreview\?: boolean;\n  setShowMdPreview\?: \(val: boolean\) => void;\n', '', toolbar)

# Remove from function arguments
toolbar = re.sub(r'  showMdPreview,\n  setShowMdPreview,\n', '', toolbar)

# Remove the Preview button rendering
toolbar = re.sub(r'            \{\/\* Toggle Markdown Preview \*\/\}\n            \{format === \'md\' && setShowMdPreview && \(\n              <button.*?</button>\n            \)\}\n', '', toolbar, flags=re.DOTALL)

with open("src/components/Toolbar.tsx", "w") as f:
    f.write(toolbar)
