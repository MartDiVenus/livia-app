const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `                  if (cm && Vim) {
                    view.contentDOM.focus();
                    (window as any).isVimHandling = true;
                    Vim.handleKey(cm, '<Esc>', 'mapping');
                    Vim.handleKey(cm, ':', 'mapping');
                    (window as any).isVimHandling = false;
                  }`;

const replaceStr = `                  if (cm && Vim) {
                    const cmd = window.prompt(lang === 'it' ? 'Inserisci comando Vim (es. w, q, tear local)' : 'Enter Vim command (e.g. w, q, tear local)');
                    if (cmd !== null) {
                       Vim.handleEx(cm, cmd);
                       view.contentDOM.focus();
                    }
                  }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/VimEditor.tsx', code);
