import React, { useState } from 'react';
import { X, Globe, Download, AlertCircle, Loader2 } from 'lucide-react';
import { fetchRemoteMarkdown } from '../utils/urlFetcher';

interface UrlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'it' | 'en';
  onImport: (content: string, suggestedFilename: string) => void;
}

export function UrlImportModal({ isOpen, onClose, lang, onImport }: UrlImportModalProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);

    try {
      const content = await fetchRemoteMarkdown(trimmed);
      
      // Try to extract a filename from the URL, fallback to "imported-file.md"
      let suggestedFilename = 'imported-file.md';
      try {
        const urlObj = new URL(trimmed);
        const parts = urlObj.pathname.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart.includes('.')) {
          suggestedFilename = lastPart;
        }
      } catch (e) {
        // invalid URL format, ignore
      }

      onImport(content, suggestedFilename);
      setUrl('');
      onClose();
    } catch (e: any) {
      setError(e.message || (lang === 'it' ? 'Errore durante il download' : 'Error downloading file'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#16181D] rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-[#2D2D2D] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#2D2D2D]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <Globe className="text-blue-500" size={20} />
            {lang === 'it' ? 'Importa da URL' : 'Import from URL'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300">
              {lang === 'it' ? 'Indirizzo del file (URL)' : 'File URL'}
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://raw.githubusercontent.com/..."
              className="w-full bg-gray-50 dark:bg-[#0D0F12] border border-gray-200 dark:border-[#2D2D2D] rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && url.trim()) handleImport();
              }}
            />
            <p className="text-[11px] text-gray-500 dark:text-zinc-500">
              {lang === 'it' 
                ? 'Inserisci il link diretto a un file Markdown (.md) o testo semplice.' 
                : 'Enter a direct link to a Markdown (.md) or plain text file.'}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-[#2D2D2D] bg-gray-50/50 dark:bg-[#0D0F12]/50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 font-bold text-xs transition-colors cursor-pointer"
          >
            {lang === 'it' ? 'Annulla' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!url.trim() || isLoading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {lang === 'it' ? 'Scarica e Apri' : 'Download & Open'}
          </button>
        </div>
      </div>
    </div>
  );
}
