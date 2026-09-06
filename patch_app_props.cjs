const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `            showLineNumbers={showLineNumbers}
            wordWrap={wordWrap}`;

const replaceStr = `            showLineNumbers={showLineNumbers}
            setShowLineNumbers={setShowLineNumbers}
            wordWrap={wordWrap}`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('src/App.tsx', code);
