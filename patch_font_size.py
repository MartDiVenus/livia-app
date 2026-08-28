import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

font_controls = """              {/* Quick Font Size Adjusters (A- / A+) */}
              {setEditorFontSize && (
                <div className="flex items-center gap-1 bg-white dark:bg-[#0D0F12] border border-gray-200 dark:border-[#2D2D2D] rounded-xl sm:rounded-lg p-0.5 sm:p-0.5">
                  <button
                    type="button"
                    onClick={() => setEditorFontSize(Math.max(12, editorFontSize - 2))}
                    className="px-4 py-3 min-h-[48px] sm:min-h-0 sm:px-1.5 sm:py-0.5 text-lg sm:text-xs font-black text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                    title={lang === 'it' ? 'Riduci dimensione testo' : 'Decrease text size'}
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sizes = [12, 14, 18, 24, 30, 32, 36, 40, 48];
                      const currentIdx = sizes.indexOf(editorFontSize);
                      const nextSize = sizes[(currentIdx + 1) % sizes.length];
                      setEditorFontSize(nextSize);
                    }}
                    className="text-xs sm:text-sm sm:text-[10px] font-mono px-2 sm:px-1 font-bold text-gray-700 dark:text-zinc-300 hover:text-blue-500 cursor-pointer"
                    title={lang === 'it' ? 'Tocca per scorrere dimensioni (12, 14, 18, 24, 30, 32, 36, 40, 48px)' : 'Tap to cycle preset font sizes'}
                  >
                    {editorFontSize}px
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorFontSize(Math.min(48, editorFontSize + 2))}
                    className="px-4 py-3 min-h-[48px] sm:min-h-0 sm:px-1.5 sm:py-0.5 text-lg sm:text-xs font-black text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                    title={lang === 'it' ? 'Aumenta dimensione testo fino a 48px' : 'Increase text size up to 48px'}
                  >
                    A+
                  </button>
                </div>
              )}
"""

target = """            <div className="flex items-center gap-2">
              {(format === 'md' || format === 'html' || format === 'svg') && ("""

if target in content:
    content = content.replace(target, '            <div className="flex items-center gap-2">\n' + font_controls + '              {(format === \'md\' || format === \'html\' || format === \'svg\') && (')
else:
    print("TARGET NOT FOUND!")

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)

print("Patch applied.")
