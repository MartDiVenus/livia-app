import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

# 1. Update VimEditorProps
props_pattern = r'onOpenFileState\?: \(targetName: string\) => \{ found: boolean; name: string \};'
props_replace = r'''onOpenFileState?: (targetName: string) => { found: boolean; name: string };
  onCloseFileState?: (force: boolean) => { success: boolean, message: string, isEmptyHistory?: boolean };'''
content = re.sub(props_pattern, props_replace, content)

# 2. Update :q and :q! logic in handleCommandSubmit
q_pattern = r'''    if \(cmd === ':q'\) \{[\s\S]*?    \} else if \(cmd === ':q!'\) \{[\s\S]*?\} else if \(cmd\.startsWith\(':s/'\)'''

q_replace = r'''    if (cmd === ':q') {
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
          setStatusMessage(lang === 'it' ? 'Errore: Nessun salvataggio dall\'ultima modifica (aggiungi ! per scartare)' : 'Error: No write since last change (add ! to override)');
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
          setStatusMessage(lang === 'it' ? `[Scritto] ${res.message}` : `[Written] ${res.message}`);
        }
      } else {
        setContent('');
        setCursorIndex(0);
        setStatusMessage(lang === 'it' ? `[Scritto] File "${filename}" salvato e chiuso.` : `[Written] File "${filename}" saved and closed.`);
      }
    } else if (cmd.startsWith(':s/'''

content = re.sub(q_pattern, q_replace, content)

# 3. Update ZZ in keydown
zz_pattern = r'''        onSaveFileState\(filename, content\);
        setStatusMessage\(lang === 'it' \? `\[Scritto con ZZ\] File "\$\{filename\}" salvato nel file system\.` : `\[Written with ZZ\] File "\$\{filename\}" saved to file system\.`\);
        setCommandBuffer\(''\);'''
zz_replace = r'''        onSaveFileState(filename, content);
        if (onCloseFileState) {
          const res = onCloseFileState(false);
          if (res.isEmptyHistory) {
            setContent('');
            setCursorIndex(0);
            setStatusMessage(lang === 'it' ? `[Scritto con ZZ] File "${filename}" salvato e chiuso.` : `[Written with ZZ] File "${filename}" saved and closed.`);
          } else {
            setStatusMessage(lang === 'it' ? `[Scritto con ZZ] ${res.message}` : `[Written with ZZ] ${res.message}`);
          }
        } else {
          setContent('');
          setCursorIndex(0);
          setStatusMessage(lang === 'it' ? `[Scritto con ZZ] File "${filename}" salvato e chiuso.` : `[Written with ZZ] File "${filename}" saved and closed.`);
        }
        setCommandBuffer('');'''

content = re.sub(zz_pattern, zz_replace, content)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)

print("VimEditor patched for q, q!, wq, ZZ.")
