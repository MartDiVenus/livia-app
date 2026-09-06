const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

// The Prec.highest block starts at "const mobileIntercept =" and ends before "const exts ="
code = code.replace(/const mobileIntercept = Prec\.highest\([\s\S]*?\n  \]\)\);\n\n/m, '');
code = code.replace(/mobileIntercept,\n\s*/, '');

fs.writeFileSync('src/components/VimEditor.tsx', code);
