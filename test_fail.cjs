const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /const res = await fetch\("\/api\/gemini\/generate", \{/m;
const replacement = `throw new Error("MOCK IMMEDIATELY FAILING FETCH");\n          const res = await fetch("/api/gemini/generate", {`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
