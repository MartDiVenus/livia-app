import re
with open("src/App.tsx", "r") as f:
    content = f.read()

# 1. Add fileHistory state
if "const [fileHistory, setFileHistory]" not in content:
    state_pattern = r'const \[virtualFiles, setVirtualFiles\] = useState<FileData\[\]>\(\(\) => \{'
    state_replacement = r'''const [fileHistory, setFileHistory] = useState<string[]>([]);
  const [virtualFiles, setVirtualFiles] = useState<FileData[]>(() => {'''
    content = re.sub(state_pattern, state_replacement, content)

# 2. Update onOpenFileState to push current file to history BEFORE switching, BUT
# we must handle creating the file if it doesn't exist so `:e b.txt` works even if b.txt is new.
# Let's find onOpenFileState definition.
open_file_pattern = r'onOpenFileState=\{\(rawTargetName\) => \{[\s\S]*?let existing = updatedVirtual\.find'
open_file_replacement = r'''onOpenFileState={(rawTargetName) => {
              if (!rawTargetName) return { found: false, name: '' };
              const cleanTarget = rawTargetName.replace(/^["']|["']$/g, '').trim();
              const baseName = cleanTarget.split(/[\/\\]/).pop() || cleanTarget;
              
              setFileHistory(prev => [...prev, filename]);

              // Build updated list synchronously to avoid state race conditions
              const updatedVirtual = virtualFiles.map(f => 
                f.name.toLowerCase() === filename.toLowerCase() ? { ...f, content } : f
              );
              
              let existing = updatedVirtual.find'''
if "setFileHistory(prev => [...prev, filename]);" not in content:
    content = re.sub(open_file_pattern, open_file_replacement, content)

# Also we need to make sure :e creates the file if it doesn't exist
# Look at the end of onOpenFileState.
# The original logic returns { found: false, name: cleanTarget } if not existing.
# Wait, VimEditor can handle { found: false } by calling onSaveFileState or just keeping it. Let's see how VimEditor handles it later.

# 3. Add fileHistory push in onShowHelp for each file
def add_history(match):
    return match.group(0) + "\n                setFileHistory(prev => [...prev, filename]);"
if "setFileHistory" not in content.split("const colFile = getHelpColorsTemplate(lang);")[1][:100]:
    content = re.sub(r'const colFile = getHelpColorsTemplate\(lang\);', add_history, content)
    content = re.sub(r'const figFile = getHelpFiguresTemplate\(lang\);', add_history, content)
    content = re.sub(r'const tabFile = getHelpTablesTemplate\(lang\);', add_history, content)
    content = re.sub(r'const helpFileContent = getHelpTemplate\(lang\);', add_history, content)

# 4. Add onCloseFileState to VimEditor props
if "onCloseFileState" not in content:
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
              
              return { success: true, message: '', isEmptyHistory: true };
            }}
            \1'''
    content = re.sub(vim_props_pattern, vim_props_replacement, content)

with open("src/App.tsx", "w") as f:
    f.write(content)

print("App.tsx patched.")
