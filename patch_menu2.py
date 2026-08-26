import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_trigger = """            onClick={() => setShowModeMenu(prev => !prev)}
            className="bg-white/20 hover:bg-white/30 active:bg-white/40 dark:bg-[#0D0F12] dark:hover:bg-[#1E2127] text-white dark:text-[#8AB4F8] px-2 h-[18px] my-auto flex items-center gap-1 rounded tracking-wider font-mono cursor-pointer transition-all border border-white/25 dark:border-[#8AB4F8]/40 shadow-xs mr-1.5"
            title={lang === 'it' ? 'Tocca per cambiare modalità (NORMAL, INSERT, VISUAL, V-LINE)' : 'Tap to switch mode (NORMAL, INSERT, VISUAL, V-LINE)'}
            id="footer-mode-selector-btn"
          >"""

new_trigger = """            onPointerDown={(e) => { e.preventDefault(); setShowModeMenu(prev => !prev); }}
            className="bg-white/20 hover:bg-white/30 active:bg-white/40 dark:bg-[#0D0F12] dark:hover:bg-[#1E2127] text-white dark:text-[#8AB4F8] px-2 h-[18px] my-auto flex items-center gap-1 rounded tracking-wider font-mono cursor-pointer transition-all border border-white/25 dark:border-[#8AB4F8]/40 shadow-xs mr-1.5"
            title={lang === 'it' ? 'Tocca per cambiare modalità (NORMAL, INSERT, VISUAL, V-LINE)' : 'Tap to switch mode (NORMAL, INSERT, VISUAL, V-LINE)'}
            id="footer-mode-selector-btn"
          >"""

content = content.replace(old_trigger, new_trigger)
with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
