const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const regex = /\/\/ Test async insert\n  useEffect\(\(\) => \{\n[\s\S]*?\}, \[\]\);\n/g;
code = code.replace(regex, '');

fs.writeFileSync('src/components/VimEditor.tsx', code);
