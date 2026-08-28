import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

# I will replace the conditional preview toggle block with an unconditional one.
target_block = """              {(format === 'md' || format === 'html' || format === 'svg') && (
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-xl sm:rounded-lg font-bold transition-all shadow-xs active:scale-95 cursor-pointer text-sm sm:text-[10px] uppercase tracking-wide border ${
                    showPreview 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400 hover:bg-emerald-100' 
                      : 'bg-white dark:bg-[#0D0F12] text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-[#2D2D2D] hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {showPreview ? <Edit3 size={24} className="sm:size-[13px]" /> : <Eye size={24} className="sm:size-[13px]" />}
                  <span className="hidden sm:inline">{showPreview ? (lang === 'it' ? "Chiudi Anteprima" : "Close Preview") : (lang === 'it' ? "Anteprima" : "Preview")}</span>
                </button>
              )}"""

replacement_block = """              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-xl sm:rounded-lg font-bold transition-all shadow-xs active:scale-95 cursor-pointer text-sm sm:text-[10px] uppercase tracking-wide border ${
                  showPreview 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400 hover:bg-emerald-100' 
                    : 'bg-white dark:bg-[#0D0F12] text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-[#2D2D2D] hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-200'
                }`}
                title={lang === 'it' ? "Affianca anteprima ad albero" : "Side-by-side preview"}
                id="toggle-preview-btn"
              >
                {showPreview ? <Edit3 size={24} className="sm:size-[13px]" /> : <Eye size={24} className="sm:size-[13px]" />}
                <span className="hidden sm:inline">{showPreview ? (lang === 'it' ? "Chiudi Anteprima" : "Close Preview") : (lang === 'it' ? "Anteprima" : "Preview")}</span>
              </button>"""

if target_block in content:
    content = content.replace(target_block, replacement_block)
else:
    print("Could not find target_block")

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)

print("Patch applied.")
