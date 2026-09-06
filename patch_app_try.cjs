const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /      const placeholder = lang === 'it' \? '⏳ Elaborazione in corso\.\.\.' : '⏳ Processing\.\.\.';\n      onInsert\(placeholder, false\);\n\n      const res = await fetch\("\/api\/gemini\/generate", \{\n        method: "POST",\n        headers: \{ "Content-Type": "application\/json" \},\n        body: JSON.stringify\(payload\)\n      \}\);\n      if \(\!res.ok\) \{\n        const errData = await res.json\(\);\n        onInsert\("❌ Errore API: " \+ \(errData.error \|\| "Unknown"\), true\);\n        throw new Error\(errData.error \|\| "Errore API Gemini"\);\n      \}\n      const data = await res.json\(\);\n      onInsert\(data.result \|\| \(lang === 'it' \? '⚠️ Nessun risultato.' : '⚠️ No result.'\), true\);\n      showToast\(lang === 'it' \? 'Fatto!' : 'Done!', 'success'\);\n    \} catch \(e: any\) \{/m;

const replacement = `      const placeholder = lang === 'it' ? '⏳ Elaborazione in corso...' : '⏳ Processing...';
      onInsert(placeholder, false);
      let replaced = false;

      try {
          const res = await fetch("/api/gemini/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            let errData = {};
            try { errData = await res.json(); } catch(err){}
            onInsert("❌ Errore API: " + (errData.error || res.statusText || "Unknown"), true);
            replaced = true;
            throw new Error(errData.error || "Errore API Gemini");
          }
          const data = await res.json();
          onInsert(data.result || (lang === 'it' ? '⚠️ Nessun risultato.' : '⚠️ No result.'), true);
          replaced = true;
          showToast(lang === 'it' ? 'Fatto!' : 'Done!', 'success');
      } catch (innerE: any) {
          if (!replaced) {
             onInsert("❌ Errore di connessione o timeout: " + innerE.message, true);
          }
          throw innerE;
      }
    } catch (e: any) {`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
