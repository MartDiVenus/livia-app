const fs = require('fs');
let code = fs.readFileSync('src/lib/vimCommands.ts', 'utf-8');

const regex = /const handleAiCommand = \([\s\S]*?onAiCommand\(\w+, arg, textToProcess, isSelection, onInsert\);\n    \}\n  \};/m;

const replacement = `const handleAiCommand = (type: 'prompt' | 'translate' | 'latin', cm: any, arg: string) => {
    if (onAiCommand) {
      const isSelection = cm.somethingSelected();
      const textToProcess = isSelection ? cm.getSelection() : cm.getValue();
      
      // Capture cursor position *before* async fetch
      const fromPos = cm.getCursor('from');
      const toPos = cm.getCursor('to');

      const onInsert = (newText: string) => {
         try {
           if (isSelection) {
             cm.replaceRange(newText, fromPos, toPos);
           } else {
             cm.replaceRange(newText + '\\n', toPos);
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
           showFlashMessage("Errore insert: " + e.message);
         }
      };
      onAiCommand(type, arg, textToProcess, isSelection, onInsert);
    }
  };`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/lib/vimCommands.ts', code);
