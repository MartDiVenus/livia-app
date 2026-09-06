const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `            const panels = document.querySelectorAll('.cm-panel input');`;
const replaceStr = `            const panels = document.querySelectorAll('.cm-panel input, .cm-vim-panel input');`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/VimEditor.tsx', code);
