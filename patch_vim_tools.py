import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

# 1. Update imports
import_str = "import { Sparkles, Eye, Edit3, ZoomIn, ZoomOut, Check, X, FileText, Keyboard, Terminal, Maximize2, Minimize2, Info, ChevronUp, Copy } from 'lucide-react';"
new_import_str = "import { Sparkles, Eye, Edit3, ZoomIn, ZoomOut, Check, X, FileText, Keyboard, Terminal, Maximize2, Minimize2, Info, ChevronUp, Copy, Table, Image as ImageIcon, HardDrive, Cloud, FilePlus } from 'lucide-react';"
content = content.replace(import_str, new_import_str)

# 2. Add states for dropdowns and file refs
state_anchor = "const [showModeMenu, setShowModeMenu] = useState(false);"
state_insert = """const [showModeMenu, setShowModeMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const fileInputRefTemp = useRef<HTMLInputElement>(null);
  const fileInputRefBase64 = useRef<HTMLInputElement>(null);

  const insertAtCursor = (text: string, offset?: number) => {
    if (!editorRef.current?.view) return;
    const view = editorRef.current.view;
    const pos = view.state.selection.main.head;
    view.dispatch({
        changes: { from: pos, to: pos, insert: text },
        selection: { anchor: pos + (offset !== undefined ? offset : text.length) }
    });
    view.contentDOM.focus();
  };

  const appendToBottom = (text: string) => {
    if (!editorRef.current?.view) return;
    const view = editorRef.current.view;
    const end = view.state.doc.length;
    view.dispatch({
        changes: { from: end, to: end, insert: text }
    });
  };
"""
content = content.replace(state_anchor, state_insert)

# 3. Add hidden file inputs to the render (e.g. at the bottom of the component)
inputs_anchor = "{/* Mode Indicator */}"
inputs_insert = """
      {/* Hidden File Inputs for Image Upload */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRefTemp} 
        className="hidden" 
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

      {/* Mode Indicator */}"""
content = content.replace(inputs_anchor, inputs_insert)

# 4. Insert the Toolbar Buttons
toolbar_anchor = "{/* Quick Font Size Adjusters (A- / A+) */}"
toolbar_insert = """
              {/* Table & Image Inserts (MD/DOCX only) */}
              {(format === 'md' || format === 'docx') && (
                <div className="flex items-center gap-1 bg-white dark:bg-[#0D0F12] border border-gray-200 dark:border-[#2D2D2D] rounded-xl sm:rounded-lg p-0.5 mr-1 relative">
                  
                  {/* Table Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowTableMenu(!showTableMenu); setShowImageMenu(false); }}
                      className="p-1.5 sm:p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
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
                      className="p-1.5 sm:p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                      title={lang === 'it' ? 'Inserisci Immagine' : 'Insert Image'}
                    >
                      <ImageIcon size={20} className="sm:size-[14px]" />
                    </button>
                    {showImageMenu && (
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
                    )}
                  </div>

                </div>
              )}

              {/* Quick Font Size Adjusters (A- / A+) */}"""
content = content.replace(toolbar_anchor, toolbar_insert)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)

print("VimEditor patched successfully.")
