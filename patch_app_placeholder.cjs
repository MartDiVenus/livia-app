const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /const handleAiCommand = async \([\s\S]*?showToast\(lang === 'it' \? 'Fatto!' : 'Done!', 'success'\);\n    \} catch \(e: any\) \{/m;

const replacement = `const handleAiCommand = async (action: 'prompt' | 'translate' | 'latin', arg: string, textToProcess: string, isSelection: boolean, onInsert: (newText: string, isUpdate?: boolean) => void) => {
    try {
      const userApiKey = typeof window !== 'undefined' ? localStorage.getItem('livia_custom_gemini_key') || undefined : undefined;
      let systemInstruction: string | undefined = undefined;
      
      if (activeAiProfileId) {
        const profile = aiProfiles.find(p => p.id === activeAiProfileId);
        if (profile) systemInstruction = profile.instruction;
      }
      
      const payload: any = { action, text: textToProcess, userApiKey, systemInstruction };
      if (action === 'translate') payload.targetLanguage = arg;
      if (action === 'prompt') { payload.prompt = arg; payload.modelTier = typeof window !== 'undefined' ? localStorage.getItem('livia_gemini_model') || 'gemini-3.6-flash' : 'gemini-3.6-flash'; }
      if (action === 'latin') payload.theme = arg;
      
      showToast(lang === 'it' ? 'Elaborazione IA in corso...' : 'AI processing...', 'info');
      
      // Insert placeholder
      const placeholder = lang === 'it' ? '⏳ Elaborazione in corso...' : '⏳ Processing...';
      onInsert(placeholder, false);

      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json();
        onInsert("❌ Errore API: " + (errData.error || "Unknown"), true);
        throw new Error(errData.error || "Errore API Gemini");
      }
      const data = await res.json();
      onInsert(data.result || (lang === 'it' ? '⚠️ Nessun risultato.' : '⚠️ No result.'), true);
      showToast(lang === 'it' ? 'Fatto!' : 'Done!', 'success');
    } catch (e: any) {`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
