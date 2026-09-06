const fs = require('fs');
let code = fs.readFileSync('src/lib/vimCommands.ts', 'utf-8');

const regex = /const onInsert = \(newText: string\) => \{[\s\S]*?\n      \};\n      onAiCommand/;

const replacement = `const onInsert = (newText: string) => {
         try {
           if (cm.cm6) {
             const view = cm.cm6;
             const selection = view.state.selection.main;
             
             // ALERTS FOR MOBILE DEBUGGING
             if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
                 alert("AI Done! isSel: " + isSelection + " from: " + selection.from + " to: " + selection.to + " | newText: " + newText.substring(0, 10));
             }

             if (isSelection) {
               view.dispatch({
                 changes: { from: selection.from, to: selection.to, insert: newText },
                 selection: { anchor: selection.from + newText.length }
               });
             } else {
               view.dispatch({
                 changes: { from: selection.to, to: selection.to, insert: newText + '\\n' },
                 selection: { anchor: selection.to + newText.length + 1 }
               });
             }
             
             if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
                 alert("Dispatch success. Focusing...");
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
      };
      onAiCommand`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/lib/vimCommands.ts', code);
