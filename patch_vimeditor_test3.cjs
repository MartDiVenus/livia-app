const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `                        // Async test
                        if (cmd === 'testasync') {
                           setTimeout(() => {
                              try {
                                 cm.replaceSelection("ASYNC TEST RESULT\\n");
                              } catch(e) {
                                 alert("Async insert error: " + e.message);
                              }
                           }, 2000);
                        }`;

const replaceStr = `                        // Async test
                        if (cmd === 'testasync') {
                           setTimeout(() => {
                              try {
                                 cm.operation(() => {
                                   cm.replaceSelection("ASYNC TEST RESULT\\n");
                                 });
                                 cm.scrollIntoView(cm.getCursor());
                              } catch(e) {
                                 alert("Async insert error: " + e.message);
                              }
                           }, 2000);
                        }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/VimEditor.tsx', code);
