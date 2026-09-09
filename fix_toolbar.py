with open("src/components/Toolbar.tsx", "r") as f:
    code = f.read()

import re
# Find all occurrences of the "Import from URL" block
block = """<button
                    type="button"
                    onClick={() => {
                      setImportMenuOpen(false);
                      setMobileMenuOpen(false);
                      if (onOpenUrlImport) onOpenUrlImport();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg text-left text-gray-800 dark:text-zinc-200 cursor-pointer font-bold"
                  >
                    <Globe size={16} className="text-emerald-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">Import from URL</span>
                      <span className="text-[11px] text-gray-400 dark:text-zinc-400 font-normal">{lang === 'it' ? 'Scarica da link diretto (.md, .txt)' : 'Download direct link (.md, .txt)'}</span>
                    </div>
                  </button>"""

# Replace all with just one, but wait, they are not exactly adjacent.
# Let's count them
print("Count before:", code.count('Import from URL'))
# Replace the second occurrence
parts = code.split(block)
if len(parts) == 3:
    code = parts[0] + block + parts[1] + parts[2]
elif len(parts) > 3:
    print("More than 2 blocks found!")

with open("src/components/Toolbar.tsx", "w") as f:
    f.write(code)

print("Count after:", code.count('Import from URL'))
