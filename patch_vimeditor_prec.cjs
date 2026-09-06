const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

code = code.replace("import { EditorView, keymap }", "import { EditorView, keymap, Prec }");
fs.writeFileSync('src/components/VimEditor.tsx', code);
