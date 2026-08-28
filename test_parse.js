import fs from 'fs';
const vimjs = fs.readFileSync('node_modules/@replit/codemirror-vim-core/vim.js', 'utf8');
const parseCmdArgs = vimjs.match(/parseCommandArgs_.*?\}/s);
console.log(parseCmdArgs ? "Found parser" : "Not found");
