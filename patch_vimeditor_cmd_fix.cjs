const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `                    const cmd = window.prompt(lang === 'it' ? 'Inserisci comando Vim (es. w, q, tear local)' : 'Enter Vim command (e.g. w, q, tear local)');
                    if (cmd !== null) {
                       Vim.handleEx(cm as any, cmd);
                       view.contentDOM.focus();
                    }`;

const replaceStr = `                    let cmd = window.prompt(lang === 'it' ? 'Inserisci comando Vim (es. w, q, tear local)' : 'Enter Vim command (e.g. w, q, tear local)');
                    if (cmd !== null) {
                       cmd = cmd.trim();
                       if (cmd.startsWith(':')) {
                         cmd = cmd.substring(1).trim();
                       }
                       if (cmd) {
                         try {
                           Vim.handleEx(cm as any, cmd);
                         } catch(e) {
                           console.error('Vim handleEx error', e);
                           alert('Errore: ' + e.message);
                         }
                       }
                       if (!cmd.toLowerCase().startsWith('help') && !cmd.toLowerCase().startsWith('h')) {
                         setTimeout(() => {
                           if (editorRef.current?.view) {
                             editorRef.current.view.contentDOM.focus();
                           }
                         }, 50);
                       }
                    }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/VimEditor.tsx', code);
