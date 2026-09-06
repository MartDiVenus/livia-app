const fs = require('fs');
let code = fs.readFileSync('node_modules/.vite/deps/@replit_codemirror-vim.js', 'utf-8');
console.log(code.match(/if \(cm\.openDialog\) \{[\s\S]*?\}/)[0]);
