import re
with open("src/components/AuxiliaryKeyboard.tsx", "r") as f:
    content = f.read()

bad_block = """          {/* Mode Switchers */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#0D0F12] p-1 rounded-lg border border-gray-200 dark:border-[#2D2D2D] shadow-xs">
            {mode !== 'normal' && (
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); onKeyPress('Escape'); }}
                className="min-h-[30px] px-2.5 py-0.5 text-xs font-bold font-mono bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-500 rounded hover:opacity-90 transition-all active:scale-95 cursor-pointer"
                title={lang === 'it' ? 'Torna a Normale (Esc)' : 'Back to Normal (Esc)'}
                id="aux-esc"
              >
                ESC
              </button>
            )}
            {mode === 'normal' && (
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); onKeyPress('i'); }}"""

good_block = """          {/* Mode Switchers */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#0D0F12] p-1 rounded-lg border border-gray-200 dark:border-[#2D2D2D] shadow-xs">
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onKeyPress('i'); }}"""

content = content.replace(bad_block, good_block)

bad_close = """                V (Line)
              </button>
            )}
          </div>"""

good_close = """                V (Line)
              </button>
          </div>"""

content = content.replace(bad_close, good_close)

with open("src/components/AuxiliaryKeyboard.tsx", "w") as f:
    f.write(content)
