import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

pattern = r'''      if \(onOpenFileState\) \{
         // Auto-save current file before opening another\? 
         // Vim usually requires :e! or :w first if modified, but let's auto-save to be safe or just let App.tsx handle it\.
         // Let's explicitly save the current state in virtualFiles using onSaveFileState first, so it's not lost\.
         onSaveFileState\(filename, content\); 
         const res = onOpenFileState\(target\);
         if \(res && res\.found\) \{
            setStatusMessage\(lang === 'it' \? `Aperto "\$\{res\.name\}"` : `Opened "\$\{res\.name\}"`\);
         \} else if \(res && !res\.found\) \{
            // Se non esiste, creamolo
            // In App\.tsx onOpenFileState setta l'history ma restituisce found: false
            // Dobbiamo salvarlo per registrarlo come nuovo file
            onSaveFileState\(target, ""\); // create empty
            const res2 = onOpenFileState\(target\); // retry open
            setStatusMessage\(lang === 'it' \? `Nuovo file "\$\{target\}"` : `New file "\$\{target\}"`\);
         \}
      \}'''

replacement = r'''      if (onOpenFileState) {
         onSaveFileState(filename, content); 
         const res = onOpenFileState(target);
         if (res && res.found) {
            setStatusMessage(lang === 'it' ? `Aperto "${res.name}"` : `Opened "${res.name}"`);
         } else if (res && !res.found) {
            setStatusMessage(lang === 'it' ? `Nuovo file "${res.name}"` : `New file "${res.name}"`);
         }
      }'''

if "onSaveFileState(target, \"\");" in content:
    content = re.sub(pattern, replacement, content)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
