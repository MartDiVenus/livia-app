const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `                        if (cmd) {
                          try {
                            Vim.handleEx(cm as any, cmd);
                          } catch(e) {
                            console.error('Vim handleEx error', e);
                            alert('Errore: ' + e.message);
                          }
                        }
                        setTimeout(() => {
                          if (editorRef.current?.view) {
                            editorRef.current.view.contentDOM.focus();
                          }
                        }, 50);`;

const replaceStr = `                        if (cmd) {
                          try {
                            Vim.handleEx(cm as any, cmd);
                          } catch(e) {
                            console.error('Vim handleEx error', e);
                            alert('Errore: ' + e.message);
                          }
                        }
                        // Do not forcefully regain focus if the command was 'help', to avoid virtual keyboard popping up
                        if (!cmd.toLowerCase().startsWith('help') && !cmd.toLowerCase().startsWith('h')) {
                          setTimeout(() => {
                            if (editorRef.current?.view) {
                              editorRef.current.view.contentDOM.focus();
                            }
                          }, 50);
                        }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/VimEditor.tsx', code);
