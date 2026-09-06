const fs = require('fs');
let code = fs.readFileSync('src/lib/vimCommands.ts', 'utf-8');

code = code.replace(
`               const pFrom = isSelection ? fromPos : toPos;
               const pTo = { line: pFrom.line, ch: pFrom.ch + placeholderLength };
               cm.replaceRange(finalStr + (isSelection ? "" : "\\n"), pFrom, pTo);`,
`               const pFrom = isSelection ? fromPos : toPos;
               const pTo = { line: pFrom.line, ch: pFrom.ch + placeholderLength };
               try {
                   cm.replaceRange(finalStr + (isSelection ? "" : "\\n"), pFrom, pTo);
               } catch (err: any) {
                   if (typeof window !== 'undefined') alert("Errore replaceRange: " + err.message);
               }`
);

fs.writeFileSync('src/lib/vimCommands.ts', code);
