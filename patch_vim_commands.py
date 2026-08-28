import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

commands_pattern = r"Vim\.defineEx\('write', 'w', \(\) => \{([\s\S]*?)\}\);\n\s+Vim\.defineEx\('help', 'h'"
match = re.search(commands_pattern, content)
if match:
    new_commands = r"""Vim.defineEx('write', 'w', () => {
      onSaveFileState(filename, content);
      setStatusMessage(lang === 'it' ? `"${filename}" salvato.` : `"${filename}" written.`);
    });
    
    Vim.defineEx('edit', 'e', (cm: any, params: any) => {
      const target = params?.args?.[0];
      if (!target) {
         setStatusMessage(lang === 'it' ? 'Specificare un nome file.' : 'Specify a filename.');
         return;
      }
      if (onOpenFileState) {
         // Auto-save current file before opening another? 
         // Vim usually requires :e! or :w first if modified, but let's auto-save to be safe or just let App.tsx handle it.
         // Let's explicitly save the current state in virtualFiles using onSaveFileState first, so it's not lost.
         onSaveFileState(filename, content); 
         const res = onOpenFileState(target);
         if (res && res.found) {
            setStatusMessage(lang === 'it' ? `Aperto "${res.name}"` : `Opened "${res.name}"`);
         } else if (res && !res.found) {
            // Se non esiste, creamolo
            // In App.tsx onOpenFileState setta l'history ma restituisce found: false
            // Dobbiamo salvarlo per registrarlo come nuovo file
            onSaveFileState(target, ""); // create empty
            const res2 = onOpenFileState(target); // retry open
            setStatusMessage(lang === 'it' ? `Nuovo file "${target}"` : `New file "${target}"`);
         }
      }
    });

    Vim.defineEx('quit', 'q', (cm: any, params: any) => {
      const force = params?.argString?.trim() === '!';
      if (onCloseFileState) {
         const res = onCloseFileState(force);
         if (res && res.message) {
            setStatusMessage(res.message);
         }
         if (res && res.isEmptyHistory) {
            // Do we want to clear the editor if it was the last file?
            // setStatusMessage("Quit");
         }
      }
    });
    
    Vim.defineEx('wq', 'wq', (cm: any, params: any) => {
      const force = params?.argString?.trim() === '!';
      onSaveFileState(filename, content);
      if (onCloseFileState) {
         const res = onCloseFileState(true); // force true because we just saved
         if (res && res.message) {
            setStatusMessage(res.message);
         }
      }
    });

    // Map ZZ to :wq
    Vim.map('ZZ', ':wq<CR>', 'normal');

    Vim.defineEx('help', 'h'"""
    
    content = content.replace(match.group(0), new_commands)
    
    # Need to update dependencies of useEffect
    dep_pattern = r'\}, \[filename, content, lang, onSaveFileState, onShowHelp\]\);'
    dep_replacement = r'}, [filename, content, lang, onSaveFileState, onShowHelp, onOpenFileState, onCloseFileState]);'
    content = content.replace(dep_pattern, dep_replacement)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
