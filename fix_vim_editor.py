import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

# 1. We need to add the URL prompt state
state_search = "const [showImageMenu, setShowImageMenu] = useState(false);"
state_replace = """const [showImageMenu, setShowImageMenu] = useState(false);
  const [urlPrompt, setUrlPrompt] = useState<{ type: 'drive' | 'firebase', visible: boolean }>({ type: 'drive', visible: false });
  const [urlInput, setUrlInput] = useState('');"""
if state_search in content:
    content = content.replace(state_search, state_replace)

# 2. We need to replace the prompt() logic in the dropdowns.
# And add the URL input UI inside the image menu
dropdown_search = """                    {showImageMenu && (
                      <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-lg shadow-xl z-50 overflow-hidden font-sans flex flex-col">
                        <button onClick={() => { 
                          const url = prompt(lang === 'it' ? 'Inserisci URL immagine da Google Drive:' : 'Enter Google Drive image URL:');
                          if(url) insertAtCursor(`![Immagine da Drive](${url})`);
                          setShowImageMenu(false);
                        }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                          <Cloud size={12} className="text-blue-500" /> {lang === 'it' ? 'Da Google Drive (URL)' : 'From Google Drive (URL)'}
                        </button>
                        <button onClick={() => { 
                          fileInputRefTemp.current?.click();
                        }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                          <FilePlus size={12} className="text-emerald-500" /> {lang === 'it' ? 'File Locale (Rapido/Temporaneo Blob)' : 'Local File (Quick/Temp Blob)'}
                        </button>
                        <button onClick={() => { 
                          fileInputRefBase64.current?.click();
                        }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                          <HardDrive size={12} className="text-amber-500" /> {lang === 'it' ? 'File Locale (Incorporato Base64)' : 'Local File (Embedded Base64)'}
                        </button>
                        <button onClick={() => { 
                          const url = prompt(lang === 'it' ? 'Inserisci URL immagine Firebase Storage:' : 'Enter Firebase Storage image URL:');
                          if(url) insertAtCursor(`![Immagine Cloud](${url})`);
                          setShowImageMenu(false);
                        }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                          <Cloud size={12} className="text-orange-500" /> {lang === 'it' ? 'Carica su Cloud (Firebase URL)' : 'Upload to Cloud (Firebase URL)'}
                        </button>
                      </div>
                    )}"""

dropdown_replace = """                    {showImageMenu && (
                      <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-lg shadow-xl z-50 overflow-hidden font-sans flex flex-col">
                        {!urlPrompt.visible ? (
                          <>
                            <button onClick={() => { 
                              setUrlPrompt({ type: 'drive', visible: true });
                              setUrlInput('');
                            }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                              <Cloud size={12} className="text-blue-500" /> {lang === 'it' ? 'Da Google Drive (URL)' : 'From Google Drive (URL)'}
                            </button>
                            <button onClick={() => { 
                              fileInputRefTemp.current?.click();
                            }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                              <FilePlus size={12} className="text-emerald-500" /> {lang === 'it' ? 'File Locale (Rapido/Temporaneo Blob)' : 'Local File (Quick/Temp Blob)'}
                            </button>
                            <button onClick={() => { 
                              fileInputRefBase64.current?.click();
                            }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                              <HardDrive size={12} className="text-amber-500" /> {lang === 'it' ? 'File Locale (Incorporato Base64)' : 'Local File (Embedded Base64)'}
                            </button>
                            <button onClick={() => { 
                              setUrlPrompt({ type: 'firebase', visible: true });
                              setUrlInput('');
                            }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                              <Cloud size={12} className="text-orange-500" /> {lang === 'it' ? 'Carica su Cloud (Firebase URL)' : 'Upload to Cloud (Firebase URL)'}
                            </button>
                          </>
                        ) : (
                          <div className="p-3 flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">
                              {urlPrompt.type === 'drive' ? (lang === 'it' ? 'URL Google Drive' : 'Google Drive URL') : (lang === 'it' ? 'URL Firebase' : 'Firebase URL')}
                            </label>
                            <input 
                              type="text" 
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                              placeholder="https://..."
                              className="w-full px-2 py-1.5 text-xs bg-gray-100 dark:bg-[#0D0F12] border border-gray-300 dark:border-zinc-700 rounded text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if(e.key === 'Enter' && urlInput.trim()) {
                                  insertAtCursor(`![${urlPrompt.type === 'drive' ? 'Immagine da Drive' : 'Immagine Cloud'}](${urlInput.trim()})`);
                                  setShowImageMenu(false);
                                  setUrlPrompt({ type: 'drive', visible: false });
                                }
                              }}
                            />
                            <div className="flex gap-2 justify-end mt-1">
                              <button onClick={() => setUrlPrompt({ type: 'drive', visible: false })} className="px-2 py-1 text-[10px] text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200">
                                {lang === 'it' ? 'Annulla' : 'Cancel'}
                              </button>
                              <button 
                                onClick={() => {
                                  if(urlInput.trim()) {
                                    insertAtCursor(`![${urlPrompt.type === 'drive' ? 'Immagine da Drive' : 'Immagine Cloud'}](${urlInput.trim()})`);
                                    setShowImageMenu(false);
                                    setUrlPrompt({ type: 'drive', visible: false });
                                  }
                                }}
                                className="px-2 py-1 text-[10px] bg-blue-500 hover:bg-blue-600 text-white rounded font-bold"
                              >
                                {lang === 'it' ? 'Inserisci' : 'Insert'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}"""

if dropdown_search in content:
    content = content.replace(dropdown_search, dropdown_replace)
else:
    print("Could not find dropdown search block!")

# 3. Inject the hidden file inputs right before the closing </footer> or closing </div>
# The previous script failed to insert them, so let's do it safely at the end of the file.
inputs = """
      {/* Hidden File Inputs for Image Upload */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRefTemp} 
        className="hidden" 
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            insertAtCursor(`![${file.name}](${url})`);
          }
          if (fileInputRefTemp.current) fileInputRefTemp.current.value = '';
          setShowImageMenu(false);
        }} 
      />
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRefBase64} 
        className="hidden" 
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result as string;
              const refName = `img-${Date.now()}`;
              insertAtCursor(`![${file.name}][${refName}]`);
              appendToBottom(`\\n\\n[${refName}]: ${base64}`);
            };
            reader.readAsDataURL(file);
          }
          if (fileInputRefBase64.current) fileInputRefBase64.current.value = '';
          setShowImageMenu(false);
        }} 
      />
"""

if "<div className=\"px-2 font-mono\">{format}</div>" in content:
    content = content.replace("<div className=\"px-2 font-mono\">{format}</div>", "<div className=\"px-2 font-mono\">{format}</div>\n" + inputs)
else:
    print("Could not find format div to anchor inputs!")

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)

print("VimEditor patched successfully.")
