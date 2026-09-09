import re

with open("src/App.tsx", "r") as f:
    content = f.read()

vim_editor_start = content.find("<VimEditor")
vim_editor_end = content.find("onOpenAiProfilesModal={() => setIsAiProfilesModalOpen(true)}\n          />")
if vim_editor_end != -1:
    vim_editor_end += len("onOpenAiProfilesModal={() => setIsAiProfilesModalOpen(true)}\n          />")
else:
    vim_editor_end = content.find("/>", vim_editor_start) + 2

vim_editor_tag = content[vim_editor_start:vim_editor_end]

new_layout = """          <div className="flex-1 flex min-h-0 min-w-0">
            {/* Editor Pane */}
            <div className={`flex flex-col min-w-0 h-full ${showMdPreview ? 'w-1/2 border-r border-gray-200 dark:border-zinc-800' : 'w-full'}`}>
              %s
            </div>

            {/* Markdown Preview & TOC Pane */}
            {showMdPreview && (
              <div className="w-1/2 h-full flex min-w-0 bg-white dark:bg-[#16181D]">
                <div className="flex-1 min-w-0">
                  <MarkdownPreview content={content} />
                </div>
                <div className="w-64 border-l border-gray-200 dark:border-zinc-800 shrink-0 hidden lg:block">
                  <TableOfContents
                    content={content}
                    lang={lang}
                    onNavigate={(line) => {
                      window.dispatchEvent(new CustomEvent('livia-goto-line', { detail: { line } }));
                    }}
                  />
                </div>
              </div>
            )}
          </div>""" % vim_editor_tag

if "MarkdownPreview content=" not in content:
    content = content[:vim_editor_start] + new_layout + content[vim_editor_end:]

modal_render = """
        <UrlImportModal
          isOpen={isUrlImportModalOpen}
          onClose={() => setIsUrlImportModalOpen(false)}
          lang={lang}
          onImport={handleUrlImport}
        />
"""
last_div = content.rfind("</div>")
content = content[:last_div] + modal_render + content[last_div:]

with open("src/App.tsx", "w") as f:
    f.write(content)
