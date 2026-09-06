const fs = require('fs');
let code = fs.readFileSync('src/lib/vimCommands.ts', 'utf-8');
code = code.replace(/if \\(typeof window !== 'undefined'\\) alert\\("Errore replaceRange: " \\+ err\\.message\\);/g, "console.error('replaceRange failed:', err);");
code = code.replace(/if \\(typeof window !== 'undefined'\\) alert\\("Errore IA Insert: " \\+ e\\.message\\);/g, "");
fs.writeFileSync('src/lib/vimCommands.ts', code);
