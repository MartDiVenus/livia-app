const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(/throw new Error\("MOCK IMMEDIATELY FAILING FETCH"\);\n          /g, "");
fs.writeFileSync('src/App.tsx', code);
