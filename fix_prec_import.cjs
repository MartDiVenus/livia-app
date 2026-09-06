const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

code = code.replace("import { EditorView, keymap, Prec } from '@codemirror/view';", "import { EditorView, keymap } from '@codemirror/view';");
fs.writeFileSync('src/components/VimEditor.tsx', code);
