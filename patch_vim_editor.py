import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

# 1. Move the Mode Selection Popover Menu out of the footer.
# Find the menu block.
menu_block = """          {/* Mode Selection Popover Menu */}
          {showModeMenu && (
            <>
              <div className="fixed inset-0 z-40 bg-black/10 dark:bg-black/40" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowModeMenu(false); }} />
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
                        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectMode(m.key); }}
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
          )}"""

# We'll extract it and remove it from inside the footer
if menu_block in content:
    content = content.replace(menu_block, "")
else:
    print("WARNING: Exact menu block not found, trying regex...")
    # fallback

# 2. Fix the Gboard styling.
old_gboard = """className={`h-[18px] px-1.5 my-auto flex items-center gap-1 rounded font-bold font-mono cursor-pointer transition-all border shadow-xs ${
                isSoftKeyboardOpen
                  ? 'bg-white text-emerald-700 dark:bg-[#0D0F12] dark:text-[#8AB4F8] border-white/60 dark:border-[#8AB4F8]'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-zinc-300 border-transparent'
              }`}"""
new_gboard = """className={`h-[18px] px-1.5 my-auto flex items-center gap-1 rounded font-bold font-mono cursor-pointer transition-all border shadow-xs ${
                isSoftKeyboardOpen
                  ? 'bg-white text-emerald-700 dark:bg-[#0D0F12] dark:text-[#8AB4F8] border-white/60 dark:border-[#8AB4F8]'
                  : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:hover:bg-indigo-800/60 dark:text-indigo-400 border-transparent'
              }`}"""
content = content.replace(old_gboard, new_gboard)

# Also fix if it was left as bg-black/20 from earlier
old_gboard2 = """className={`h-[18px] px-1.5 my-auto flex items-center gap-1 rounded font-bold font-mono cursor-pointer transition-all border shadow-xs ${
                isSoftKeyboardOpen
                  ? 'bg-white text-emerald-700 dark:bg-[#0D0F12] dark:text-[#8AB4F8] border-white/60 dark:border-[#8AB4F8]'
                  : 'bg-black/20 hover:bg-black/30 text-white/90 dark:text-zinc-900 border-transparent'
              }`}"""
content = content.replace(old_gboard2, new_gboard)

# 3. Modify the triggers to use onClick reliably
old_trigger = """onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowModeMenu(prev => !prev); }}"""
new_trigger = """onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModeMenu(prev => !prev); }}"""
content = content.replace(old_trigger, new_trigger)

# Now, we need to place the modified menu block BEFORE the <footer> tag.
# And rewrite its handlers to onClick.
modified_menu_block = menu_block.replace(
    "onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowModeMenu(false); }}",
    "onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModeMenu(false); }}"
).replace(
    "onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectMode(m.key); }}",
    "onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectMode(m.key); }}"
)

footer_start = '<footer className="relative bg-emerald-600'
if footer_start in content:
    content = content.replace(footer_start, modified_menu_block + '\n      ' + footer_start)
else:
    print("WARNING: footer_start not found")

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)

print("Patch applied successfully.")
