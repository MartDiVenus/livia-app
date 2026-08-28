import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

# 1. Remove urlPrompt state and related code
content = re.sub(r'const \[urlPrompt, setUrlPrompt\].*;\n', '', content)
content = re.sub(r'const \[urlInput, setUrlInput\].*;\n', '', content)

# 2. Replace the dropdown content
menu_pattern = r'\{!urlPrompt\.visible \? \([\s\S]*?\) : \([\s\S]*?\}\s*\)\}'
menu_replacement = r'''<>
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
                          </>'''

content = re.sub(menu_pattern, menu_replacement, content)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)

