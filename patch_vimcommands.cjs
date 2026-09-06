const fs = require('fs');

const vimEditorPath = 'src/components/VimEditor.tsx';
let code = fs.readFileSync(vimEditorPath, 'utf-8');

// Find the start and end of the Vim.defineEx block
const startEx = code.indexOf("    Vim.defineEx('write',");
const endEx = code.indexOf("    Vim.defineEx('latin',") + 2000; // rough estimation

console.log("startEx", startEx);
