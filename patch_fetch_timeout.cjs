const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /      try \{\n          const res = await fetch\("\/api\/gemini\/generate", \{\n            method: "POST",\n            headers: \{ "Content-Type": "application\/json" \},\n            body: JSON.stringify\(payload\)\n          \}\);/m;

const replacement = `      try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
          
          const res = await fetch("/api/gemini/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          clearTimeout(timeoutId);`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
