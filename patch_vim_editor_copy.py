import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

if "import { Sparkles, Eye, Edit3, ZoomIn, ZoomOut, Check, X, FileText, Keyboard, Terminal, Maximize2, Minimize2, Info, ChevronUp" in content:
    content = content.replace("import { Sparkles, Eye, Edit3, ZoomIn, ZoomOut, Check, X, FileText, Keyboard, Terminal, Maximize2, Minimize2, Info, ChevronUp", "import { Sparkles, Eye, Edit3, ZoomIn, ZoomOut, Check, X, FileText, Keyboard, Terminal, Maximize2, Minimize2, Info, ChevronUp, Copy")

# Add the state for master copy
state_block = """  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false);"""
state_replacement = """  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false);
  const [isMasterCopied, setIsMasterCopied] = useState(false);

  const handleMasterCopy = () => {
    navigator.clipboard.writeText(content);
    setIsMasterCopied(true);
    setTimeout(() => setIsMasterCopied(false), 2000);
  };"""

if state_block in content:
    content = content.replace(state_block, state_replacement)
else:
    print("State block not found.")

# Add master copy button in FULLSCREEN preview header
fs_header_block = """              <span className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-zinc-100 font-sans text-sm sm:text-xs uppercase">
                <Sparkles size={16} className="text-[#8AB4F8]" />
                {lang === 'it' ? "Anteprima Formattata" : "Formatted Preview"} ({format.toUpperCase()})
              </span>"""
fs_header_replacement = """              <span className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-zinc-100 font-sans text-sm sm:text-xs uppercase">
                <Sparkles size={16} className="text-[#8AB4F8]" />
                {lang === 'it' ? "Anteprima Formattata" : "Formatted Preview"} ({format.toUpperCase()})
              </span>
              <button
                onClick={handleMasterCopy}
                className="flex items-center gap-1 hover:text-white transition-colors p-1 rounded hover:bg-zinc-700 text-zinc-400 cursor-pointer"
                title={lang === 'it' ? "Copia tutto il documento" : "Copy entire document"}
              >
                {isMasterCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {isMasterCopied ? <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold hidden sm:inline">{lang === 'it' ? 'Copiato' : 'Copied'}</span> : <span className="text-[10px] uppercase tracking-wider font-bold hidden sm:inline">{lang === 'it' ? 'Copia' : 'Copy'}</span>}
              </button>"""

if fs_header_block in content:
    content = content.replace(fs_header_block, fs_header_replacement)
else:
    print("FS header block not found.")

# Add master copy button in SIDE-BY-SIDE preview header
sbs_header_block = """                  <span className="text-xs font-bold text-gray-700 dark:text-zinc-200 uppercase flex items-center gap-1.5 font-sans">
                    <Sparkles size={13} className="text-[#8AB4F8]" /> {lang === 'it' ? "Anteprima Formattata" : "Formatted Preview"} ({format.toUpperCase()})
                  </span>"""
sbs_header_replacement = """                  <span className="text-xs font-bold text-gray-700 dark:text-zinc-200 uppercase flex items-center gap-1.5 font-sans">
                    <Sparkles size={13} className="text-[#8AB4F8]" /> {lang === 'it' ? "Anteprima Formattata" : "Formatted Preview"} ({format.toUpperCase()})
                  </span>
                  <button
                    onClick={handleMasterCopy}
                    className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500 dark:text-zinc-400 cursor-pointer"
                    title={lang === 'it' ? "Copia tutto il documento" : "Copy entire document"}
                  >
                    {isMasterCopied ? <Check size={12} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={12} />}
                    {isMasterCopied ? <span className="text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">{lang === 'it' ? 'Copiato' : 'Copied'}</span> : <span className="text-[9px] uppercase tracking-wider font-bold">{lang === 'it' ? 'Copia' : 'Copy'}</span>}
                  </button>"""

if sbs_header_block in content:
    content = content.replace(sbs_header_block, sbs_header_replacement)
else:
    print("SBS header block not found.")

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)

print("Patch applied to VimEditor master copy buttons.")
