import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Languages, BookOpen, Send, Check, Settings, Bot, ArrowRight, Loader2, AlertCircle, Quote, Zap, Cpu, RefreshCw, ExternalLink, Key, CheckCircle2, GripHorizontal } from 'lucide-react';
import { testGeminiConnection } from '../utils/geminiClient';
import { AiProfile } from '../types';

export interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'it' | 'en';
  selectionText: string;
  hasSelection: boolean;
  docLength: number;
  aiProfiles: AiProfile[];
  activeProfileId: string | null;
  onSelectProfile: (id: string | null) => void;
  onOpenSettingsModal?: () => void;
  onOpenAiProfilesModal?: () => void;
  selectedModel?: 'flash' | 'flash-lite' | 'pro';
  onSelectModel?: (model: 'flash' | 'flash-lite' | 'pro') => void;
  onExecute: (
    action: 'prompt' | 'translate' | 'latin',
    arg: string,
    targetMode: 'selection' | 'document' | 'cursor',
    modelTier?: 'flash' | 'flash-lite' | 'pro'
  ) => Promise<boolean>;
}

export function AiAssistantModal({
  isOpen,
  onClose,
  lang,
  selectionText,
  hasSelection,
  docLength,
  aiProfiles,
  activeProfileId,
  onSelectProfile,
  onOpenSettingsModal,
  onOpenAiProfilesModal,
  selectedModel: externalModel,
  onSelectModel,
  onExecute,
}: AiAssistantModalProps) {
  const [activeTab, setActiveTab] = useState<'prompt' | 'translate' | 'latin'>('prompt');
  const [promptText, setPromptText] = useState('');
  const [targetLang, setTargetLang] = useState(lang === 'it' ? 'English' : 'Italian');
  const [latinTheme, setLatinTheme] = useState('random');
  const [targetMode, setTargetMode] = useState<'selection' | 'document' | 'cursor'>(
    hasSelection ? 'selection' : 'cursor'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Local model state synchronized with localStorage
  const [model, setModel] = useState<'flash' | 'flash-lite' | 'pro'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('livia_gemini_model');
      if (stored === 'flash-lite' || stored === 'pro') return stored;
    }
    return externalModel || 'flash';
  });

  // Diagnostic state
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; isCloudDisabled?: boolean } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialPosX: 0, initialPosY: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('#ai-modal-close-btn')) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: position.x,
      initialPosY: position.y
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      setPosition({
        x: dragStartRef.current.initialPosX + dx,
        y: dragStartRef.current.initialPosY + dy
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  // Check if user has a custom API key set
  const [hasCustomKey, setHasCustomKey] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const key = localStorage.getItem('livia_custom_gemini_key');
      return !!(key && key.trim().length > 0);
    }
    return false;
  });

  // Sync default targetMode when selection status changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
      setTargetMode(hasSelection ? 'selection' : 'cursor');
      setErrorMessage(null);
      setTestResult(null);
      setIsLoading(false);
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('livia_gemini_model');
        if (stored === 'flash-lite' || stored === 'pro' || stored === 'flash') {
          setModel(stored);
        }
        const key = localStorage.getItem('livia_custom_gemini_key');
        setHasCustomKey(!!(key && key.trim().length > 0));
      }
      setTimeout(() => {
        if (textareaRef.current && activeTab === 'prompt') {
          textareaRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, hasSelection]);

  const handleModelChange = (newModel: 'flash' | 'flash-lite' | 'pro') => {
    setModel(newModel);
    if (typeof window !== 'undefined') {
      localStorage.setItem('livia_gemini_model', newModel);
    }
    if (onSelectModel) {
      onSelectModel(newModel);
    }
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    setErrorMessage(null);
    try {
      const customKey = typeof window !== 'undefined' ? localStorage.getItem('livia_custom_gemini_key') || '' : '';
      const queryParam = customKey.trim() ? `?key=${encodeURIComponent(customKey.trim())}` : '';
      const startTime = Date.now();
      const res = await fetch(`/api/gemini/status${queryParam}`);
      const data = await res.json();
      const elapsed = Date.now() - startTime;

      if (data.ok) {
        setTestResult({
          ok: true,
          message: lang === 'it' 
            ? `Connessione riuscita (${elapsed}ms)! Modello attivo: ${data.model}` 
            : `Connection successful (${elapsed}ms)! Active model: ${data.model}`
        });
      } else {
        setTestResult({
          ok: false,
          message: data.error || (lang === 'it' ? 'Connessione non riuscita' : 'Connection failed'),
          isCloudDisabled: data.isCloudDisabled
        });
      }
    } catch (e: any) {
      setTestResult({
        ok: false,
        message: e?.message || (lang === 'it' ? 'Errore di rete durante il test' : 'Network error during test')
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  if (!isOpen) return null;

  const quickPromptChipsIt = [
    { label: 'Correggi bozza', text: 'Correggi attentamente la bozza, correggendo grammatica, ortografia e punteggiatura mantenendo inalterato il significato.' },
    { label: 'Migliora stile', text: 'Riscrivi migliorando la fluidità, la chiarezza e lo stile espositivo, rendendolo elegante e professionale.' },
    { label: 'Riassumi', text: 'Riassumi i concetti chiave in un elenco puntato conciso e chiaro.' },
    { label: 'Formatta Markdown', text: 'Formatta e struttura il testo usando una gerarchia Markdown pulita con titoli, elenchi e grassetti.' },
    { label: 'Continua testo', text: 'Continua a scrivere sviluppando coerentemente il discorso dal punto in cui si interrompe.' },
    { label: 'Spiega testo', text: 'Spiega chiaramente il significato, i concetti principali e il contesto di questo testo.' },
    { label: 'Ottimizza codice', text: 'Revisiona questo codice per bug, ottimizzazione delle prestazioni e buone pratiche moderne.' },
  ];

  const quickPromptChipsEn = [
    { label: 'Proofread', text: 'Carefully proofread this draft for grammar, spelling, and punctuation while preserving the original meaning.' },
    { label: 'Improve style', text: 'Rewrite to enhance flow, clarity, and prose style, making it polished and professional.' },
    { label: 'Summarize', text: 'Summarize key points into a concise, scannable bulleted list.' },
    { label: 'Markdown format', text: 'Format and structure this text with clean Markdown hierarchy, headers, lists, and emphasis.' },
    { label: 'Continue writing', text: 'Continue writing seamlessly from where the text leaves off, expanding on the ideas.' },
    { label: 'Explain', text: 'Explain the core concepts, logic, and context of this text clearly.' },
    { label: 'Review code', text: 'Review this code for potential bugs, performance optimizations, and modern best practices.' },
  ];

  const quickChips = lang === 'it' ? quickPromptChipsIt : quickPromptChipsEn;

  const languagesList = [
    { code: 'Italian', label: 'Italiano 🇮🇹' },
    { code: 'English', label: 'English 🇬🇧' },
    { code: 'Spanish', label: 'Español 🇪🇸' },
    { code: 'French', label: 'Français 🇫🇷' },
    { code: 'German', label: 'Deutsch 🇩🇪' },
    { code: 'Latin', label: 'Latino 🏛️' },
    { code: 'Portuguese', label: 'Português 🇵🇹' },
    { code: 'Japanese', label: 'Giapponese 🇯🇵' },
  ];

  const latinThemesIt = [
    { id: 'random', label: '🎲 Casuale' },
    { id: 'fortuna', label: '🍀 Fortuna & Destino' },
    { id: 'coraggio', label: '⚔️ Coraggio & Virtù' },
    { id: 'tempo', label: '⏳ Tempo & Vita' },
    { id: 'sapienza', label: '📚 Sapienza & Filosofia' },
    { id: 'giustizia', label: '⚖️ Giustizia & Diritto' },
  ];

  const latinThemesEn = [
    { id: 'random', label: '🎲 Random' },
    { id: 'fortuna', label: '🍀 Fortune & Destiny' },
    { id: 'coraggio', label: '⚔️ Courage & Virtue' },
    { id: 'tempo', label: '⏳ Time & Life' },
    { id: 'sapienza', label: '📚 Wisdom & Philosophy' },
    { id: 'giustizia', label: '⚖️ Justice & Law' },
  ];

  const latinThemes = lang === 'it' ? latinThemesIt : latinThemesEn;

  const activeProfile = aiProfiles.find(p => p.id === activeProfileId);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    let action: 'prompt' | 'translate' | 'latin' = 'prompt';
    let arg = '';

    if (activeTab === 'prompt') {
      if (!promptText.trim()) {
        setErrorMessage(lang === 'it' ? 'Inserisci un prompt o un\'istruzione.' : 'Please enter a prompt or instruction.');
        return;
      }
      action = 'prompt';
      arg = promptText.trim();
    } else if (activeTab === 'translate') {
      action = 'translate';
      arg = targetLang.trim() || 'English';
    } else if (activeTab === 'latin') {
      action = 'latin';
      arg = latinTheme.trim() || 'random';
    }

    setIsLoading(true);
    try {
      const success = await onExecute(action, arg, targetMode, model);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || (lang === 'it' ? 'Errore durante l\'esecuzione dell\'AI.' : 'AI execution error.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-sans animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
      id="ai-assistant-modal-backdrop"
    >
      <div 
        className="bg-white dark:bg-[#12151B] border border-gray-200 dark:border-[#2D333F] rounded-2xl shadow-2xl w-full max-w-xl max-h-[92dvh] flex flex-col overflow-hidden text-gray-800 dark:text-zinc-200 animate-in zoom-in-95 duration-150"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        id="ai-assistant-modal-window"
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#202530] bg-linear-to-r from-emerald-500/10 via-indigo-500/10 to-purple-500/10 dark:from-emerald-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 shrink-0 cursor-move touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-linear-to-br from-emerald-500 to-indigo-600 text-white shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                  {lang === 'it' ? 'Assistente IA LiViA' : 'LiViA AI Assistant'}
                  <GripHorizontal size={14} className="text-gray-400 opacity-50" />
                </h2>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                  Gemini™
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                {lang === 'it' 
                  ? 'Potenzia la scrittura e il codice con intelligenza artificiale' 
                  : 'Supercharge writing & coding with artificial intelligence'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
            id="ai-modal-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Model Selection Bar */}
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-[#151922] border-b border-gray-200 dark:border-[#202530] shrink-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu size={12} className="text-emerald-500" />
              <span>{lang === 'it' ? 'Modello Gemini attivo:' : 'Active Gemini Model:'}</span>
            </span>

            {/* Test connection trigger */}
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection || isLoading}
              className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
              title={lang === 'it' ? 'Verifica la connettività con Gemini API' : 'Test connectivity with Gemini API'}
              id="ai-test-connection-btn"
            >
              <RefreshCw size={10} className={isTestingConnection ? 'animate-spin' : ''} />
              <span>{isTestingConnection ? (lang === 'it' ? 'Verifica...' : 'Checking...') : (lang === 'it' ? 'Test Connessione' : 'Test Connection')}</span>
            </button>
          </div>

          {/* Model Selection Buttons */}
          <div className="grid grid-cols-3 gap-1.5" id="ai-model-selector-group">
            <button
              type="button"
              onClick={() => handleModelChange('flash')}
              className={`p-1.5 sm:p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                model === 'flash'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500/60 ring-1 ring-emerald-500/30'
                  : 'bg-white dark:bg-[#0E1116] border-gray-200 dark:border-[#2C313C] hover:bg-gray-100 dark:hover:bg-zinc-800/80'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[11px] font-bold flex items-center gap-1 ${
                  model === 'flash' ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-800 dark:text-zinc-200'
                }`}>
                  <Sparkles size={11} className="text-emerald-500 shrink-0" />
                  <span>3.8 Flash</span>
                </span>
                {model === 'flash' && <Check size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}
              </div>
              <span className="text-[9px] text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                {lang === 'it' ? 'Consigliato (Free Tier)' : 'Recommended (Free)'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleModelChange('flash-lite')}
              className={`p-1.5 sm:p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                model === 'flash-lite'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 dark:border-amber-500/60 ring-1 ring-amber-500/30'
                  : 'bg-white dark:bg-[#0E1116] border-gray-200 dark:border-[#2C313C] hover:bg-gray-100 dark:hover:bg-zinc-800/80'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[11px] font-bold flex items-center gap-1 ${
                  model === 'flash-lite' ? 'text-amber-700 dark:text-amber-300' : 'text-gray-800 dark:text-zinc-200'
                }`}>
                  <Zap size={11} className="text-amber-500 shrink-0" />
                  <span>3.1 Flash-Lite</span>
                </span>
                {model === 'flash-lite' && <Check size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />}
              </div>
              <span className="text-[9px] text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                {lang === 'it' ? 'Ultrarapido (Bassa latenza)' : 'Ultra-fast (Low latency)'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleModelChange('pro')}
              className={`p-1.5 sm:p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                model === 'pro'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500/60 ring-1 ring-indigo-500/30'
                  : 'bg-white dark:bg-[#0E1116] border-gray-200 dark:border-[#2C313C] hover:bg-gray-100 dark:hover:bg-zinc-800/80'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[11px] font-bold flex items-center gap-1 ${
                  model === 'pro' ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-zinc-200'
                }`}>
                  <Cpu size={11} className="text-indigo-500 shrink-0" />
                  <span>3.1 Pro</span>
                </span>
                {model === 'pro' && <Check size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
              </div>
              <span className="text-[9px] text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                {lang === 'it' ? 'Ragionamento avanzato' : 'Advanced reasoning'}
              </span>
            </button>
          </div>

          {/* Test connection live feedback banner */}
          {testResult && (
            <div className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-2 animate-in fade-in ${
              testResult.ok 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
                : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            }`}>
              {testResult.ok ? (
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-[11px] leading-relaxed">
                <p className="font-semibold">{testResult.message}</p>
                {testResult.isCloudDisabled && (
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <a
                      href="https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[10px]"
                    >
                      <span>{lang === 'it' ? 'Abilita Generative Language API in Google Cloud' : 'Enable Generative Language API in Cloud'}</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Target Context Summary Bar */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-[#161A22] border-b border-gray-100 dark:border-[#202530] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider shrink-0">
              {lang === 'it' ? 'Destinazione:' : 'Target:'}
            </span>
            {hasSelection ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-[#8AB4F8] font-bold text-[11px] border border-blue-200 dark:border-blue-900/50 truncate">
                <Quote size={11} className="shrink-0" />
                <span className="truncate">
                  {lang === 'it' 
                    ? `Testo Selezionato (${selectionText.length} car.)` 
                    : `Selected Text (${selectionText.length} chars)`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-bold text-[11px]">
                <span>
                  {targetMode === 'document' 
                    ? (lang === 'it' ? `Intero Documento (${docLength} car.)` : `Entire Document (${docLength} chars)`)
                    : (lang === 'it' ? 'Inserisci al cursore' : 'Insert at cursor')}
                </span>
              </div>
            )}
          </div>

          {/* If no selection, allow toggling between Cursor Insertion vs Whole Document */}
          {!hasSelection && (
            <div className="flex items-center gap-1 bg-white dark:bg-[#0E1116] p-0.5 rounded-lg border border-gray-200 dark:border-[#2C313C] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setTargetMode('cursor')}
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  targetMode === 'cursor'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
                }`}
              >
                {lang === 'it' ? 'Al Cursore' : 'At Cursor'}
              </button>
              <button
                type="button"
                onClick={() => setTargetMode('document')}
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  targetMode === 'document'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
                }`}
              >
                {lang === 'it' ? 'Tutto il File' : 'Whole File'}
              </button>
            </div>
          )}
        </div>

        {/* Selection Preview Quote if selection is present */}
        {hasSelection && selectionText && (
          <div className="px-4 py-2 bg-blue-50/40 dark:bg-blue-950/20 border-b border-blue-100/60 dark:border-blue-900/30 text-[11px] text-gray-700 dark:text-zinc-300 flex items-start gap-2 shrink-0">
            <Quote size={13} className="text-blue-500 shrink-0 mt-0.5 opacity-70" />
            <p className="line-clamp-2 italic font-mono text-[11px] leading-relaxed break-all">
              "{selectionText.slice(0, 150)}{selectionText.length > 150 ? '...' : ''}"
            </p>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="flex items-center border-b border-gray-200 dark:border-[#202530] px-3 pt-2 gap-1 bg-gray-50/50 dark:bg-[#12151B] shrink-0">
          <button
            type="button"
            onClick={() => { setActiveTab('prompt'); setErrorMessage(null); }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'prompt'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
                : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200'
            }`}
            id="ai-tab-prompt"
          >
            <Sparkles size={14} />
            <span>{lang === 'it' ? 'Prompt Libero' : 'Prompt / Ask'}</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('translate'); setErrorMessage(null); }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'translate'
                ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
                : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200'
            }`}
            id="ai-tab-translate"
          >
            <Languages size={14} />
            <span>{lang === 'it' ? 'Traduci' : 'Translate'}</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('latin'); setErrorMessage(null); }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'latin'
                ? 'border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300'
                : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200'
            }`}
            id="ai-tab-latin"
          >
            <BookOpen size={14} />
            <span>{lang === 'it' ? 'Locuzione Latina' : 'Latin Wisdom'}</span>
          </button>
        </div>

        {/* Tab Body - Scrollable */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* TAB 1: PROMPT */}
          {activeTab === 'prompt' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  {lang === 'it' ? 'Cosa vuoi fare con questo testo?' : 'What do you want to do with this text?'}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {quickChips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPromptText(chip.text)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-gray-100 dark:bg-[#1A1E26] hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-[#2C313C] transition-all cursor-pointer active:scale-95 text-left"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder={
                      lang === 'it' 
                        ? "Scrivi un'istruzione per Gemini (es. 'Correggi e formatta in stile accademico', 'Traduci in Python', 'Aggiungi una conclusione')..." 
                        : "Enter instruction for Gemini (e.g. 'Proofread and format academically', 'Refactor into Python', 'Add conclusion')..."
                    }
                    rows={4}
                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-[#2D333F] bg-white dark:bg-[#0B0D11] text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-y"
                    disabled={isLoading}
                    id="ai-prompt-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSLATE */}
          {activeTab === 'translate' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-zinc-300 uppercase tracking-wider mb-2">
                  {lang === 'it' ? 'Seleziona lingua di destinazione:' : 'Select target language:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {languagesList.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setTargetLang(l.code)}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                        targetLang.toLowerCase() === l.code.toLowerCase()
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-400/30'
                          : 'border-gray-200 dark:border-[#2C313C] bg-white dark:bg-[#161A22] text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  {lang === 'it' ? 'Oppure specifica un\'altra lingua:' : 'Or specify another language:'}
                </label>
                <input
                  type="text"
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  placeholder={lang === 'it' ? 'Es. Cinese mandarino, Greco antico, Russo...' : 'E.g. Mandarin Chinese, Ancient Greek, Russian...'}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-[#2D333F] bg-white dark:bg-[#0B0D11] text-gray-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* TAB 3: LATIN WISDOM */}
          {activeTab === 'latin' && (
            <div className="space-y-3">
              <div className="p-3 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 rounded-xl leading-relaxed">
                <p className="text-[11px] text-purple-900 dark:text-purple-300">
                  {lang === 'it'
                    ? 'Genera una locuzione o aforisma latino autentico con traduzione in italiano e spiegazione storico-filosofica da inserire direttamente nel documento.'
                    : 'Generate an authentic Latin quote with Italian translation and historical/philosophical commentary inserted directly into the document.'}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-zinc-300 uppercase tracking-wider mb-2">
                  {lang === 'it' ? 'Scegli un tema o argomento:' : 'Choose a theme or topic:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {latinThemes.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setLatinTheme(th.id)}
                      className={`p-2 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                        latinTheme === th.id
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 ring-2 ring-purple-400/30'
                          : 'border-gray-200 dark:border-[#2C313C] bg-white dark:bg-[#161A22] text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span>{th.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active AI Profile & Key Status */}
          <div className="pt-2 border-t border-gray-100 dark:border-[#202530] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bot size={14} className="text-purple-500" />
              <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                {lang === 'it' ? 'Profilo IA (Gem):' : 'AI Profile (Gem):'}
              </span>
              <select
                value={activeProfileId || ''}
                onChange={(e) => onSelectProfile(e.target.value ? e.target.value : null)}
                className="text-[11px] font-bold py-1 px-2 rounded-lg border border-gray-200 dark:border-[#2C313C] bg-white dark:bg-[#161A22] text-gray-800 dark:text-zinc-200 outline-none cursor-pointer"
              >
                <option value="">{lang === 'it' ? 'Standard (Predefinito)' : 'Standard (Default)'}</option>
                {aiProfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              {/* Key status badge */}
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-400">
                <Key size={11} className={hasCustomKey ? "text-emerald-500" : "text-gray-400"} />
                <span>{hasCustomKey ? (lang === 'it' ? 'Chiave personale' : 'Personal key') : (lang === 'it' ? 'Chiave condivisa' : 'Shared key')}</span>
              </span>

              {onOpenSettingsModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettingsModal();
                  }}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-medium flex items-center gap-1"
                >
                  <Settings size={12} />
                  <span>{lang === 'it' ? 'Impostazioni' : 'Settings'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Error Message Box with Actionable Guides */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-800 dark:text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-semibold leading-relaxed">{errorMessage}</p>

                {/* Direct action links if Google Cloud API or AI Studio key needs configuration */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {(errorMessage.includes('Google Cloud') || errorMessage.includes('Generative Language') || errorMessage.includes('abilitata')) && (
                    <a
                      href="https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors"
                    >
                      <span>{lang === 'it' ? 'Abilita API in Google Cloud' : 'Enable API in Google Cloud'}</span>
                      <ExternalLink size={11} />
                    </a>
                  )}

                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors"
                  >
                    <span>{lang === 'it' ? 'Crea Chiave Gratuita (Google AI Studio)' : 'Get Free Key (Google AI Studio)'}</span>
                    <ExternalLink size={11} />
                  </a>

                  {onOpenSettingsModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSettingsModal();
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <Settings size={11} />
                      <span>{lang === 'it' ? 'Imposta Chiave' : 'Set Key'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tip for Vim power users */}
          <div className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono flex items-center justify-between gap-1.5 pt-1">
            <div className="flex items-center gap-1.5">
              <span>💡</span>
              <span>
                {lang === 'it'
                  ? 'Comandi Vim: :ai [testo], :tr [lingua], :lat [tema], :gem model [flash|lite|pro]'
                  : 'Vim commands: :ai [text], :tr [lang], :lat [theme], :gem model [flash|lite|pro]'}
              </span>
            </div>
            {onOpenAiProfilesModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAiProfilesModal();
                }}
                className="text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                {lang === 'it' ? 'Profili...' : 'Profiles...'}
              </button>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:px-4 sm:py-3 border-t border-gray-100 dark:border-[#202530] bg-gray-50 dark:bg-[#12151B] flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {lang === 'it' ? 'Annulla' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isLoading}
            className="min-h-[40px] px-5 py-2 text-xs font-bold text-white bg-linear-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 active:scale-95 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            id="ai-submit-btn"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{lang === 'it' ? 'Elaborazione in corso...' : 'Processing...'}</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>
                  {activeTab === 'prompt' 
                    ? (lang === 'it' ? `Esegui (${model.toUpperCase()})` : `Run (${model.toUpperCase()})`)
                    : activeTab === 'translate'
                    ? (lang === 'it' ? `Traduci (${model.toUpperCase()})` : `Translate (${model.toUpperCase()})`)
                    : (lang === 'it' ? 'Inserisci Locuzione' : 'Insert Quote')}
                </span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
