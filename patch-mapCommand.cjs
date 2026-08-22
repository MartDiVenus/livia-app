const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf8');

code = code.replace("Vim.mapCommand('zc', 'action', 'fold', {});", "Vim.mapCommand('zc', 'action', 'fold', {}, {});");
code = code.replace("Vim.mapCommand('zo', 'action', 'unfold', {});", "Vim.mapCommand('zo', 'action', 'unfold', {}, {});");

fs.writeFileSync('src/components/VimEditor.tsx', code);
