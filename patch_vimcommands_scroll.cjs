const fs = require('fs');
let code = fs.readFileSync('src/lib/vimCommands.ts', 'utf-8');

const targetStr = `      const onInsert = (newText: string) => {
         if (isSelection) {
           cm.replaceSelection(newText);
         } else {
           cm.replaceSelection(newText + '\\n');
         }
      };`;

const replaceStr = `      const onInsert = (newText: string) => {
         if (isSelection) {
           cm.replaceSelection(newText);
         } else {
           cm.replaceSelection(newText + '\\n');
         }
         setTimeout(() => {
           const pos = cm.getCursor();
           cm.scrollIntoView(pos);
         }, 50);
      };`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/lib/vimCommands.ts', code);
