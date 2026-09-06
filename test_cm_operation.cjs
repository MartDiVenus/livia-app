const fs = require('fs');
let code = fs.readFileSync('src/lib/vimCommands.ts', 'utf-8');
console.log(code.match(/const onInsert =[\s\S]*?};/)[0]);
