import re

# 1. Patch App.tsx to fix double-tap (Issue B)
with open("src/App.tsx", "r") as f:
    app_content = f.read()

app_content = app_content.replace(
    "const [isSoftKeyboardOpen, setIsSoftKeyboardOpen] = useState<boolean>(true);",
    "const [isSoftKeyboardOpen, setIsSoftKeyboardOpen] = useState<boolean>(false);"
)

with open("src/App.tsx", "w") as f:
    f.write(app_content)


# 2. Patch VimEditor.tsx to fix Mode Selector, Overlay, and Gboard trigger (Issue A)
with open("src/components/VimEditor.tsx", "r") as f:
    vim_content = f.read()

old_handle = """  const handleSelectMode = (newMode: VimMode) => {
    setShowModeMenu(false);
    if (!editorRef.current?.view) return;
    const cm = getCM(editorRef.current.view);
    if (!cm || !Vim) return;

    // Always exit to normal mode first natively
    Vim.handleKey(cm, '<Esc>', 'mapping');

    if (newMode === 'normal') {
      editorRef.current.view.focus();
      return;
    }

    // Dispatch the new mode key synchronously
    let key = '';
    if (newMode === 'insert') key = 'i';
    if (newMode === 'visual') key = 'v';
    if (newMode === 'visual-line') key = 'V';
    
    if (key) {
      Vim.handleKey(cm, key, 'mapping');
    }
    
    // Ensure keyboard state is open when entering insert mode, then focus
    if (newMode === 'insert' && onSoftKeyboardChange) {
      onSoftKeyboardChange(true);
    }
    // Focus immediately (synchronously) so mobile browsers allow the soft keyboard to appear
    editorRef.current.view.focus();
  };"""

new_handle = """  const handleSelectMode = (newMode: VimMode) => {
    setShowModeMenu(false);
    if (!editorRef.current?.view) return;
    const cm = getCM(editorRef.current.view);
    if (!cm || !Vim) return;

    // 1. Reset sicuro dello stato
    Vim.handleKey(cm, '<Esc>', 'mapping');

    if (newMode === 'normal') return;

    // 2. Transizione di stato sincrona
    let key = '';
    if (newMode === 'insert') key = 'i';
    if (newMode === 'visual') key = 'v';
    if (newMode === 'visual-line') key = 'V';
    
    if (key) {
      Vim.handleKey(cm, key, 'mapping');
    }
    // Nessun trigger di focus() sul DOM: questo evita l'apertura forzata della Gboard.
  };"""

vim_content = vim_content.replace(old_handle, new_handle)

# Sostituzione dei listener per evitare Ghost Clicks e Race Conditions tra pointerdown e click
old_trigger = "onPointerDown={(e) => { e.preventDefault(); setShowModeMenu(prev => !prev); }}"
new_trigger = "onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModeMenu(prev => !prev); }}"
vim_content = vim_content.replace(old_trigger, new_trigger)

old_overlay = "onPointerDown={(e) => { e.preventDefault(); setShowModeMenu(false); }}"
new_overlay = "onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModeMenu(false); }}"
vim_content = vim_content.replace(old_overlay, new_overlay)

old_item = "onPointerDown={(e) => { e.preventDefault(); handleSelectMode(m.key); }}"
new_item = "onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectMode(m.key); }}"
vim_content = vim_content.replace(old_item, new_item)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(vim_content)

print("Patch completata.")
