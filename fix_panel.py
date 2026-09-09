with open("src/components/VimEditor.tsx", "r") as f:
    vim = f.read()

# 1. Fix Editor Panel conditionally rendering
old_editor_panel = """          {/* Code Editor Panel */}
          <Panel 
            defaultSize={showPreview ? 50 : 100} 
            minSize={15} 
            className={`flex relative overflow-hidden bg-gray-50 dark:bg-[#16181D] transition-colors duration-200 min-w-0 min-h-0 ${
              showPreview && isPreviewFullScreen ? 'hidden' : ''
            }`}
          >"""
new_editor_panel = """          {/* Code Editor Panel */}
          {(!showPreview || !isPreviewFullScreen) && (
            <Panel 
              defaultSize={showPreview ? 50 : 100} 
              minSize={15} 
              className={`flex relative overflow-hidden bg-gray-50 dark:bg-[#16181D] transition-colors duration-200 min-w-0 min-h-0`}
            >"""
vim = vim.replace(old_editor_panel, new_editor_panel)

old_editor_end = """          </div>
          </Panel>

          {showPreview && !isPreviewFullScreen && ("""
new_editor_end = """          </div>
            </Panel>
          )}

          {showPreview && !isPreviewFullScreen && ("""
vim = vim.replace(old_editor_end, new_editor_end)

# 2. Fix TOC Panel sizes and classes
old_toc_panel = '<Panel defaultSize={25} minSize={15} maxSize={40} className="hidden lg:block bg-white dark:bg-[#16181D]">'
new_toc_panel = '<Panel defaultSize={25} minSize={15} className="bg-white dark:bg-[#16181D] overflow-hidden">'
vim = vim.replace(old_toc_panel, new_toc_panel)

# 3. Fix Handle classes (remove hidden lg:block)
old_handle = 'cursor-col-resize transition-colors hidden lg:block z-10 flex-shrink-0"'
new_handle = 'cursor-col-resize transition-colors z-10 flex-shrink-0"'
vim = vim.replace(old_handle, new_handle)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(vim)
