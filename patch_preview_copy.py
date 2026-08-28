import re

with open("src/utils/previewRenderer.tsx", "r") as f:
    content = f.read()

# Add imports
if "lucide-react" not in content:
    content = content.replace("import React from 'react';", "import React, { useState } from 'react';\nimport { Copy, Check } from 'lucide-react';")

# Ensure useState is there if React was already imported without it
if "useState" not in content:
    content = content.replace("import React from 'react';", "import React, { useState } from 'react';")

# Add the CopyButton component at the top after imports
copy_btn_component = """
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1 hover:text-white transition-colors p-1 rounded hover:bg-zinc-700 text-zinc-400 cursor-pointer"
      title="Copia"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? <span className="text-[9px] uppercase tracking-wider text-emerald-400">Copiato</span> : <span className="text-[9px] uppercase tracking-wider">Copia</span>}
    </button>
  );
};
"""

if "const CopyButton" not in content:
    content = content.replace("export function renderRichPreviewContent", copy_btn_component + "\nexport function renderRichPreviewContent")

# Replace the code block creation
old_code_block = """          elements.push(
            <div key={`code-${i}`} className="my-3 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800 bg-[#1E2127] text-[#ABB2BF] text-xs font-mono p-3">
              <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1.5 border-b border-zinc-800 pb-1 flex justify-between">
                <span>{codeBlockLang || 'code'}</span>
              </div>
              <pre className="whitespace-pre overflow-x-auto leading-5">{codeBuffer.join('\\n')}</pre>
            </div>
          );"""

new_code_block = """          elements.push(
            <div key={`code-${i}`} className="my-3 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800 bg-[#1E2127] text-[#ABB2BF] text-xs font-mono p-3 relative group">
              <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1.5 border-b border-zinc-800 pb-1 flex justify-between items-center">
                <span>{codeBlockLang || 'code'}</span>
                <CopyButton text={codeBuffer.join('\\n')} />
              </div>
              <pre className="whitespace-pre overflow-x-auto leading-5">{codeBuffer.join('\\n')}</pre>
            </div>
          );"""

if old_code_block in content:
    content = content.replace(old_code_block, new_code_block)
else:
    print("Could not find the target code block string.")

with open("src/utils/previewRenderer.tsx", "w") as f:
    f.write(content)

print("Patch applied to markdown blocks.")
