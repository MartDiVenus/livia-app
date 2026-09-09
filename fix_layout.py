import re

with open("src/components/VimEditor.tsx", "r") as f:
    vim = f.read()

# 1. Imports
if "PanelGroup" not in vim:
    vim = vim.replace("import { TableOfContents }", "import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';\nimport { TableOfContents }")

if "ListTree" not in vim:
    vim = vim.replace("Code, Sparkles", "Code, Sparkles, ListTree")

# 2. State
if "const [showToc, setShowToc]" not in vim:
    vim = vim.replace("const [showPreview, setShowPreview] = useState(false);", "const [showPreview, setShowPreview] = useState(false);\n  const [showToc, setShowToc] = useState(true);")

# 3. Modify Layout
start_str = '<div className="flex-1 flex overflow-hidden min-h-0 min-w-0">'
end_str = '{/* Proxy input for Vim commands on mobile */ }'
start_idx = vim.find(start_str)
end_idx = vim.find(end_str)

old_layout = vim[start_idx:end_idx]

# Replace the inner layout with react-resizable-panels

# We need the CodeMirror code block:
cm_match = re.search(r'<div className={`flex-1 flex relative overflow-hidden bg-gray-50 dark:bg-\[#16181D\] transition-colors duration-200 min-w-0 min-h-0 \$\{\s+showPreview \? \(isPreviewFullScreen \? \'hidden\' : \'hidden lg:flex border-r border-gray-200 dark:border-\[#1E2127\]\'\) : \'\'\s+\}`}>([\s\S]*?)</div>\s+</div>', old_layout)
cm_content = cm_match.group(1) + "\n          </div>" # Adding back the div that closed

# The preview pane header and content
header_match = re.search(r'\{!isPreviewFullScreen && \([\s\S]*?</div>\s+\)\}', old_layout)
header_content = header_match.group(0)

# We need to inject the TOC button in the header
toc_btn = """
                  {format === 'md' && (
                    <button
                      type="button"
                      onClick={() => setShowToc(!showToc)}
                      className={`hidden lg:flex p-1.5 bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-lg transition-all items-center justify-center shadow-xs ${showToc ? 'text-blue-600 dark:text-[#8AB4F8] hover:bg-blue-50 dark:hover:bg-blue-900/30' : 'text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                      title={lang === 'it' ? "Mostra/Nascondi Indice" : "Toggle Outline"}
                    >
                      <ListTree size={13} />
                    </button>
                  )}"""
# Insert toc_btn before Maximize2 button
header_content = header_content.replace('<button\n                    type="button"\n                    onClick={() => setIsPreviewFullScreen(true)}', toc_btn + '\n                  <button\n                    type="button"\n                    onClick={() => setIsPreviewFullScreen(true)}')

preview_content_match = re.search(r'<div style=\{\{ zoom: `\$\{previewZoom\}%` \}\} className="transition-all duration-200 origin-top-left">[\s\S]*?</div>', old_layout)
preview_content = preview_content_match.group(0)

toc_content_match = re.search(r'\{format === \'md\' && \([\s\S]*?<TableOfContents[\s\S]*?/>\s+</div>\s+\)\}', old_layout)
if toc_content_match:
    toc_content_inner = """<TableOfContents 
                   content={content}
                   lang={lang}
                   onNavigate={(line) => {
                     window.dispatchEvent(new CustomEvent('livia-goto-line', { detail: { line } }));
                   }}
                />"""
else:
    toc_content_inner = ""

new_layout = f"""<div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        <PanelGroup direction="horizontal" autoSaveId="livia-layout">
          {{/* Code Editor Panel */}}
          <Panel 
            defaultSize={{showPreview ? 50 : 100}} 
            minSize={{15}} 
            className={{`flex relative overflow-hidden bg-gray-50 dark:bg-[#16181D] transition-colors duration-200 min-w-0 min-h-0 ${{
              showPreview && isPreviewFullScreen ? 'hidden' : ''
            }}`}}
          >
            {cm_content}
          </Panel>

          {{showPreview && !isPreviewFullScreen && (
            <PanelResizeHandle className="w-1.5 sm:w-2 bg-gray-200 dark:bg-[#2D2D2D] hover:bg-blue-400 dark:hover:bg-blue-500 active:bg-blue-600 cursor-col-resize transition-colors hidden lg:block z-10 flex-shrink-0" />
          )}}

          {{/* Preview Pane */}}
          {{showPreview && (
            <Panel defaultSize={{50}} minSize={{20}} className="flex min-h-0 min-w-0 bg-gray-50 dark:bg-[#0D0F12] transition-colors duration-200">
              <PanelGroup direction="horizontal">
                
                {{/* Rich Preview Content */}}
                <Panel minSize={{30}} className="flex-1 p-4 sm:p-6 font-mono text-xs overflow-y-auto leading-6 select-text" style={{{{ fontFamily: '"DejaVu Sans Mono", "Courier New", Courier, monospace' }}}}>
                  {header_content}
                  {preview_content}
                </Panel>
                
                {{/* TOC Panel */}}
                {{format === 'md' && showToc && (
                  <>
                    <PanelResizeHandle className="w-1.5 sm:w-2 bg-gray-200 dark:bg-[#2D2D2D] hover:bg-blue-400 dark:hover:bg-blue-500 active:bg-blue-600 cursor-col-resize transition-colors hidden lg:block z-10 flex-shrink-0" />
                    <Panel defaultSize={{25}} minSize={{15}} maxSize={{40}} className="hidden lg:block bg-white dark:bg-[#16181D]">
                      {toc_content_inner}
                    </Panel>
                  </>
                )}}
                
              </PanelGroup>
            </Panel>
          )}}
        </PanelGroup>
      </div>
      """

vim = vim[:start_idx] + new_layout + vim[end_idx:]

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(vim)
