import { GoogleGenAI } from '@google/genai';

export async function testGeminiConnection(apiKey: string, lang: string = 'it'): Promise<any> {
  if (apiKey) {
    try {
      const client = new GoogleGenAI({ apiKey });
      const testModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      let activeModel = "gemini-3.8-flash";
      let succeeded = false;
      let lastErr: any = null;
      for (const m of testModels) {
        try {
          await client.models.generateContent({
            model: m,
            contents: "Ping",
            config: { maxOutputTokens: 5 }
          });
          activeModel = m;
          succeeded = true;
          break;
        } catch (e: any) {
          lastErr = e;
        }
      }
      if (succeeded) {
        return { ok: true, model: activeModel, hasCustomKey: true, modelTier: 'free' };
      }
      throw lastErr;
    } catch (e: any) {
      let errMsg = e.message || String(e);
      const isCloudDisabled = 
        errMsg.includes("Generative Language API has not been used in project") || 
        errMsg.includes("it is disabled") || 
        errMsg.includes("SERVICE_DISABLED") ||
        (errMsg.includes("PERMISSION_DENIED") && errMsg.includes("generativelanguage"));
      
      return { ok: false, error: errMsg, isCloudDisabled };
    }
  } else {
    // Fallback to server
    try {
      const res = await fetch("/api/gemini/status");
      const data = await res.json();
      return data;
    } catch (e: any) {
      if (e.message.includes('JSON') || e.message.includes('Unexpected token')) {
         return { ok: false, error: lang === 'it' ? "Non è possibile usare la chiave di default su questo hosting. Inserisci la tua API Key personale nel campo 'Personal Google Gemini API Key' delle Impostazioni." : "Cannot use default key on this hosting. Please insert your personal API Key in the 'Personal Google Gemini API Key' field in Settings." };
      }
      return { ok: false, error: e.message };
    }
  }
}

