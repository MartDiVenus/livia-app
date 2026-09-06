const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `                     }
                   } else {
                     Vim.handleKey(cm, key, 'mapping');
                   }`;

const replaceStr = `                     }
                   } else if (key === '/') {
                     let query = window.prompt(lang === 'it' ? 'Cerca (regexp):' : 'Search (regexp):');
                     if (query !== null && query.trim() !== '') {
                        // Open search dialog
                        Vim.handleKey(cm, '/', 'mapping');
                        // Find the vim dialog input and simulate typing
                        setTimeout(() => {
                           const vimInput = document.querySelector('.cm-vim-panel input');
                           if (vimInput) {
                             vimInput.value = query;
                             vimInput.dispatchEvent(new Event('input', { bubbles: true }));
                             vimInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
                           }
                           if (editorRef.current?.view) {
                             editorRef.current.view.contentDOM.focus();
                           }
                        }, 10);
                     }
                   } else {
                     Vim.handleKey(cm, key, 'mapping');
                   }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/VimEditor.tsx', code);
