const fs = require('fs');

let tb = fs.readFileSync('src/components/Toolbar.tsx', 'utf8');
tb = tb.replace(/className="sm:size-\[32px\]" className="([^"]*)"/g, 'className="sm:size-[32px] $1"');
fs.writeFileSync('src/components/Toolbar.tsx', tb);

let vim = fs.readFileSync('src/components/VimEditor.tsx', 'utf8');
vim = vim.replace(/className="sm:size-\[13px\]" className="([^"]*)"/g, 'className="sm:size-[13px] $1"');
fs.writeFileSync('src/components/VimEditor.tsx', vim);

