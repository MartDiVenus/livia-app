const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `  showLineNumbers,
  wordWrap,`;

const replaceStr = `  showLineNumbers,
  setShowLineNumbers,
  wordWrap,`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/VimEditor.tsx', code);
