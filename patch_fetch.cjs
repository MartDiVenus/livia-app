const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace 15000 with 60000
code = code.replace(/15000\); \/\/ 15s timeout/g, "60000); // 60s timeout");

// Add more robust error handling
code = code.replace(/catch \(innerE: any\) \{/g, `catch (innerE: any) {
          console.error("Fetch Error:", innerE);`);

// In the outer catch, add alert for debugging on mobile
code = code.replace(/catch \(e: any\) \{\n      showToast\(e.message/g, `catch (e: any) {
      if (typeof window !== 'undefined' && e.message && !e.message.includes('API Gemini')) alert("Errore Imprevisto: " + e.message);
      showToast(e.message`);

fs.writeFileSync('src/App.tsx', code);
