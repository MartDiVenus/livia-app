import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# 1. Add fileHistory state
state_pattern = r'const \[virtualFiles, setVirtualFiles\] = useState<FileData\[\]>\(\(\) => \{'
state_replacement = r'''const [fileHistory, setFileHistory] = useState<string[]>([]);
  const [virtualFiles, setVirtualFiles] = useState<FileData[]>(() => {'''
content = re.sub(state_pattern, state_replacement, content)

# 2. Add fileHistory push in onOpenFileState
open_file_pattern = r'onOpenFileState=\{\(rawTargetName\) => \{[\s\S]*?const baseName = cleanTarget\.split\(\/\[\\\\\/\]\/\)\.pop\(\) \|\| cleanTarget;'
open_file_replacement = r'''onOpenFileState={(rawTargetName) => {
              if (!rawTargetName) return { found: false, name: '' };
              const cleanTarget = rawTargetName.replace(/^["']|["']$/g, '').trim();
              const baseName = cleanTarget.split(/[\/\\]/).pop() || cleanTarget;
              
              setFileHistory(prev => [...prev, filename]);'''
content = re.sub(open_file_pattern, open_file_replacement, content)

# 3. Add fileHistory push in onShowHelp for each file
def add_history(match):
    return match.group(0) + "\n                setFileHistory(prev => [...prev, filename]);"

content = re.sub(r'const colFile = getHelpColorsTemplate\(lang\);', add_history, content)
content = re.sub(r'const figFile = getHelpFiguresTemplate\(lang\);', add_history, content)
content = re.sub(r'const tabFile = getHelpTablesTemplate\(lang\);', add_history, content)

# Also for general help
content = re.sub(r'const helpFileContent = getHelpTemplate\(lang\);', add_history, content)

# 4. Add onCloseFileState to VimEditor props
vim_props_pattern = r'(onOpenFileState=\{[\s\S]*?\n\s+onShowHelp=\{)'
vim_props_replacement = r'''onCloseFileState={(force: boolean) => {
              const currentSaved = virtualFiles.find(f => f.name.toLowerCase() === filename.toLowerCase());
              const isModified = currentSaved ? currentSaved.content !== content : content.length > 0;
              
              if (!force && isModified) {
                return { success: false, message: lang === 'it' ? "Errore: Nessun salvataggio dall'ultima modifica (aggiungi ! per scartare)" : "Error: No write since last change (add ! to override)" };
              }
              
              if (fileHistory.length > 0) {
                const prevFile = fileHistory[fileHistory.length - 1];
                setFileHistory(prev => prev.slice(0, -1));
                
                const existing = virtualFiles.find(f => f.name.toLowerCase() === prevFile.toLowerCase());
                if (existing) {
                  setFilename(existing.name);
                  setContent(existing.content);
                  const ext = existing.name.split('.').pop()?.toLowerCase();
                  setFormat(ext === 'md' ? 'md' : ext === 'json' ? 'json' : ext === 'html' ? 'html' : 'txt');
                  return { success: true, message: lang === 'it' ? `Tornato a "${existing.name}"` : `Returned to "${existing.name}"` };
                }
              }
              
              // Se history è vuota ma forziamo la chiusura o chiudiamo l'ultimo, puliamo il contenuto?
              // L'utente si aspetta che :q senza un file in history chiuda l'editor o lo svuoti
              // return { success: true, message: '' }; // let's leave it to the editor
              return { success: true, message: '', isEmptyHistory: true };
            }}
            \1'''
content = re.sub(vim_props_pattern, vim_props_replacement, content)

with open("src/App.tsx", "w") as f:
    f.write(content)

print("App.tsx patched.")
