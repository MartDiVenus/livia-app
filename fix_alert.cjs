const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(/if \\(typeof window !== 'undefined' && innerE\\.message && !innerE\\.message\\.includes\\('API Gemini'\\)\\) alert\\("Errore Imprevisto: " \\+ innerE\\.message\\);/g, "");
fs.writeFileSync('src/App.tsx', code);
