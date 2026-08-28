import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

pattern = r'''         if \(res && res\.isEmptyHistory\) \{
            // Do we want to clear the editor if it was the last file\?
            // setStatusMessage\("Quit"\);
         \}'''

replacement = r'''         if (res && res.isEmptyHistory) {
            setStatusMessage(lang === 'it' ? 'Ultimo file chiuso' : 'Last file closed');
            // We could call setContent("") but VimEditor doesn't have setFilename
            // so maybe App.tsx should handle clearing if history is empty
         }'''
content = re.sub(pattern, replacement, content)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
