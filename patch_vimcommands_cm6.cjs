const fs = require('fs');
let code = fs.readFileSync('src/lib/vimCommands.ts', 'utf-8');

const targetStr = `      const onInsert = (newText: string) => {
         cm.operation(() => {
           if (isSelection) {
             cm.replaceSelection(newText);
           } else {
             cm.replaceSelection(newText + '\\n');
           }
         });
         setTimeout(() => {
           const pos = cm.getCursor();
           cm.scrollIntoView(pos);
         }, 50);
      };`;

const replaceStr = `      const onInsert = (newText: string) => {
         try {
           if (cm.cm6) {
             // Use native CodeMirror 6 dispatch
             const view = cm.cm6;
             const selection = view.state.selection.main;
             if (isSelection) {
               view.dispatch({
                 changes: { from: selection.from, to: selection.to, insert: newText }
               });
             } else {
               view.dispatch({
                 changes: { from: selection.to, to: selection.to, insert: newText + '\\n' }
               });
             }
           } else {
             if (isSelection) {
               cm.replaceSelection(newText);
             } else {
               cm.replaceSelection(newText + '\\n');
             }
           }
           
           setTimeout(() => {
             if (cm.cm6) {
               cm.cm6.contentDOM.focus();
             }
           }, 50);
         } catch(e: any) {
           console.error("Vim AI insert error", e);
           showFlashMessage("Errore insert: " + e.message);
         }
      };`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/lib/vimCommands.ts', code);