export async function generateGeminiContent(payload: any, lang: string = 'it'): Promise<any> {
  const customKey = localStorage.getItem('livia_custom_gemini_key') || '';
  if (customKey) {
    try {
      const client = new GoogleGenAI({ apiKey: customKey });
      
      const { action, text, targetLanguage, prompt, theme, modelTier, systemInstruction } = payload;

      let tier = (modelTier || 'flash').trim();
      if (tier.includes('2.5') || tier.includes('2.0') || tier.includes('1.5') || tier.includes('3.7')) {
        tier = 'flash';
      }

      let modelsToTry: string[] = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      if (tier === 'flash-lite') {
        modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
      } else if (tier === 'pro' || tier === 'pro-thinking') {
        modelsToTry = ["gemini-3.1-pro-preview", "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      } else if (tier.startsWith('gemini-')) {
        modelsToTry = [tier, "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      }

      let contents = "";
      let configOverrides: any = {};

      if (action === "ping") {
        contents = "Hello, reply with OK";
        configOverrides = { maxOutputTokens: 10 };
      } else if (action === "translate") {
        contents = `Translate the following text into ${targetLanguage || "Italian"}. Return ONLY the translated text. Maintain the original formatting, line breaks, and style as much as possible. Do not add any conversational intro/outro or explanations.\n\nText to translate:\n${text}`;
      } else if (action === "prompt") {
        contents = `You are an expert text and code assistant embedded inside LiViA Editor™, a lightweight text editor. \nYour task is to process the following text according to the user instructions: "${prompt}". \nIf the instruction asks to rewrite, edit, clean, summarize, or refactor, return ONLY the resulting text. \nIf the instruction is a question or request for information, output the answer cleanly formatted. \nDo not add meta-commentary unless requested.${text ? `\n\nOriginal text:\n${text}` : ''}`;
      } else if (action === "latin") {
        const searchTheme = theme && theme.trim() !== 'random' ? `themed around "${theme}"` : "completely random";
        const seed = Math.floor(Math.random() * 1000000);
        contents = `Provide a famous or elegant Latin locution/phrase ${searchTheme}. \nThis is random execution #${seed}. Please avoid the most common mainstream ones (like Carpe Diem, Veni Vidi Vici, or Alea Iacta Est) unless specifically requested. Choose something highly unique, profound, or rare from Latin literature, law, or philosophy.\n\nReturn the output in Italian, formatted exactly as a clean block of lines as follows:\nLine 1: The Latin phrase (e.g., "Audentes fortuna iuvat")\nLine 2: The Italian translation (e.g., "La fortuna aiuta gli audaci")\nLine 3: Elegant, short context, historical origin, or philosophical commentary (max 2 sentences).\n\nMake sure the response contains ONLY these three lines of clean text, with no extra markdown formatting, asterisks, or prefix tags (like "Line 1:"). Just the lines of text.`;
        configOverrides = { temperature: 0.95 };
      } else {
        throw new Error("Azione non supportata.");
      }

      let lastError: any = null;
      let usedModel = "";
      let response: any = null;

      for (const m of modelsToTry) {
        try {
          const config = { ...(systemInstruction ? { systemInstruction } : {}), ...configOverrides };
          response = await client.models.generateContent({ model: m, contents, config });
          usedModel = m;
          break;
        } catch (e) {
          lastError = e;
        }
      }

      if (response) {
        if (action === "ping") {
          return { result: "OK", status: "online", model: usedModel };
        }
        return { result: response.text };
      }

      throw lastError || new Error("Errore generazione IA");
    } catch (err: any) {
      console.error("Gemini API Error (Client):", err.message);
      let errMsg = err.message || "";
      
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed.error && parsed.error.message) {
          errMsg = parsed.error.message;
        }
      } catch (e) {}

      const isCloudEnableError = 
        errMsg.includes("Generative Language API has not been used in project") || 
        errMsg.includes("it is disabled") || 
        errMsg.includes("SERVICE_DISABLED") || 
        errMsg.includes("has not been enabled") ||
        (errMsg.includes("PERMISSION_DENIED") && (errMsg.includes("generativelanguage") || errMsg.includes("Cloud")));

      if (isCloudEnableError) {
        errMsg = "L'API Generative Language (Gemini™) non è abilitata nel progetto Google Cloud associato alla tua chiave. Per abilitarla con 1 clic: 1) Visita https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com e clicca su 'Abilita' (Enable). Oppure 2) Crea una chiave gratuita da zero su https://aistudio.google.com/app/apikey selezionando 'Create API key in new project' (Crea in un nuovo progetto). Poi copia la nuova chiave e incollala nelle Impostazioni dell'editor.";
      } else if (errMsg.includes("limit: 0") || errMsg.includes("limit:0")) {
        errMsg = "La tua API Key in Google AI Studio è associata a un progetto Google Cloud con Quota Gratuita impostata a 0 (limit: 0). Per risolvere: vai su https://aistudio.google.com/app/apikey, clicca su 'Create API key' e seleziona 'Create API key in new project' (Crea in un nuovo progetto). Poi copia la nuova chiave e incollala nelle Impostazioni dell'editor.";
      } else if (errMsg.includes("Quota") || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("exhausted")) {
        errMsg = "Hai superato il limite di richieste (Quota Exceeded). Attendi qualche minuto e riprova.";
      } else if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("service is currently unavailable") || errMsg.includes("overloaded")) {
        errMsg = "Il modello Gemini API è attualmente impegnato o sovraccarico (errore 503/alta richiesta). Si prega di riprovare tra qualche secondo.";
      } else if (errMsg.includes("API key not valid") || errMsg.includes("INVALID_ARGUMENT") || errMsg.includes("401")) {
        errMsg = "Chiave API Gemini non valida. Verifica di aver copiato correttamente la chiave da Google AI Studio e reincollala nelle Impostazioni.";
      }
      throw new Error(errMsg || "Errore durante la comunicazione con Gemini™ API.");
    }
  } else {
    // Fallback to server side api
    try {
      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        let errData: any = {};
        try { errData = await res.json(); } catch(e){}
        const errMsg = errData.error || res.statusText || (lang === 'it' ? 'Errore generazione IA' : 'AI Generation Error');
        throw new Error(errMsg);
      }
      
      return await res.json();
    } catch (err: any) {
       if (err.message.includes('JSON') || err.message.includes('Unexpected token')) {
         throw new Error(lang === 'it' ? "Non è possibile usare l'intelligenza artificiale senza una chiave API su questo hosting. Inserisci la tua API Key personale nelle impostazioni." : "Cannot use AI without an API Key on this hosting. Please insert your personal API Key in settings.");
       }
       throw err;
    }
  }
}
