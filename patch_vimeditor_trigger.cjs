const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `                if (cm && Vim) {
                   Vim.handleKey(cm, key, 'mapping');
                }`;

const replaceStr = `                if (cm && Vim) {
                   if (key === ':') {
                     const cmd = window.prompt(lang === 'it' ? 'Inserisci comando Vim (es. w, q, tear local)' : 'Enter Vim command (e.g. w, q, tear local)');
                     if (cmd !== null) {
                        Vim.handleEx(cm as any, cmd);
                        editorRef.current.view.contentDOM.focus();
                     }
                   } else {
                     Vim.handleKey(cm, key, 'mapping');
                   }
                }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/VimEditor.tsx', code);
