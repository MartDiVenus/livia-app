/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  FileText, 
  ExternalLink, 
  Upload, 
  Sparkles, 
  Info,
  Cloud,
  FileCode
} from 'lucide-react';
import { 
  copyFormattedForGoogleDocs, 
  convertGoogleDocsHtmlToMarkdown, 
  cleanGoogleDocsMarkdown,
  saveAsGoogleDoc 
} from '../utils/googleDocsHelper';
import { getAccessToken, googleSignIn } from '../utils/googleDrive';

interface GoogleDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  setContent: (text: string) => void;
  filename: string;
  lang?: 'it' | 'en';
}

export function GoogleDocsModal({
  isOpen,
  onClose,
  content,
  setContent,
  filename,
  lang = 'it'
}: GoogleDocsModalProps) {
  const [copied, setCopied] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Copy formatted HTML to clipboard for Google Docs Ctrl+V
  const handleCopyFormatted = async () => {
    const success = await copyFormattedForGoogleDocs(content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // 2. Paste and convert HTML/RTF from Google Docs
  const handleConvertPasted = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const htmlData = e.clipboardData.getData('text/html');
    const textData = e.clipboardData.getData('text/plain');

    if (htmlData && htmlData.trim()) {
      const markdown = convertGoogleDocsHtmlToMarkdown(htmlData);
      setContent(markdown);
      setExportMessage(lang === 'it' ? 'Contenuto da Google Docs convertito con successo in Markdown!' : 'Google Docs content converted to Markdown!');
    } else if (textData) {
      const markdown = cleanGoogleDocsMarkdown(textData);
      setContent(markdown);
      setExportMessage(lang === 'it' ? 'Testo incollato con successo!' : 'Text pasted successfully!');
    }
    setPasteInput('');
    setTimeout(() => setExportMessage(null), 3000);
  };

  // 3. Directly export to Google Drive as native Google Doc (.gdoc)
  const handleExportToGoogleDriveDoc = async () => {
    setIsExporting(true);
    setExportMessage(null);
    try {
      let token = getAccessToken();
      if (!token) {
        // Trigger Google Sign In
        const authResult = await googleSignIn();
        token = authResult?.accessToken || null;
      }

      if (!token) {
        throw new Error(lang === 'it' ? 'Accesso a Google non completato' : 'Google sign-in failed');
      }

      const created = await saveAsGoogleDoc(token, filename, content);
      setExportMessage(
        lang === 'it'
          ? `Documento "${created.name}" creato con successo in Google Docs!`
          : `Document "${created.name}" created successfully in Google Docs!`
      );
    } catch (err: any) {
      setExportMessage(err.message || (lang === 'it' ? 'Errore durante la creazione del file in Google Docs' : 'Error creating file in Google Docs'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#2D2D2D] flex justify-between items-center bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>{lang === 'it' ? 'Integrazione Google Docs / Word (.docx)' : 'Google Docs / Word (.docx) Integration'}</span>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                  2-Way Sync
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {lang === 'it'
                  ? 'Compatibilità nativa con file *.docx e formattazione Google Docs'
                  : 'Native compatibility with *.docx files and Google Docs formatting'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Message */}
        {exportMessage && (
          <div className="px-6 py-2.5 bg-blue-500/10 border-b border-blue-500/20 text-xs font-semibold text-blue-700 dark:text-[#8AB4F8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-blue-500 animate-pulse" />
              <span>{exportMessage}</span>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-gray-700 dark:text-zinc-300">
          
          {/* Card 1: Copy Formatted for Google Docs */}
          <div className="p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/10">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                  <Copy size={15} className="text-blue-600 dark:text-blue-400" />
                  <span>{lang === 'it' ? '1. Copia Formattata per Google Docs™' : '1. Copy Formatted for Google Docs™'}</span>
                </h3>
                <p className="text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {lang === 'it'
                    ? 'Converte il documento LiViA Editor™ in HTML ricco. Quando incolli in Google Docs™ (Ctrl+V), vengono mantenute intestazioni (H1-H3), elenchi puntati, grassetti, corsivi e blocchi codice!'
                    : 'Converts LiViA Editor™ doc to rich HTML. When you paste in Google Docs™ (Ctrl+V), headings, lists, bold, italics & code blocks are preserved!'}
                </p>
              </div>
            </div>
            <button
              onClick={handleCopyFormatted}
              className="mt-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {copied ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
              <span>
                {copied
                  ? (lang === 'it' ? 'Copiato negli appunti! Ora incolla su Google Docs™ (Ctrl+V)' : 'Copied! Now paste in Google Docs™ (Ctrl+V)')
                  : (lang === 'it' ? 'Copia per Google Docs™ (con stile completo)' : 'Copy for Google Docs™ (With full styling)')}
              </span>
            </button>
          </div>

          {/* Card 2: Paste from Google Docs */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-[#0D0F12]">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5 mb-1">
              <Upload size={15} className="text-emerald-500" />
              <span>{lang === 'it' ? '2. Incolla da Google Docs™ in LiViA Editor™' : '2. Paste from Google Docs™ to LiViA Editor™'}</span>
            </h3>
            <p className="text-gray-500 dark:text-zinc-400 mb-2.5 leading-relaxed">
              {lang === 'it'
                ? 'Hai copiato del testo formattato da un file Google Docs™/Word? Incolla qui sotto (Ctrl+V). Nota: puoi anche usare direttamente "Tasto destro -> Incolla" o "Ctrl+V" nell\'editor per conversioni istantanee.'
                : 'Copied formatted text from a Google Docs™/Word document? Paste below (Ctrl+V). Note: you can also directly use "Right Click -> Paste" or "Ctrl+V" inside the editor for instant conversion.'}
            </p>
            <textarea
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              onPaste={handleConvertPasted}
              rows={3}
              placeholder={
                lang === 'it'
                  ? 'Fai clic qui e premi Ctrl+V per incollare da Google Docs™...'
                  : 'Click here and press Ctrl+V to paste from Google Docs™...'
              }
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-[#16181D] font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Card 3: Save directly as Google Doc / DOCX in Google Drive */}
          <div className="p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/10 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                <Cloud size={15} className="text-indigo-500" />
                <span>{lang === 'it' ? '3. Salva come Documento Google Docs™ / Word (.docx)' : '3. Save as Google Docs™ / Word Document (.docx)'}</span>
              </h3>
              <p className="text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {lang === 'it'
                  ? 'Crea direttamente un nuovo documento nativo (.docx / Google Docs™) nel tuo account Google Drive™.'
                  : 'Creates a native document (.docx / Google Docs™) directly inside your Google Drive™ account.'}
              </p>
            </div>
            <button
              onClick={handleExportToGoogleDriveDoc}
              disabled={isExporting}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl whitespace-nowrap shadow transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Cloud size={14} />
              <span>{isExporting ? (lang === 'it' ? 'Salvataggio...' : 'Saving...') : (lang === 'it' ? 'Crea in Google Drive™' : 'Create in Google Drive™')}</span>
            </button>
          </div>

          {/* Direct link button */}
          <div className="pt-2 flex justify-between items-center text-[11px] text-gray-400 dark:text-zinc-500">
            <span>Google Drive™, Google Docs™ and Google Workspace™ are trademarks of Google LLC.</span>
            <a
              href="https://docs.google.com/document/u/0/create"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              <span>{lang === 'it' ? 'Apri Google Docs™' : 'Open Google Docs™'}</span>
              <ExternalLink size={13} />
            </a>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 dark:border-[#2D2D2D] bg-gray-50 dark:bg-[#0D0F12] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-800 dark:text-white font-semibold rounded-xl text-xs transition-all cursor-pointer"
          >
            {lang === 'it' ? 'Chiudi' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}
