import re

with open("src/components/VimEditor.tsx", "r") as f:
    vim = f.read()

if "import { TableOfContents }" not in vim:
    vim = vim.replace("import { AiAssistantModal } from './AiAssistantModal';", "import { AiAssistantModal } from './AiAssistantModal';\nimport { TableOfContents } from './TableOfContents';")

# Find the start of the block
start_idx = vim.find("{(showPreview) && (")

# Find the end of the block
# The block ends with the div closing the preview pane and then )}
# Let's search for renderRichPreviewContent to anchor
render_idx = vim.find("{renderRichPreviewContent(content, format, theme)}", start_idx)
end_div_idx = vim.find("</div>", render_idx)
outer_div_idx = vim.find("</div>", end_div_idx + 1)
end_idx = vim.find(")}", outer_div_idx) + 2

old_block = vim[start_idx:end_idx]

# We want to change the outer div to a flex container that holds the old inner div and the TOC
# The old inner div starts with <div className="flex-1 bg-gray-50...
inner_start = old_block.find("<div className=\"flex-1 bg-gray-50")
inner_end = old_block.rfind("</div>")

inner_content = old_block[inner_start:inner_end + 6]

# Update the inner content's first div classes to not have border-l and transition-colors (we'll put those on the wrapper)
inner_content = inner_content.replace(
    'className="flex-1 bg-gray-50 dark:bg-[#0D0F12] p-4 sm:p-6 font-mono text-xs overflow-y-auto leading-6 select-text border-l border-gray-200 dark:border-[#1E2127] transition-colors duration-200"',
    'className="flex-1 p-4 sm:p-6 font-mono text-xs overflow-y-auto leading-6 select-text"'
)

new_block = """{(showPreview) && (
          <div className="flex-1 flex min-h-0 min-w-0 bg-gray-50 dark:bg-[#0D0F12] border-l border-gray-200 dark:border-[#1E2127] transition-colors duration-200">
            """ + inner_content + """
            {format === 'md' && (
              <div className="w-56 border-l border-gray-200 dark:border-[#1E2127] hidden lg:block shrink-0 bg-white dark:bg-[#16181D]">
                <TableOfContents 
                   content={content}
                   lang={lang}
                   onNavigate={(line) => {
                     window.dispatchEvent(new CustomEvent('livia-goto-line', { detail: { line } }));
                   }}
                />
              </div>
            )}
          </div>
        )}"""

vim = vim[:start_idx] + new_block + vim[end_idx:]

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(vim)
