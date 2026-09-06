const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

code = code.replace("if (cm && !cm._dialogPatched) {", "if (cm && !(cm as any)._dialogPatched) {");
code = code.replace("cm._dialogPatched = true;", "(cm as any)._dialogPatched = true;");

fs.writeFileSync('src/components/VimEditor.tsx', code);
