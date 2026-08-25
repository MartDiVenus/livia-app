import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

# 1. Add ChevronUp and Keyboard and getCM imports
content = content.replace("import { vim, Vim } from '@replit/codemirror-vim';", "import { vim, Vim, getCM } from '@replit/codemirror-vim';")
content = content.replace("import { Sparkles, Eye, Edit3, ZoomIn, ZoomOut, Check, X, FileText, Keyboard, Terminal, Maximize2, Minimize2, Info }", "import { Sparkles, Eye, Edit3, ZoomIn, ZoomOut, Check, X, FileText, Keyboard, Terminal, Maximize2, Minimize2, Info, ChevronUp }")

# 2. Add mode state
mode_state = """
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [currentMode, setCurrentMode] = useState<VimMode>('normal');
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const vimModesList: { key: VimMode; label: string; shortcut: string; descIt: string; descEn: string }[] = [
    { key: 'normal', label: 'NORMAL', shortcut: 'Esc', descIt: 'Comandi e movimenti Vim', descEn: 'Vim navigation & commands' },
    { key: 'insert', label: 'INSERT', shortcut: 'i', descIt: 'Scrittura e digitazione testo', descEn: 'Text typing & editing' },
    { key: 'visual', label: 'VISUAL', shortcut: 'v', descIt: 'Selezione per caratteri', descEn: 'Character-wise selection' },
    { key: 'visual-line', label: 'V-LINE', shortcut: 'V', descIt: 'Selezione intere righe', descEn: 'Line-wise selection' },
  ];

  const handleSelectMode = (newMode: VimMode) => {
    setShowModeMenu(false);
    if (!editorRef.current?.view) return;
    const cm = getCM(editorRef.current.view);
    if (!cm) return;

    if (newMode === 'normal') {
      Vim.handleKey(cm, '<Esc>', 'mapping');
    } else if (newMode === 'insert') {
      Vim.handleKey(cm, 'i', 'mapping');
    } else if (newMode === 'visual') {
      Vim.handleKey(cm, 'v', 'mapping');
    } else if (newMode === 'visual-line') {
      Vim.handleKey(cm, 'V', 'mapping');
    }
  };
"""

# Insert right after `const isInsertModeRef = useRef(false);`
content = content.replace("const isInsertModeRef = useRef(false);", "const isInsertModeRef = useRef(false);\n" + mode_state)

# 3. Update currentMode in handleVimMode
vim_mode_change = """
      if (e.mode === 'insert') {
        m = 'insert';
        isInsertModeRef.current = true;
      } else {
"""
new_vim_mode_change = """
      if (e.mode === 'insert') {
        m = 'insert';
        isInsertModeRef.current = true;
      } else {
"""
content = content.replace("if (onModeChange) onModeChange(m);", "if (onModeChange) onModeChange(m);\n      setCurrentMode(m);")

# 4. Replace simulated-key-trigger
simulated_trigger_old = """const cm = (editorRef.current.view as any).cm;"""
simulated_trigger_new = """const cm = getCM(editorRef.current.view);"""
content = content.replace(simulated_trigger_old, simulated_trigger_new)


# 5. Replace Footer
footer_old_regex = r'<footer className="bg-emerald-600 dark:bg-\[#21252B\] h-6 flex text-\[10px\] items-center text-white dark:text-\[#9DA5B4\] font-sans font-medium tracking-wide uppercase shrink-0 w-full overflow-x-auto overflow-y-hidden">.*?</footer>'

