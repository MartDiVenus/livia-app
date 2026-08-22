/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Sparkles, 
  ExternalLink, 
  Check, 
  Trash2, 
  Eye, 
  EyeOff, 
  Settings, 
  Globe, 
  Hash, 
  Code,
  Sliders
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'it' | 'en';
  setLang: (lang: 'it' | 'en') => void;
  showLineNumbers: boolean;
  setShowLineNumbers: (val: boolean) => void;
  syntaxHighlightOn: boolean;
  setSyntaxHighlightOn: (val: boolean) => void;
  editorFontSize: number;
  setEditorFontSize: (val: number) => void;
  showToast: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  lang,
  setLang,
  showLineNumbers,
  setShowLineNumbers,
  syntaxHighlightOn,
  setSyntaxHighlightOn,
  editorFontSize,
  setEditorFontSize,
  showToast,
}: SettingsModalProps) {
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [defaultModel, setDefaultModel] = useState<'flash' | 'pro'>('flash');

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('livia_custom_gemini_key') || '';
      setApiKeyInput(savedKey);
      const savedModel = (localStorage.getItem('livia_default_model') as 'flash' | 'pro') || 'flash';
      setDefaultModel(savedModel);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      localStorage.setItem('livia_custom_gemini_key', trimmed);
      showToast(
        lang === 'it' 
          ? 'Chiave API Gemini personale salvata nel browser!' 
          : 'Personal Gemini API Key saved locally!',
        'success'
      );
    } else {
      localStorage.removeItem('livia_custom_gemini_key');
      showToast(
        lang === 'it' 
          ? 'Chiave API Gemini rimossa. Verrà usata la chiave di default.' 
          : 'Custom Gemini API Key removed. Default key will be used.',
        'info'
      );
    }
  };

  const handleClearApiKey = () => {
    setApiKeyInput('');
    localStorage.removeItem('livia_custom_gemini_key');
    showToast(
      lang === 'it' 
        ? 'Chiave API personalizzata rimossa con successo.' 
        : 'Custom API Key successfully removed.',
      'info'
    );
  };

  const handleModelChange = (model: 'flash' | 'pro') => {
    setDefaultModel(model);
    localStorage.setItem('livia_default_model', model);
    showToast(
      lang === 'it'
        ? `Modello AI predefinito impostato su Gemini ${model.toUpperCase()}`
        : `Default AI model set to Gemini ${model.toUpperCase()}`,
      'info'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#2D2D2D] bg-gray-50/50 dark:bg-[#0D0F12]/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                {lang === 'it' ? 'Impostazioni LiViA & API Gemini' : 'LiViA Settings & Gemini API'}
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                {lang === 'it' ? 'Personalizza l\'editor e collega le tue chiavi' : 'Customize editor & connect your keys'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-4 overflow-y-auto text-xs leading-relaxed text-gray-700 dark:text-zinc-300">
          {/* Sezione 1: Chiave API Gemini personale */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-blue-800 dark:text-[#8AB4F8] flex items-center gap-1.5 text-xs">
                <Key size={14} className="text-blue-500" />
                <span>{lang === 'it' ? 'Chiave API Google Gemini™ Personale' : 'Personal Google Gemini™ API Key'}</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold">
                {apiKeyInput ? (lang === 'it' ? 'Attiva (Utente)' : 'Active (User)') : (lang === 'it' ? 'Default' : 'Default')}
              </span>
            </div>

            <p className="text-[11px] text-gray-600 dark:text-zinc-300 leading-relaxed font-sans">
              {lang === 'it'
                ? "Tutti i titolari di un account Google (inclusi gli abbonati Google One™ AI Premium / Gemini Advanced™) possono generare gratuitamente la propria API Key personale su Google AI Studio™ per risposte veloci e il modello Gemini™ Pro con quota dedicata. L'uso delle API Key attinge al Free Tier developer e non intacca in alcun modo la tua chat web Gemini™ o NotebookLM™."
                : "All Google account holders (including Google One™ AI Premium / Gemini Advanced™ subscribers) can generate a free personal API key on Google AI Studio™ for high-speed AI responses and dedicated Gemini™ Pro quotas. API usage runs on the developer Free Tier and does not affect your Gemini™ web chat or NotebookLM™ limits."}
            </p>

            {/* Input Form */}
            <div className="space-y-2">
              <div className="relative flex items-center">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full pl-3 pr-10 py-2 rounded-xl bg-white dark:bg-[#0D0F12] border border-gray-300 dark:border-[#2D2D2D] text-gray-900 dark:text-zinc-100 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer"
                  title={showApiKey ? "Nascondi" : "Mostra"}
                >
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Check size={14} />
                  <span>{lang === 'it' ? 'Salva Chiave' : 'Save Key'}</span>
                </button>

                {apiKeyInput && (
                  <button
                    type="button"
                    onClick={handleClearApiKey}
                    className="py-1.5 px-3 rounded-xl bg-gray-100 hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-950/30 text-gray-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 border border-gray-200 dark:border-zinc-700"
                  >
                    <Trash2 size={14} />
                    <span>{lang === 'it' ? 'Rimuovi' : 'Remove'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 1-Click Link to Google AI Studio™ */}
            <div className="pt-1 space-y-1.5">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <Sparkles size={14} className="text-emerald-500" />
                <span>
                  {lang === 'it'
                    ? '1-Click: Ottieni Chiave API Gratuita (Google AI Studio™)'
                    : '1-Click: Get Free API Key (Google AI Studio™)'}
                </span>
                <ExternalLink size={12} />
              </a>

              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-1.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 font-bold text-[11px] transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <ExternalLink size={12} />
                <span>
                  {lang === 'it'
                    ? '📊 Controlla Consumi e Quota Crediti (Google AI Studio™)'
                    : '📊 Check Usage & Credit Quotas (Google AI Studio™)'}
                </span>
              </a>

              <p className="text-[10px] text-gray-500 dark:text-zinc-400 bg-white dark:bg-[#0D0F12] p-2 rounded-lg border border-gray-200 dark:border-zinc-800 leading-relaxed">
                💡 <strong>{lang === 'it' ? 'Guida Rapida AI Studio™ & Consumi:' : 'AI Studio™ Quick Guide & Usage Stats:'}</strong><br />
                {lang === 'it'
                  ? '• Progetto: Seleziona "Default Gemini Project" per la creazione 1-Click (universale per utenti e sviluppatori).\n• Statistiche: I consumi su Google AI Studio™ tracciano solo le chiamate API sviluppatore (es. LiViA, SDK) e NON la chat web Gemini™, NotebookLM™ o Google One™ AI Premium.'
                  : '• Project: Select "Default Gemini Project" for 1-Click creation (universal for end users and developers).\n• Stats: Usage on Google AI Studio™ strictly tracks developer API calls (e.g. LiViA, SDKs), not web chat, NotebookLM™ or Google One™ AI Premium.'}
              </p>
            </div>
          </div>

          {/* Sezione 2: Modello AI Predefinito */}
          <div className="bg-gray-50 dark:bg-[#0D0F12] border border-gray-200/80 dark:border-[#2D2D2D] rounded-xl p-3.5 space-y-2">
            <span className="font-bold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5 text-xs">
              <Sparkles size={14} className="text-amber-500" />
              {lang === 'it' ? 'Modello Gemini Predefinito:' : 'Default Gemini Model:'}
            </span>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <button
                type="button"
                onClick={() => handleModelChange('flash')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                  defaultModel === 'flash'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-[#8AB4F8] font-bold'
                    : 'bg-white dark:bg-[#16181D] border-gray-200 dark:border-[#2D2D2D] text-gray-600 dark:text-zinc-400'
                }`}
              >
                <span className="text-xs font-bold flex items-center justify-between">
                  <span>Gemini Flash</span>
                  {defaultModel === 'flash' && <Check size={12} />}
                </span>
                <span className="text-[10px] text-gray-400 font-sans font-normal">
                  {lang === 'it' ? 'Velocità istantanea (Free)' : 'Instant speed (Free)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleModelChange('pro')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                  defaultModel === 'pro'
                    ? 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300 font-bold'
                    : 'bg-white dark:bg-[#16181D] border-gray-200 dark:border-[#2D2D2D] text-gray-600 dark:text-zinc-400'
                }`}
              >
                <span className="text-xs font-bold flex items-center justify-between">
                  <span>Gemini Pro</span>
                  {defaultModel === 'pro' && <Check size={12} />}
                </span>
                <span className="text-[10px] text-gray-400 font-sans font-normal">
                  {lang === 'it' ? 'Ragionamento profondo' : 'Deep reasoning'}
                </span>
              </button>
            </div>
          </div>

          {/* Sezione 3: Preferenze Interfaccia */}
          <div className="bg-gray-50 dark:bg-[#0D0F12] border border-gray-200/80 dark:border-[#2D2D2D] rounded-xl p-3.5 space-y-3">
            <span className="font-bold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5 text-xs">
              <Sliders size={14} className="text-emerald-500" />
              {lang === 'it' ? 'Preferenze Editor & Vista:' : 'Editor & Display Preferences:'}
            </span>

            <div className="space-y-2 text-xs">
              {/* Lingua */}
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-[#2D2D2D]">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-zinc-300 font-medium">
                  <Globe size={14} className="text-blue-500" />
                  {lang === 'it' ? 'Lingua dell\'Interfaccia:' : 'Interface Language:'}
                </span>
                <div className="flex items-center bg-gray-200/60 dark:bg-zinc-800 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setLang('it')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      lang === 'it' ? 'bg-emerald-600 text-white' : 'text-gray-500 dark:text-zinc-400'
                    }`}
                  >
                    IT
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('en')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      lang === 'en' ? 'bg-emerald-600 text-white' : 'text-gray-500 dark:text-zinc-400'
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>

              {/* Numeri di riga */}
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-[#2D2D2D]">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-zinc-300 font-medium">
                  <Hash size={14} className="text-purple-500" />
                  {lang === 'it' ? 'Numeri di Riga (:set number):' : 'Line Numbers (:set number):'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowLineNumbers(!showLineNumbers)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    showLineNumbers 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                  }`}
                >
                  {showLineNumbers ? (lang === 'it' ? 'ATTIVI' : 'ON') : (lang === 'it' ? 'DISATTIVI' : 'OFF')}
                </button>
              </div>

              {/* Evidenziazione sintassi */}
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-[#2D2D2D]">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-zinc-300 font-medium">
                  <Code size={14} className="text-amber-500" />
                  {lang === 'it' ? 'Sintassi Colore (:set syntax):' : 'Syntax Color (:set syntax):'}
                </span>
                <button
                  type="button"
                  onClick={() => setSyntaxHighlightOn(!syntaxHighlightOn)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    syntaxHighlightOn 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                  }`}
                >
                  {syntaxHighlightOn ? (lang === 'it' ? 'ATTIVA' : 'ON') : (lang === 'it' ? 'DISATTIVA' : 'OFF')}
                </button>
              </div>

              {/* Dimensione Font Editor */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1">
                <span className="text-gray-700 dark:text-zinc-300 font-medium text-xs sm:text-sm">
                  {lang === 'it' ? 'Dimensione Font Editor:' : 'Editor Font Size:'}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-1">
                  {[12, 14, 18, 24, 30, 32, 36, 40, 48].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setEditorFontSize(sz)}
                      className={`px-3 py-1.5 sm:px-2 sm:py-1 rounded-xl sm:rounded-lg text-sm sm:text-xs font-mono font-bold cursor-pointer transition-all ${
                        editorFontSize === sz
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-300 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {sz}px
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sezione 3: Workspace Marketplace SDK Manifest (appsscript.json) */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 text-xs">
                <Code size={14} className="text-emerald-500" />
                <span>Google Workspace™ Marketplace SDK Manifest</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  const manifest = `{
  "timeZone": "Europe/Rome",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/documents"
  ],
  "addOns": {
    "common": { "name": "LiViA Editor™" },
    "drive": { "homepageTrigger": { "runFunction": "onDriveHomepage" } },
    "docs": { "homepageTrigger": { "runFunction": "onDocsHomepage" } }
  }
}`;
                  navigator.clipboard.writeText(manifest);
                  showToast(lang === 'it' ? 'Manifest appsscript.json copiato!' : 'appsscript.json manifest copied!', 'success');
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              >
                <Check size={12} />
                <span>{lang === 'it' ? 'Copia appsscript.json' : 'Copy appsscript.json'}</span>
              </button>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-zinc-300 leading-relaxed">
              {lang === 'it'
                ? 'Usa la configurazione appsscript.json integrata per inserire il Deployment ID in Google Workspace™ Marketplace SDK e attivare la sidebar in Google Drive™ e Google Docs™.'
                : 'Use the integrated appsscript.json manifest configuration to register your Deployment ID in Google Workspace™ Marketplace SDK.'}
            </p>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 text-[10px] text-gray-400 dark:text-zinc-500">
            Google Drive™, Google Docs™, Google Workspace™ and Gemini™ are trademarks of Google LLC.
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 dark:border-[#2D2D2D] bg-gray-50/50 dark:bg-[#0D0F12]/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-900 dark:bg-zinc-100 text-white dark:text-gray-900 font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            {lang === 'it' ? 'Salva & Chiudi' : 'Save & Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
