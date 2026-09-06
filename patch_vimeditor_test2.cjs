const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `                        if (!cmd.toLowerCase().startsWith('help') && !cmd.toLowerCase().startsWith('h')) {
                          setTimeout(() => {
                            if (editorRef.current?.view) {
                              editorRef.current.view.contentDOM.focus();
                            }
                          }, 50);
                        }`;

const replaceStr = `                        if (!cmd.toLowerCase().startsWith('help') && !cmd.toLowerCase().startsWith('h')) {
                          setTimeout(() => {
                            if (editorRef.current?.view) {
                              editorRef.current.view.contentDOM.focus();
                            }
                          }, 50);
                        }
                        
                        // Async test
                        if (cmd === 'testasync') {
                           setTimeout(() => {
                              try {
                                 cm.replaceSelection("ASYNC TEST RESULT\\n");
                              } catch(e) {
                                 alert("Async insert error: " + e.message);
                              }
                           }, 2000);
                        }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/VimEditor.tsx', code);
