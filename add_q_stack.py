import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

# 1. Update VimEditorProps
props_search = "  onOpenFileState?: (targetName: string) => { found: boolean; name: string };"
props_replace = "  onOpenFileState?: (targetName: string) => { found: boolean; name: string };\n  onCloseFileState?: (force: boolean) => { success: boolean, message: string, isEmptyHistory?: boolean };"
content = content.replace(props_search, props_replace)

# 2. Add onCloseFileState to the component parameters
param_search = "  onOpenFileState,\n  onShowHelp,"
param_replace = "  onOpenFileState,\n  onCloseFileState,\n  onShowHelp,"
content = content.replace(param_search, param_replace)

# 3. Update the ZZ logic
zz_search = """      if (commandBuffer === 'Z') {
        onSaveFileState(filename, content);
        setStatusMessage(lang === 'it' ? `[Scritto con ZZ] File "${filename}" salvato nel file system.` : `[Written with ZZ] File "${filename}" saved to file system.`);
        setCommandBuffer('');
      } else {"""
zz_replace = """      if (commandBuffer === 'Z') {
        onSaveFileState(filename, content);
        if (onCloseFileState) {
          const res = onCloseFileState(false);
          if (res.isEmptyHistory) {
            setContent('');
            setCursorIndex(0);
            setStatusMessage(lang === 'it' ? `[Scritto con ZZ] File "${filename}" salvato e chiuso.` : `[Written with ZZ] File "${filename}" saved and closed.`);
          } else {
            setStatusMessage(res.message);
          }
        } else {
          setStatusMessage(lang === 'it' ? `[Scritto con ZZ] File "${filename}" salvato nel file system.` : `[Written with ZZ] File "${filename}" saved to file system.`);
        }
        setCommandBuffer('');
      } else {"""
content = content.replace(zz_search, zz_replace)

# 4. Update the :q, :q! logic
q_search = """    if (cmd === ':q') {
      const savedContent = onReadFileState(filename);
      const isModified = savedContent === null ? content.length > 0 : content !== savedContent;
      if (isModified) {
        setStatusMessage(lang === 'it' 
           ? 'Errore: Nessun salvataggio dall\\'ultima modifica (aggiungi ! per scartare)' 
           : 'Error: No write since last change (add ! to override)');
      } else {
        setContent('');
        setCursorIndex(0);
        setStatusMessage(lang === 'it' ? 'File chiuso.' : 'File closed.');
      }
    } else if (cmd === ':q!') {
      setContent('');
      setCursorIndex(0);
      setStatusMessage(lang === 'it' ? 'File chiuso (svuotato) senza salvare.' : 'Document closed (cleared) without saving.');
    } else if (cmd.startsWith(':s/') || cmd.startsWith(':%s/')) {"""

q_replace = """    if (cmd === ':q') {
      if (onCloseFileState) {
        const res = onCloseFileState(false);
        if (res.success) {
          if (res.isEmptyHistory) {
            setContent('');
            setCursorIndex(0);
            setStatusMessage(lang === 'it' ? 'File chiuso.' : 'File closed.');
          } else {
            setStatusMessage(res.message);
          }
        } else {
          setStatusMessage(res.message);
        }
      } else {
        const savedContent = onReadFileState(filename);
        const isModified = savedContent === null ? content.length > 0 : content !== savedContent;
        if (isModified) {
          setStatusMessage(lang === 'it' 
             ? 'Errore: Nessun salvataggio dall\\'ultima modifica (aggiungi ! per scartare)' 
             : 'Error: No write since last change (add ! to override)');
        } else {
          setContent('');
          setCursorIndex(0);
          setStatusMessage(lang === 'it' ? 'File chiuso.' : 'File closed.');
        }
      }
    } else if (cmd === ':q!') {
      if (onCloseFileState) {
        const res = onCloseFileState(true);
        if (res.isEmptyHistory) {
          setContent('');
          setCursorIndex(0);
          setStatusMessage(lang === 'it' ? 'File chiuso (svuotato) senza salvare.' : 'Document closed (cleared) without saving.');
        } else {
          setStatusMessage(res.message);
        }
      } else {
        setContent('');
        setCursorIndex(0);
        setStatusMessage(lang === 'it' ? 'File chiuso (svuotato) senza salvare.' : 'Document closed (cleared) without saving.');
      }
    } else if (cmd === ':wq' || cmd === ':wq!' || cmd === ':x') {
      onSaveFileState(filename, content);
      if (onCloseFileState) {
        const res = onCloseFileState(cmd === ':wq!');
        if (res.isEmptyHistory) {
          setContent('');
          setCursorIndex(0);
          setStatusMessage(lang === 'it' ? `[Scritto] File "${filename}" salvato e chiuso.` : `[Written] File "${filename}" saved and closed.`);
        } else {
          setStatusMessage(res.message);
        }
      } else {
        setStatusMessage(lang === 'it' ? `[Scritto] File "${filename}" salvato con successo.` : `[Written] File "${filename}" saved successfully.`);
      }
    } else if (cmd.startsWith(':s/') || cmd.startsWith(':%s/')) {"""

content = content.replace(q_search, q_replace)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
print("Patch applied.")
