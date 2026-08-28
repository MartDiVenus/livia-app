import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

buttons = """              {/* Table & Image Inserts (MD/DOCX only) */}
              {(format === 'md' || format === 'docx') && (
                <div className="flex items-center gap-1 bg-white dark:bg-[#0D0F12] border border-gray-200 dark:border-[#2D2D2D] rounded-xl sm:rounded-lg p-0.5 mr-1 relative">
                  
                  {/* Table Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowTableMenu(!showTableMenu); setShowImageMenu(false); }}
                      className={`p-1.5 sm:p-1 rounded-lg transition-colors ${showTableMenu ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                      title={lang === 'it' ? 'Inserisci Tabella' : 'Insert Table'}
                    >
                      <Table size={20} className="sm:size-[14px]" />
                    </button>
                    {showTableMenu && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-lg shadow-xl z-50 overflow-hidden font-sans">
                        <button onClick={() => { insertAtCursor(`\\n| Colonna 1 | Colonna 2 |\\n|---|---|\\n| Dato 1 | Dato 2 |\\n`); setShowTableMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300">Tabella Semplice (2x2)</button>
                        <button onClick={() => { insertAtCursor(`\\n| Colonna 1 | Colonna 2 | Colonna 3 |\\n|---|---|---|\\n| Dato 1 | Dato 2 | Dato 3 |\\n| Dato 4 | Dato 5 | Dato 6 |\\n`); setShowTableMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300">Tabella Media (3x3)</button>
                        <button onClick={() => { insertAtCursor(`\\n| Allineata a Sinistra | Centrata | Allineata a Destra |\\n| :--- | :---: | ---: |\\n| Testo | Testo | Testo |\\n`); setShowTableMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300">Tabella con Allineamenti</button>
                      </div>
                    )}
                  </div>
                  {/* Image Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowImageMenu(!showImageMenu); setShowTableMenu(false); }}
                      className={`p-1.5 sm:p-1 rounded-lg transition-colors ${showImageMenu ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                      title={lang === 'it' ? 'Inserisci Immagine' : 'Insert Image'}
                    >
                      <ImageIcon size={20} className="sm:size-[14px]" />
                    </button>
                    {showImageMenu && (
                      <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-lg shadow-xl z-50 overflow-hidden font-sans flex flex-col">
                            <button onClick={() => { 
                               fileInputRefTemp.current?.click();
                              setShowImageMenu(false);
                            }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                              <FilePlus size={12} className="text-emerald-500" /> {lang === 'it' ? 'File Locale (Rapido/Temporaneo Blob)' : 'Local File (Quick/Temp Blob)'}
                            </button>
                            <button onClick={() => { 
                               fileInputRefBase64.current?.click();
                              setShowImageMenu(false);
                            }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                              <HardDrive size={12} className="text-amber-500" /> {lang === 'it' ? 'File Locale (Incorporato Base64)' : 'Local File (Embedded Base64)'}
                            </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
"""

target = "              {/* Quick Font Size Adjusters (A- / A+) */}"
if target in content:
    content = content.replace(target, buttons + target)
    print("Buttons inserted")
else:
    print("Could not find target")

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
