const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');
const searchStr = `                        if (cmd) {
                          Vim.handleEx(cm as any, cmd);
                        }`;
const repStr = `                        if (cmd) {
                          try {
                            Vim.handleEx(cm as any, cmd);
                          } catch(e) {
                            console.error('Vim handleEx error', e);
                            alert('Errore: ' + e.message);
                          }
                        }`;
code = code.replace(searchStr, repStr);
fs.writeFileSync('src/components/VimEditor.tsx', code);
