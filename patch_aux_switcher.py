import re
with open("src/components/AuxiliaryKeyboard.tsx", "r") as f:
    content = f.read()

# Replace the 'i' button
old_i = """            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onKeyPress('i'); }}
              className="min-h-[30px] px-2.5 py-0.5 text-xs font-bold font-mono bg-[#8AB4F8] text-[#0D0F12] rounded hover:opacity-90 transition-all active:scale-95 cursor-pointer"
              title={lang === 'it' ? 'Entra in Inserimento (i)' : 'Enter Insert Mode (i)'}
              id="aux-i"
            >"""

new_i = """            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); if (mode !== 'normal') onKeyPress('Escape'); onKeyPress('i'); }}
              className="min-h-[30px] px-2.5 py-0.5 text-xs font-bold font-mono bg-[#8AB4F8] text-[#0D0F12] rounded hover:opacity-90 transition-all active:scale-95 cursor-pointer"
              title={lang === 'it' ? 'Entra in Inserimento (i)' : 'Enter Insert Mode (i)'}
              id="aux-i"
            >"""

content = content.replace(old_i, new_i)

# Replace the 'v' button
old_v = """            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onKeyPress('v'); }}
              className="min-h-[30px] px-2.5 py-0.5 text-xs font-bold font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-[#8AB4F8] hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-all active:scale-95 cursor-pointer"
              title={lang === 'it' ? 'Entra in Visuale (v)' : 'Enter Visual Mode (v)'}
              id="aux-v"
            >"""

new_v = """            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); if (mode !== 'normal') onKeyPress('Escape'); onKeyPress('v'); }}
              className="min-h-[30px] px-2.5 py-0.5 text-xs font-bold font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-[#8AB4F8] hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-all active:scale-95 cursor-pointer"
              title={lang === 'it' ? 'Entra in Visuale (v)' : 'Enter Visual Mode (v)'}
              id="aux-v"
            >"""

content = content.replace(old_v, new_v)

# Replace the 'V' button
old_V = """            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onKeyPress('V'); }}
              className="min-h-[30px] px-2.5 py-0.5 text-xs font-bold font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-[#8AB4F8] hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-all active:scale-95 cursor-pointer"
              title={lang === 'it' ? 'Entra in Visuale Riga (V)' : 'Enter Visual Line Mode (V)'}
              id="aux-V"
            >"""

new_V = """            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); if (mode !== 'normal') onKeyPress('Escape'); onKeyPress('V'); }}
              className="min-h-[30px] px-2.5 py-0.5 text-xs font-bold font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-[#8AB4F8] hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-all active:scale-95 cursor-pointer"
              title={lang === 'it' ? 'Entra in Visuale Riga (V)' : 'Enter Visual Line Mode (V)'}
              id="aux-V"
            >"""

content = content.replace(old_V, new_V)

with open("src/components/AuxiliaryKeyboard.tsx", "w") as f:
    f.write(content)
