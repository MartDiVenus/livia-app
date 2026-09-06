const fs = require('fs');
let code = fs.readFileSync('src/lib/vimCommands.ts', 'utf-8');

const regexType1 = /onAiCommand\?: \(type: 'prompt' \| 'translate' \| 'latin', arg: string, textToProcess: string, isSelection: boolean, onInsert: \(newText: string\) => void\) => void;/g;
code = code.replace(regexType1, "onAiCommand?: (type: 'prompt' | 'translate' | 'latin', arg: string, textToProcess: string, isSelection: boolean, onInsert: (newText: string, isUpdate?: boolean) => void) => void;");

const regexType2 = /const handleAiCommand = \(type: 'prompt' \| 'translate' \| 'latin', cm: any, arg: string\) => \{\n    if \(onAiCommand\) \{\n      const isSelection = cm\.somethingSelected\(\);\n      const textToProcess = isSelection \? cm\.getSelection\(\) : cm\.getValue\(\);\n      \n      \/\/ Capture cursor position \*before\* async fetch\n      const fromPos = cm\.getCursor\('from'\);\n      const toPos = cm\.getCursor\('to'\);\n\n      const onInsert = \(newText: string\) => \{/m;

const replacement2 = `const handleAiCommand = (type: 'prompt' | 'translate' | 'latin', cm: any, arg: string) => {
    if (onAiCommand) {
      const isSelection = cm.somethingSelected();
      const textToProcess = isSelection ? cm.getSelection() : cm.getValue();
      
      // Capture cursor position *before* async fetch
      let fromPos = cm.getCursor('from');
      let toPos = cm.getCursor('to');
      let placeholderLength = 0;

      const onInsert = (newText: string, isUpdate?: boolean) => {
         try {
           const finalStr = newText || "";
           
           if (isUpdate) {
               // We replace the placeholder we previously inserted
               const pFrom = isSelection ? fromPos : toPos;
               const pTo = { line: pFrom.line, ch: pFrom.ch + placeholderLength };
               cm.replaceRange(finalStr + (isSelection ? "" : "\\n"), pFrom, pTo);
           } else {
               // Initial insertion of placeholder
               if (isSelection) {
                 cm.replaceRange(finalStr, fromPos, toPos);
               } else {
                 cm.replaceRange(finalStr, toPos);
               }
               placeholderLength = finalStr.length;
           }
           
           setTimeout(() => {
             if (cm.cm6) {
               cm.cm6.contentDOM.focus();
               
               // Move cursor to end of inserted text roughly
               const view = cm.cm6;
               const mainSel = view.state.selection.main;
               if (mainSel && isUpdate) {
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

code = code.replace(regexType2, replacement2);
fs.writeFileSync('src/lib/vimCommands.ts', code);
