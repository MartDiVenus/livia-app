import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON body parsing for API requests
  app.use(express.json({ limit: "10mb" }));

  // Lazy-initialized Gemini client (supports default process.env or user-provided API key)
  function getGeminiClient(customApiKey?: string) {
    const apiKey = (customApiKey && customApiKey.trim() !== '') ? customApiKey.trim() : process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Manca la chiave Gemini API. Imposta la chiave nelle Impostazioni o nei Secret della piattaforma.");
    }
    return new GoogleGenAI({ apiKey });
  }

  // API Route for Gemini AI operations (translation, content prompting, latin generation, ping)
  app.post("/api/gemini/generate", async (req, res) => {
    const { action, text, targetLanguage, prompt, theme, modelTier, userApiKey, systemInstruction } = req.body;

    async function generateWithModelFallback(contents: string, sysInst?: string, configOverrides: any = {}): Promise<any> {
      // Clean up tier if it points to deprecated 2.5, 2.0, 1.5, or invalid 3.7
      let tier = (modelTier || 'flash').trim();
      if (tier.includes('2.5') || tier.includes('2.0') || tier.includes('1.5') || tier.includes('3.7')) {
        tier = 'flash';
      }

      // Valid models in current @google/genai SDK (per system guidelines)
      let modelsToTry: string[] = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      if (tier === 'flash-lite') {
        modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
      } else if (tier === 'pro' || tier === 'pro-thinking') {
        modelsToTry = ["gemini-3.1-pro-preview", "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      } else if (tier.startsWith('gemini-')) {
        modelsToTry = [tier, "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      }
      
      const clientsToTry: { client: any; isCustom: boolean }[] = [];
      if (userApiKey && userApiKey.trim() !== "") {
        clientsToTry.push({ client: getGeminiClient(userApiKey), isCustom: true });
      }
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "") {
        if (!userApiKey || userApiKey.trim() !== process.env.GEMINI_API_KEY.trim()) {
          clientsToTry.push({ client: getGeminiClient(process.env.GEMINI_API_KEY), isCustom: false });
        }
      }

      if (clientsToTry.length === 0) {
        throw new Error("Manca la chiave Gemini API. Imposta la chiave nei Secret della piattaforma o nelle Impostazioni dell'editor.");
      }

      let lastError: any = null;
      for (const { client, isCustom } of clientsToTry) {
        for (const m of modelsToTry) {
          try {
            const config = { ...(sysInst ? { systemInstruction: sysInst } : {}), ...configOverrides };
            const res = await client.models.generateContent({ model: m, contents, config });
            return { res, usedModel: m };
          } catch (err: any) {
            lastError = err;
            console.warn(`Attempt with ${isCustom ? 'custom key' : 'system Secret key'} and model ${m} failed:`, err?.message || err);
          }
        }
      }
      throw lastError || new Error("Gemini API non disponibile.");
    }

    try {
      if (action === "ping") {
        const { usedModel } = await generateWithModelFallback("Hello, reply with OK", undefined, { maxOutputTokens: 10 });
        return res.json({ result: "OK", status: "online", model: usedModel });
      }

      if (action === "translate") {
        const { res: response } = await generateWithModelFallback(`Translate the following text into ${targetLanguage || "Italian"}. Return ONLY the translated text. Maintain the original formatting, line breaks, and style as much as possible. Do not add any conversational intro/outro or explanations.\n\nText to translate:\n${text}`, systemInstruction);
        return res.json({ result: response.text });
      }

      if (action === "prompt") {
        const promptString = `You are an expert text and code assistant embedded inside LiViA Editor™, a lightweight text editor. 
Your task is to process the following text according to the user instructions: "${prompt}". 
If the instruction asks to rewrite, edit, clean, summarize, or refactor, return ONLY the resulting text. 
If the instruction is a question or request for information, output the answer cleanly formatted. 
Do not add meta-commentary unless requested.${text ? `\n\nOriginal text:\n${text}` : ''}`;
        
        const { res: response } = await generateWithModelFallback(promptString, systemInstruction);
        return res.json({ result: response.text });
      }

      if (action === "latin") {
        const searchTheme = theme && theme.trim() !== 'random' ? `themed around "${theme}"` : "completely random";
        const seed = Math.floor(Math.random() * 1000000);
        const { res: response } = await generateWithModelFallback(`Provide a famous or elegant Latin locution/phrase ${searchTheme}. 
This is random execution #${seed}. Please avoid the most common mainstream ones (like Carpe Diem, Veni Vidi Vici, or Alea Iacta Est) unless specifically requested. Choose something highly unique, profound, or rare from Latin literature, law, or philosophy.

Return the output in Italian, formatted exactly as a clean block of lines as follows:
Line 1: The Latin phrase (e.g., "Audentes fortuna iuvat")
Line 2: The Italian translation (e.g., "La fortuna aiuta gli audaci")
Line 3: Elegant, short context, historical origin, or philosophical commentary (max 2 sentences).

Make sure the response contains ONLY these three lines of clean text, with no extra markdown formatting, asterisks, or prefix tags (like "Line 1:"). Just the lines of text.`, systemInstruction, { temperature: 0.95 });
        return res.json({ result: response.text });
      }

      return res.status(400).json({ error: "Azione non supportata." });
    } catch (err: any) {
      console.error("Gemini API Error:", err.message);
      let errMsg = err.message || "";
      
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed.error && parsed.error.message) {
          errMsg = parsed.error.message;
        }
      } catch (e) {
        // Not JSON
      }

      const isCloudEnableError = 
        errMsg.includes("Generative Language API has not been used in project") || 
        errMsg.includes("it is disabled") || 
        errMsg.includes("SERVICE_DISABLED") || 
        errMsg.includes("has not been enabled") ||
        (errMsg.includes("PERMISSION_DENIED") && (errMsg.includes("generativelanguage") || errMsg.includes("Cloud")));

      if (isCloudEnableError) {
        errMsg = "L'API Generative Language (Gemini™) non è abilitata nel progetto Google Cloud associato alla tua chiave. Per abilitarla con 1 clic: 1) Visita https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com e clicca su 'Abilita' (Enable). Oppure 2) Crea una chiave gratuita da zero su https://aistudio.google.com/app/apikey selezionando 'Create API key in new project' (Crea in un nuovo progetto).";
      } else if (errMsg.includes("limit: 0") || errMsg.includes("limit:0")) {
        if (userApiKey && userApiKey.trim() !== "") {
          errMsg = "La tua API Key in Google AI Studio è associata a un progetto Google Cloud con Quota Gratuita impostata a 0 (limit: 0). Per risolvere: vai su https://aistudio.google.com/app/apikey, clicca su 'Create API key' e seleziona 'Create API key in new project' (Crea in un nuovo progetto). Poi copia la nuova chiave e incollala nelle Impostazioni dell'editor.";
        } else {
          errMsg = "La quota API predefinita del sistema ha raggiunto il limite (limit: 0). Inserisci la tua API Key personale nelle Impostazioni dell'editor (icona ingranaggio). Puoi ottenerla gratuitamente su https://aistudio.google.com/app/apikey selezionando 'Create API key in new project'.";
        }
      } else if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("prepayment credits") || errMsg.includes("Quota") || errMsg.includes("quota")) {
        if (userApiKey && userApiKey.trim() !== "") {
          errMsg = "Quota/Limite di frequenza raggiunto per la tua API Key personale su Google AI Studio. Attendi circa 30-60 secondi prima della prossima richiesta o passa a un modello più leggero (es. Flash o Flash-Lite).";
        } else {
          errMsg = "Quota Gemini API esaurita per la chiave di sistema condivisa. Inserisci la tua API Key personale nelle Impostazioni dell'editor (icona ingranaggio) per procedere senza limiti.";
        }
      } else if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("service is currently unavailable") || errMsg.includes("overloaded")) {
        errMsg = "Il modello Gemini API è attualmente impegnato o sovraccarico (errore 503/alta richiesta). Si prega di riprovare tra qualche secondo.";
      } else if (errMsg.includes("API key not valid") || errMsg.includes("INVALID_ARGUMENT") || errMsg.includes("401")) {
        errMsg = "Chiave API Gemini non valida. Verifica di aver copiato correttamente la chiave da Google AI Studio e reincollala nelle Impostazioni.";
      }

      return res.status(500).json({ 
        error: errMsg || "Errore durante la comunicazione con Gemini™ API."
      });
    }
  });

  // Diagnostic health check for Gemini API status and active configuration
  app.get("/api/gemini/status", async (req, res) => {
    const userApiKey = typeof req.query.key === 'string' ? req.query.key.trim() : undefined;
    const hasSystemKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
    const hasCustomKey = !!(userApiKey && userApiKey !== '');

    if (!hasSystemKey && !hasCustomKey) {
      return res.json({
        ok: false,
        error: "Nessuna chiave API Gemini configurata.",
        hasSystemKey: false,
        hasCustomKey: false
      });
    }

    try {
      const apiKeyToTest = hasCustomKey ? userApiKey : process.env.GEMINI_API_KEY;
      const client = new GoogleGenAI({ apiKey: apiKeyToTest! });
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
        return res.json({
          ok: true,
          model: activeModel,
          hasSystemKey,
          hasCustomKey,
          keySource: hasCustomKey ? 'custom' : 'system'
        });
      }

      throw lastErr;
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isCloudDisabled = 
        msg.includes("Generative Language API has not been used in project") || 
        msg.includes("it is disabled") || 
        msg.includes("SERVICE_DISABLED") ||
        (msg.includes("PERMISSION_DENIED") && msg.includes("generativelanguage"));

      return res.json({
        ok: false,
        error: msg,
        isCloudDisabled,
        cloudEnableUrl: "https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com",
        aiStudioUrl: "https://aistudio.google.com/app/apikey",
        hasSystemKey,
        hasCustomKey,
        keySource: hasCustomKey ? 'custom' : 'system'
      });
    }
  });

  // Dedicated route to download public PNG icons/banners directly as attachments

  // Server-side proxy for fetching URLs (to bypass CORS)
  app.get("/api/fetch-url", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).send("URL parameter is required");
      }
      const response = await fetch(targetUrl);
      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch: ${response.statusText}`);
      }
      const text = await response.text();
      res.send(text);
    } catch (e: any) {
      res.status(500).send(e.message || "Failed to fetch URL");
    }
  });

  app.get("/api/download-asset/:filename", (req, res) => {

    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(process.cwd(), "public", safeFilename);
    if (fs.existsSync(filePath) && (safeFilename.endsWith(".png") || safeFilename.endsWith(".svg"))) {
      res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
      res.setHeader("Content-Type", safeFilename.endsWith(".png") ? "image/png" : "image/svg+xml");
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } else {
      res.status(404).send("File non trovato.");
    }
  });

  // Dedicated route for Privacy Policy (for Google OAuth Verification Crawlers and direct access)
  app.get("/privacy", (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Informativa sulla Privacy - LiViA Editor™</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 2rem 1rem; background-color: #f9fafb; }
    .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    h1 { color: #111827; font-size: 1.75rem; margin-top: 0; margin-bottom: 0.5rem; }
    h2 { color: #059669; font-size: 1.25rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    p, li { font-size: 0.95rem; color: #374151; }
    a { color: #2563eb; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
    .footer-link { display: inline-block; margin-top: 1.5rem; padding: 0.5rem 1rem; background-color: #059669; color: white; border-radius: 6px; font-weight: bold; }
    .footer-link:hover { text-decoration: none; background-color: #047857; }
    .trademark-notice { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; font-size: 0.8rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="card">
    <h1>LiViA Editor™ - Informativa sulla Privacy (Privacy Policy)</h1>
    <p><strong>Ultimo aggiornamento: Luglio 2026</strong></p>
    
    <h2>1. Informazioni sull'Applicazione</h2>
    <p><strong>LiViA Editor™</strong> è un editor di testo e codice leggero in stile Vim. Consente la creazione, la modifica e l'esportazione di documenti (.txt, .md, .docx, .py, .kt, .tex) e si integra con Google Drive™ e Google Docs™ per permettere agli utenti di salvare e aprire i propri file in mobilità.</p>
    
    <h2>2. Utilizzo delle Credenziali Google OAuth e Dati Utente</h2>
    <p>L'applicazione richiede l'autorizzazione Google OAuth per consentire all'utente di selezionare, aprire e salvare file nel proprio account Google Drive™ o Google Docs™ personale.</p>
    <ul>
      <li>Nessun contenuto di documento né dato personale viene memorizzato su server terzi o esterni.</li>
      <li>I token di autorizzazione risiedono esclusivamente nel browser dell'utente e scadono al termine della sessione.</li>
      <li>LiViA Editor™ non vende, condivide o trasferisce informazioni personali a terze parti.</li>
    </ul>

    <h2>3. Revoca dell'Accesso</h2>
    <p>Gli utenti possono revocare l'accesso a Google Drive™ in qualsiasi momento dal menu di configurazione dell'applicazione o tramite le impostazioni di sicurezza dell'Account Google (<a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a>).</p>

    <h2>4. Contatti e Assistenza</h2>
    <p>Per domande o richieste di assistenza relative a LiViA Editor™, contattare il team all'indirizzo email:<br/>
    <a href="mailto:support-livia-editor@googlegroups.com"><strong>support-livia-editor@googlegroups.com</strong></a></p>

    <div class="trademark-notice">
      Google Drive™, Google Docs™, Google Workspace™ e Gemini™ sono marchi registrati di Google LLC.
    </div>

    <a href="/" class="footer-link">&larr; Torna alla Home Page di LiViA Editor™</a>
  </div>
</body>
</html>`);
  });

  // Route for Google Search Console / Cloud Domain Verification
  app.get("/google5d36529917d4e4e8.html", (req, res) => {
    res.send("google-site-verification: google5d36529917d4e4e8.html");
  });

  // Serve static UI and assets
  const distPath = path.join(process.cwd(), "dist");
  const isProd = process.env.NODE_ENV === "production" || fs.existsSync(path.join(distPath, "index.html"));

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Failed to start Vite middleware, falling back to static", e);
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  } else {
    app.use(express.static(distPath));
    // Serve index.html for React routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.get('/log-error', (req, res) => { console.log('BROWSER ERROR:', req.query.msg); res.send('ok'); });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server LiViA running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
