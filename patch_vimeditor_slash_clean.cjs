const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `                   } else if (key === '/') {
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
                     }, 10);
                   } else {`;

const replaceStr = `                   } else {`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/VimEditor.tsx', code);
