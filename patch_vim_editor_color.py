import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

# Table Button
table_anchor = """                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowTableMenu(!showTableMenu); setShowImageMenu(false); }}
                      className="p-1.5 sm:p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                      title={lang === 'it' ? 'Inserisci Tabella' : 'Insert Table'}
                    >
                      <Table size={20} className="sm:size-[14px]" />
                    </button>"""

table_replace = """                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowTableMenu(!showTableMenu); setShowImageMenu(false); }}
                      className={`p-1.5 sm:p-1 rounded-lg transition-colors ${showTableMenu ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                      title={lang === 'it' ? 'Inserisci Tabella' : 'Insert Table'}
                    >
                      <Table size={20} className="sm:size-[14px]" />
                    </button>"""

if table_anchor in content:
    content = content.replace(table_anchor, table_replace)
else:
    print("Could not find table button anchor.")


# Image Button
image_anchor = """                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowImageMenu(!showImageMenu); setShowTableMenu(false); }}
                      className="p-1.5 sm:p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                      title={lang === 'it' ? 'Inserisci Immagine' : 'Insert Image'}
                    >
                      <ImageIcon size={20} className="sm:size-[14px]" />
                    </button>"""

image_replace = """                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowImageMenu(!showImageMenu); setShowTableMenu(false); }}
                      className={`p-1.5 sm:p-1 rounded-lg transition-colors ${showImageMenu ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                      title={lang === 'it' ? 'Inserisci Immagine' : 'Insert Image'}
                    >
                      <ImageIcon size={20} className="sm:size-[14px]" />
                    </button>"""

if image_anchor in content:
    content = content.replace(image_anchor, image_replace)
else:
    print("Could not find image button anchor.")

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)

print("VimEditor patched colors successfully.")
