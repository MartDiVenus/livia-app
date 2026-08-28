import re

with open("src/utils/previewRenderer.tsx", "r") as f:
    content = f.read()

# XML/HTML Preview Patch
xml_html_block = """      <div className="p-4 bg-zinc-900 text-zinc-100 font-mono text-xs rounded-lg border border-zinc-800 overflow-x-auto">
        <div className="text-[10px] uppercase font-bold text-amber-400 mb-3 flex items-center gap-2 pb-2 border-b border-zinc-800">
          <span>⚙️ {format === 'xml' ? 'ANTEPRIMA STRUTTURA XML' : 'ANTEPRIMA CODICE HTML'}</span>
        </div>"""

xml_html_replacement = """      <div className="p-4 bg-zinc-900 text-zinc-100 font-mono text-xs rounded-lg border border-zinc-800 overflow-x-auto relative group">
        <div className="text-[10px] uppercase font-bold text-amber-400 mb-3 flex items-center justify-between pb-2 border-b border-zinc-800">
          <span>⚙️ {format === 'xml' ? 'ANTEPRIMA STRUTTURA XML' : 'ANTEPRIMA CODICE HTML'}</span>
          <CopyButton text={content} />
        </div>"""

if xml_html_block in content:
    content = content.replace(xml_html_block, xml_html_replacement)
else:
    print("XML/HTML block not found.")

# JSON Preview Patch
json_block = """      <div className="p-4 bg-[#1E2127] text-[#98C379] font-mono text-xs rounded-lg border border-zinc-800 overflow-x-auto">
        <div className="text-[10px] uppercase font-bold text-[#61AFEF] mb-3 flex items-center gap-2 pb-2 border-b border-zinc-800">
          <span>📊 ANTEPRIMA STRUTTURATA JSON</span>
        </div>
        <pre className="whitespace-pre leading-5 text-zinc-200">{prettyJson}</pre>
      </div>"""

json_replacement = """      <div className="p-4 bg-[#1E2127] text-[#98C379] font-mono text-xs rounded-lg border border-zinc-800 overflow-x-auto relative group">
        <div className="text-[10px] uppercase font-bold text-[#61AFEF] mb-3 flex items-center justify-between pb-2 border-b border-zinc-800">
          <span>📊 ANTEPRIMA STRUTTURATA JSON</span>
          <CopyButton text={prettyJson} />
        </div>
        <pre className="whitespace-pre leading-5 text-zinc-200">{prettyJson}</pre>
      </div>"""

if json_block in content:
    content = content.replace(json_block, json_replacement)
else:
    print("JSON block not found.")

# Generic Text Preview Patch
text_block = """  // 4. Default Code / Text View
  return (
    <div className="p-4 font-mono text-xs whitespace-pre bg-gray-50 dark:bg-[#0D0F12] text-gray-800 dark:text-zinc-200 rounded-lg">
      {content}
    </div>
  );"""

text_replacement = """  // 4. Default Code / Text View
  return (
    <div className="p-4 font-mono text-xs whitespace-pre bg-gray-50 dark:bg-[#0D0F12] text-gray-800 dark:text-zinc-200 rounded-lg relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={content} />
      </div>
      {content}
    </div>
  );"""

if text_block in content:
    content = content.replace(text_block, text_replacement)
else:
    print("Text block not found.")

with open("src/utils/previewRenderer.tsx", "w") as f:
    f.write(content)

print("Patch applied to JSON/XML and default text previews.")
