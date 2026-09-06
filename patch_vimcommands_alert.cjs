const fs = require('fs');
let code = fs.readFileSync('src/lib/vimCommands.ts', 'utf-8');

const targetStr = `      const onInsert = (newText: string) => {
         try {
           if (cm.cm6) {`;

const replaceStr = `      const onInsert = (newText: string) => {
         try {
           if (cm.cm6) {
             if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
                 alert("onInsert called. cm6 available. newText length: " + newText.length);
             }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/lib/vimCommands.ts', code);
