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
  onOpenAiProfilesModal: () => void;
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
  onOpenAiProfilesModal,
  showToast,
}: SettingsModalProps) {
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [defaultModel, setDefaultModel] = useState<'flash' | 'pro'>('flash');
  const [activeTab, setActiveTab] = useState<'ai' | 'editor' | 'misc'>('ai');

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('livia_custom_gemini_key') || '';
      setApiKeyInput(savedKey);
      const savedModel = (localStorage.getItem('livia_default_model') as 'flash-lite' | 'flash' | 'pro' | 'pro-thinking') || 'flash';
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

  const handleModelChange = (model: 'flash-lite' | 'flash' | 'pro' | 'pro-thinking') => {
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
                {lang === 'it' ? 'Impostazioni LiViA' : 'LiViA Settings'}
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

        {/* Navigation Tabs */}
        <div className="flex px-2 pt-2 border-b border-gray-100 dark:border-[#2D2D2D] bg-gray-50/50 dark:bg-[#0D0F12]/50">
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'ai' 
                ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            <Sparkles size={14} /> AI & API
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'editor' 
                ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            <Sliders size={14} /> Editor
          </button>
          <button
            onClick={() => setActiveTab('misc')}
            className={`px-4 py-2 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'misc' 
                ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            <Globe size={14} /> Advanced
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-4 overflow-y-auto text-xs leading-relaxed text-gray-700 dark:text-zinc-300">
          
          {/* TAB: AI & API */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              
              {/* Gemini Gems (AI Profiles) */}
              <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200/50 dark:border-purple-800/30 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-purple-800 dark:text-purple-400 flex items-center gap-1.5 text-xs">
                    <Sparkles size={14} className="text-purple-500" />
                    <span>{lang === 'it' ? 'Gemini Gems (Profili AI)' : 'Gemini Gems (AI Profiles)'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={onOpenAiProfilesModal}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                  >
                    {lang === 'it' ? 'Gestisci Profili' : 'Manage Profiles'}
                  </button>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed">
                  {lang === 'it'
                    ? 'Configura istruzioni di sistema personalizzate (System Prompts) da applicare alle richieste AI.'
                    : 'Configure custom system instructions (System Prompts) to apply to your AI requests.'}
                </p>
              </div>

              {/* API Key */}
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
                    ? "Genera gratuitamente la tua API Key su Google AI Studio™ per risposte veloci ed evitare limiti di quota. L'uso delle API Key attinge al Free Tier developer."
                    : "Generate a free personal API key on Google AI Studio™ for high-speed AI responses and no quota limits. API usage runs on the developer Free Tier."}
                </p>
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex-1"
                    >
                      {lang === 'it' ? 'Salva Chiave' : 'Save Key'}
                    </button>
                    {apiKeyInput && (
                      <button
                        type="button"
                        onClick={handleClearApiKey}
                        className="px-3 py-2 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="pt-2 flex justify-center">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  >
                    <span>{lang === 'it' ? 'Ottieni una API Key gratuita' : 'Get a free API Key'}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Gemini Model */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 space-y-3">
                <h3 className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 text-xs">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>{lang === 'it' ? 'Modello Gemini di Default' : 'Default Gemini Model'}</span>
                </h3>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleModelChange('flash-lite')}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      defaultModel === 'flash-lite'
                        ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700/50'
                        : 'bg-white dark:bg-[#0D0F12] border-gray-200 dark:border-[#2D2D2D] hover:bg-gray-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-gray-900 dark:text-zinc-100">
                      <span>3.5 Flash-Lite</span>
                      {defaultModel === 'flash-lite' && <Check size={14} className="text-amber-600 dark:text-amber-400" />}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      {lang === 'it' ? 'Risposte più rapide.' : 'Fastest responses.'}
                    </p>
                  </button>
                  <button
                    onClick={() => handleModelChange('flash')}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      defaultModel === 'flash'
                        ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700/50'
                        : 'bg-white dark:bg-[#0D0F12] border-gray-200 dark:border-[#2D2D2D] hover:bg-gray-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-gray-900 dark:text-zinc-100">
                      <span>3.7 Flash</span>
                      {defaultModel === 'flash' && <Check size={14} className="text-amber-600 dark:text-amber-400" />}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      {lang === 'it' ? 'Aiuto completo.' : 'Comprehensive assistance.'}
                    </p>
                  </button>
                  <button
                    onClick={() => handleModelChange('pro')}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      defaultModel === 'pro'
                        ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700/50'
                        : 'bg-white dark:bg-[#0D0F12] border-gray-200 dark:border-[#2D2D2D] hover:bg-gray-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-gray-900 dark:text-zinc-100">
                      <span>3.1 Pro</span>
                      {defaultModel === 'pro' && <Check size={14} className="text-amber-600 dark:text-amber-400" />}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      {lang === 'it' ? 'Ragionamento avanzato.' : 'Advanced reasoning.'}
                    </p>
                  </button>
                  <button
                    onClick={() => handleModelChange('pro-thinking')}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      defaultModel === 'pro-thinking'
                        ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700/50'
                        : 'bg-white dark:bg-[#0D0F12] border-gray-200 dark:border-[#2D2D2D] hover:bg-gray-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-gray-900 dark:text-zinc-100">
                      <span>{lang === 'it' ? 'Pro Esteso (Ragionamento)' : 'Pro Extended (Reasoning)'}</span>
                      {defaultModel === 'pro-thinking' && <Check size={14} className="text-amber-600 dark:text-amber-400" />}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      {lang === 'it' ? 'Risoluzione di problemi complessi (Ragionamento esteso).' : 'Complex problem solving (Extended reasoning).'}
                    </p>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB: EDITOR */}
          {activeTab === 'editor' && (
            <div className="bg-gray-50 dark:bg-zinc-900/30 border border-gray-200 dark:border-[#2D2D2D] rounded-xl p-3.5 space-y-2">
              <h3 className="font-bold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5 text-xs mb-3">
                <Sliders size={14} className="text-gray-500" />
                <span>{lang === 'it' ? 'Preferenze Editor' : 'Editor Preferences'}</span>
              </h3>
              <div className="space-y-1">
                
                {/* Numeri di riga */}
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-[#2D2D2D]">
                  <span className="flex items-center gap-1.5 text-gray-700 dark:text-zinc-300 font-medium">
                    <Hash size={14} className="text-purple-500" />
                    {lang === 'it' ? 'Numeri di Riga (:set number)' : 'Line Numbers (:set number)'}
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
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-[#2D2D2D]">
                  <span className="flex items-center gap-1.5 text-gray-700 dark:text-zinc-300 font-medium">
                    <Code size={14} className="text-amber-500" />
                    {lang === 'it' ? 'Sintassi Colore (:set syntax)' : 'Syntax Color (:set syntax)'}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 pt-3">
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
          )}

          {/* TAB: MISC */}
          {activeTab === 'misc' && (
            <div className="space-y-4">
              
              {/* Lingua */}
              <div className="bg-gray-50 dark:bg-zinc-900/30 border border-gray-200 dark:border-[#2D2D2D] rounded-xl p-3.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-zinc-300 font-bold text-xs">
                  <Globe size={14} className="text-blue-500" />
                  {lang === 'it' ? 'Lingua dell\'Interfaccia:' : 'Interface Language:'}
                </span>
                <div className="flex items-center gap-1 bg-white dark:bg-[#0D0F12] border border-gray-200 dark:border-[#2D2D2D] p-1 rounded-lg">
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

              {/* Workspace SDK */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 text-xs">
                    <Code size={14} className="text-emerald-500" />
                    <span>Integrazione Google Workspace™</span>
                  </h3>
                </div>
                <div className="text-[11px] text-gray-600 dark:text-zinc-300 leading-relaxed space-y-1.5 pt-1">
                  {lang === 'it' ? (
                    <>
                      <p>Puoi utilizzare <strong>LiViA Editor™</strong> come componente aggiuntivo (add-on) direttamente all'interno dei tuoi documenti e file cloud. Per farlo:</p>
                      <ol className="list-decimal pl-4 space-y-1 text-gray-700 dark:text-zinc-400">
                        <li>Apri <strong>Google Drive™</strong> o un documento in <strong>Google Docs™</strong>.</li>
                        <li>Clicca sull'icona '+' (Installa componenti aggiuntivi) nella barra laterale destra.</li>
                        <li>Cerca "LiViA Editor" all'interno del <strong>Google Workspace™ Marketplace</strong>.</li>
                        <li>Clicca su "Installa" e concedi le autorizzazioni per iniziare a modificare i tuoi file con la potenza di LiViA.</li>
                      </ol>
                    </>
                  ) : (
                    <>
                      <p>You can use <strong>LiViA Editor™</strong> as an add-on directly within your cloud documents and files. To do so:</p>
                      <ol className="list-decimal pl-4 space-y-1 text-gray-700 dark:text-zinc-400">
                        <li>Open <strong>Google Drive™</strong> or a document in <strong>Google Docs™</strong>.</li>
                        <li>Click the '+' icon (Get add-ons) on the right sidebar.</li>
                        <li>Search for "LiViA Editor" inside the <strong>Google Workspace™ Marketplace</strong>.</li>
                        <li>Click "Install" and grant the permissions to start editing your files with the power of LiViA.</li>
                      </ol>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 text-[10px] text-gray-400 dark:text-zinc-500 text-center">
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
