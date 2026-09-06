const fs = require('fs');
let code = fs.readFileSync('src/lib/vimCommands.ts', 'utf-8');

const regex = /const onInsert = \([\s\S]*?\}\n      \};/m;

const replacement = `const onInsert = (newText: string) => {
         try {
           const finalStr = newText || "";
           if (isSelection) {
             cm.replaceRange(finalStr, fromPos, toPos);
           } else {
             cm.replaceRange(finalStr + '\\n', toPos);
           }
           
           setTimeout(() => {
             if (cm.cm6) {
               cm.cm6.contentDOM.focus();
               
               // Move cursor to end of inserted text roughly
               const view = cm.cm6;
               const mainSel = view.state.selection.main;
               if (mainSel) {
                   view.dispatch({
                       selection: { anchor: mainSel.head, head: mainSel.head },
                       scrollIntoView: true
                   });
               }
             }
           }, 50);
         } catch(e: any) {
           console.error("Vim AI insert error", e);
           if (typeof window !== 'undefined') alert("Errore IA Insert: " + e.message);
           showFlashMessage("Errore insert: " + e.message);
         }
      };`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/lib/vimCommands.ts', code);
