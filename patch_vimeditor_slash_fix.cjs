const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `                   } else if (key === '/') {
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
                     }`;

const replaceStr = `                   } else if (key === '/') {
                     // Open the native CodeMirror Vim search dialog directly
                     Vim.handleKey(cm, '/', 'mapping');
                     
                     // Immediately fix the input attributes to prevent Gboard password suggestions
                     // and remove the ugly "(javascript regexp)" label text
                     setTimeout(() => {
                        const vimInputs = document.querySelectorAll('.cm-vim-panel input, .cm-panel input');
                        vimInputs.forEach(input => {
                           input.setAttribute('autocomplete', 'off');
                           input.setAttribute('autocorrect', 'off');
                           input.setAttribute('autocapitalize', 'off');
                           input.setAttribute('spellcheck', 'false');
                           input.setAttribute('data-form-type', 'other');
                           // Find the label text node and remove "javascript regexp"
                           const parent = input.parentElement;
                           if (parent) {
                              parent.childNodes.forEach(node => {
                                 if (node.nodeType === 3) {
                                    let text = node.textContent || '';
                                    if (text.toLowerCase().includes('regexp')) {
                                       node.textContent = text.replace(/\\(.*?regexp.*?\\)/i, '').replace(/javascript regexp/i, '').replace(/regexp/i, '');
                                    }
                                 }
                              });
                           }
                        });
                     }, 10);`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/VimEditor.tsx', code);
