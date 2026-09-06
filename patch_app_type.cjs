const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(/let errData = \{\};/g, 'let errData: any = {};');
fs.writeFileSync('src/App.tsx', code);
