const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

code = code.replace("Vim.handleEx(cm, cmd);", "Vim.handleEx(cm as any, cmd);");

fs.writeFileSync('src/components/VimEditor.tsx', code);