footer_new = """<footer className="relative bg-emerald-600 dark:bg-[#21252B] h-6 flex text-[10px] items-center text-white dark:text-[#9DA5B4] font-sans font-medium tracking-wide uppercase shrink-0 w-full overflow-x-auto overflow-y-hidden transition-colors duration-200">
        <div className="relative flex items-center h-full px-2">
          {/* Direct Tap Mode Selector Button */}
          <button
            type="button"
            onClick={() => setShowModeMenu(prev => !prev)}
            className="bg-white/20 hover:bg-white/30 active:bg-white/40 dark:bg-[#0D0F12] dark:hover:bg-[#1E2127] text-white dark:text-[#8AB4F8] px-2 h-[18px] my-auto flex items-center gap-1 rounded tracking-wider font-mono cursor-pointer transition-all border border-white/25 dark:border-[#8AB4F8]/40 shadow-xs mr-1.5"
            title={lang === 'it' ? 'Tocca per cambiare modalità (NORMAL, INSERT, VISUAL, V-LINE)' : 'Tap to switch mode (NORMAL, INSERT, VISUAL, V-LINE)'}
            id="footer-mode-selector-btn"
          >
            <span>{currentMode === 'normal' ? 'NORMAL' : currentMode === 'visual' ? 'VISUAL' : currentMode === 'visual-line' ? 'V-LINE' : currentMode.toUpperCase()}</span>
            <ChevronUp size={11} className={`transition-transform duration-200 ${showModeMenu ? 'rotate-180' : ''}`} />
          </button>
          
          {/* Gboard Soft Keyboard Status & Toggle Indicator - only on touch/mobile */}
          {isTouchDevice && onSoftKeyboardChange && (
            <button
              type="button"
              onClick={() => onSoftKeyboardChange(!isSoftKeyboardOpen)}
              className={`h-[18px] px-1.5 my-auto flex items-center gap-1 rounded font-bold font-mono cursor-pointer transition-all border shadow-xs ${
                isSoftKeyboardOpen
                  ? 'bg-white text-emerald-700 dark:bg-[#0D0F12] dark:text-[#8AB4F8] border-white/60 dark:border-[#8AB4F8]'
                  : 'bg-black/20 hover:bg-black/30 text-white/90 dark:text-zinc-900 border-transparent'
              }`}
              title={
                isSoftKeyboardOpen
                  ? (lang === 'it' ? 'Tastiera Gboard attiva: tocca per nascondere' : 'Gboard keyboard active: tap to hide')
                  : (lang === 'it' ? 'Tastiera Gboard nascosta: tocca per aprire' : 'Gboard keyboard hidden: tap to open')
              }
              id="footer-gboard-toggle-btn"
            >
              <Keyboard size={10} />
              <span className="hidden xs:inline">
                {isSoftKeyboardOpen ? 'ON' : 'OFF'}
              </span>
            </button>
          )}

          {/* Mode Selection Popover Menu */}
          {showModeMenu && (
            <>
              <div className="fixed inset-0 z-40 bg-black/10 dark:bg-black/40" onClick={() => setShowModeMenu(false)} />
              <div className="absolute bottom-6 left-0 z-50 min-w-[210px] bg-white dark:bg-[#1E2127] border border-gray-200 dark:border-[#2C313C] rounded-lg shadow-2xl py-1 text-gray-800 dark:text-[#ABB2BF] text-xs font-sans normal-case animate-in fade-in slide-in-from-bottom-2 duration-150" id="footer-mode-dropdown-menu">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 tracking-wider border-b border-gray-100 dark:border-[#2C313C] flex items-center justify-between">
                  <span>{lang === 'it' ? 'Cambia Modalità' : 'Switch Mode'}</span>
                  <span className="text-[9px] font-mono text-emerald-600 dark:text-[#8AB4F8]">Vim</span>
                </div>
                <div className="py-1">
                  {vimModesList.map((m) => {
                    const isSelected = currentMode === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => handleSelectMode(m.key)}
                        className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-emerald-50 dark:hover:bg-[#2C313C] cursor-pointer transition-colors ${isSelected ? 'text-emerald-700 dark:text-[#8AB4F8] font-bold bg-emerald-50/80 dark:bg-[#2C313C]/80' : 'text-gray-700 dark:text-zinc-300'}`}
                      >
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold tracking-wide flex items-center gap-1.5">
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#8AB4F8]"></span>}
                            {m.label}
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-normal">
                            {lang === 'it' ? m.descIt : m.descEn}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-[#0D0F12] border border-gray-200 dark:border-[#3E4451] px-1.5 py-0.5 rounded ml-2">
                          {m.shortcut}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-2 text-white dark:text-[#0D0F12] font-semibold tracking-tight truncate hidden sm:block min-w-0">
          {filename}
        </div>
        <div className="flex-1 text-white/80 dark:text-zinc-800 italic text-[11px] lowercase normal-case px-2.5 truncate min-w-0">
          {statusMessage}
        </div>
        <div className="px-2 font-mono tabular-nums">Ln {cursorPos.line}, Col {cursorPos.col}</div>
        <div className="px-2 hidden sm:block font-mono">UTF-8</div>
        <div className="px-2 font-mono">{format}</div>
      </footer>"""

content = re.sub(footer_old_regex, footer_new, content, flags=re.DOTALL)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
