const fs = require('fs');
let code = fs.readFileSync('src/lib/vimCommands.ts', 'utf-8');

const targetStr = `      const onInsert = (newText: string) => {
         try {
           if (cm.cm6) {
             if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
                 alert("onInsert called. cm6 available. newText length: " + newText.length);
             }`;

const replaceStr = `      const onInsert = (newText: string) => {
         try {
           if (cm.cm6) {
             const view = cm.cm6;
             const selection = view.state.selection.main;
             if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
                 alert("onInsert called. from: " + selection.from + ", to: " + selection.to + ", isSel: " + isSelection);
             }
             if (isSelection) {
               view.dispatch({
                 changes: { from: selection.from, to: selection.to, insert: newText }
               });
             } else {
               view.dispatch({
                 changes: { from: selection.to, to: selection.to, insert: newText + '\\n' }
               });
             }
             if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
                 alert("dispatch completed");
             }`;

code = code.replace(targetStr, replaceStr);

// Also remove the old view dispatch blocks to avoid duplication
const targetStr2 = `             if (isSelection) {
               view.dispatch({
                 changes: { from: selection.from, to: selection.to, insert: newText }
               });
             } else {
               view.dispatch({
                 changes: { from: selection.to, to: selection.to, insert: newText + '\\n' }
               });
             }`;

// Only replace the second occurrence, or just manually rebuild the function:
