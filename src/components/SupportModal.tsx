/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HelpCircle, X, Mail, Globe, BookOpen, ShieldCheck, FileText, ExternalLink, Copy, Check } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'it' | 'en';
  onOpenPrivacyModal?: () => void;
  onOpenTermsModal?: () => void;
  onOpenHelp?: () => void;
}

export function SupportModal({
  isOpen,
  onClose,
  lang,
  onOpenPrivacyModal,
  onOpenTermsModal,
  onOpenHelp
}: SupportModalProps) {
  const [copiedUrl, setCopiedUrl] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const supportEmail = 'support-livia-editor@googlegroups.com';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-cx2wjgtullqlljij7htqqx-90238823391.europe-west2.run.app';
  const supportUrl = `${baseUrl}/support`;
  const privacyUrl = `${baseUrl}/privacy`;
  const termsUrl = `${baseUrl}/terms`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(key);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn font-sans">
      <div className="bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-[#2D2D2D] flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
              <HelpCircle size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                {lang === 'it' ? 'Centro Assistenza e Supporto - LiViA Editor' : 'Help & Support Center - LiViA Editor'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {lang === 'it' ? 'URL Ufficiale di Supporto per Google Workspace Marketplace' : 'Official Support URL for Google Workspace Marketplace'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
          
          {/* Main Support Contact Card */}
          <section className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200/80 dark:border-blue-900/40 space-y-3">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <Mail size={18} className="text-blue-600 dark:text-blue-400" />
              <span>{lang === 'it' ? 'Contatto Email Diretta per l\'Assistenza' : 'Direct Support Email Contact'}</span>
            </h3>
            <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
              {lang === 'it'
                ? 'Per problemi tecnici, domande sulle integrazioni Google Drive™ / Google Docs™, segnalazioni di bug o chiarimenti sulle funzionalità di LiViA Editor™, puoi contattare il nostro team di supporto via email:'
                : 'For technical support, inquiries regarding Google Drive™ / Google Docs™ integrations, bug reports, or questions about LiViA Editor™ features, reach out to our support team:'}
            </p>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-[#121418] p-3 rounded-lg border border-blue-200 dark:border-blue-900/60 font-mono text-xs">
              <span className="font-bold text-blue-600 dark:text-blue-400 break-all">{supportEmail}</span>
              <button
                onClick={() => copyToClipboard(supportEmail, 'email')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-sans font-semibold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedUrl === 'email' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedUrl === 'email' ? (lang === 'it' ? 'Copiato!' : 'Copied!') : (lang === 'it' ? 'Copia Email' : 'Copy Email')}</span>
              </button>
            </div>
          </section>

          {/* Official URLs for Store Listing */}
          <section className="space-y-2">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <Globe size={18} className="text-emerald-500" />
              <span>{lang === 'it' ? 'URL Ufficiali del Prodotto (Google Store Listing)' : 'Official Product URLs (Google Store Listing)'}</span>
            </h3>

            <div className="space-y-2 font-mono text-xs">
              {/* Support URL */}
              <div className="p-2.5 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-sans font-bold text-gray-900 dark:text-white block text-xs">Support URL:</span>
                  <span className="text-gray-600 dark:text-zinc-300">{supportUrl}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(supportUrl, 'supportUrl')}
                  className="px-2.5 py-1 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-800 dark:text-white font-sans font-semibold rounded text-xs transition-all self-start sm:self-center cursor-pointer"
                >
                  {copiedUrl === 'supportUrl' ? (lang === 'it' ? 'Copiato!' : 'Copied!') : (lang === 'it' ? 'Copia' : 'Copy')}
                </button>
              </div>

              {/* Terms URL */}
              <div className="p-2.5 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-sans font-bold text-gray-900 dark:text-white block text-xs">Terms of Service URL:</span>
                  <span className="text-gray-600 dark:text-zinc-300">{termsUrl}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(termsUrl, 'termsUrl')}
                  className="px-2.5 py-1 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-800 dark:text-white font-sans font-semibold rounded text-xs transition-all self-start sm:self-center cursor-pointer"
                >
                  {copiedUrl === 'termsUrl' ? (lang === 'it' ? 'Copiato!' : 'Copied!') : (lang === 'it' ? 'Copia' : 'Copy')}
                </button>
              </div>

              {/* Privacy URL */}
              <div className="p-2.5 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-sans font-bold text-gray-900 dark:text-white block text-xs">Privacy Policy URL:</span>
                  <span className="text-gray-600 dark:text-zinc-300">{privacyUrl}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(privacyUrl, 'privacyUrl')}
                  className="px-2.5 py-1 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-800 dark:text-white font-sans font-semibold rounded text-xs transition-all self-start sm:self-center cursor-pointer"
                >
                  {copiedUrl === 'privacyUrl' ? (lang === 'it' ? 'Copiato!' : 'Copied!') : (lang === 'it' ? 'Copia' : 'Copy')}
                </button>
              </div>
            </div>
          </section>

          {/* Quick FAQ */}
          <section className="space-y-2">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-500" />
              <span>{lang === 'it' ? 'Domande Frequenti (FAQ)' : 'Frequently Asked Questions (FAQ)'}</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-gray-50/80 dark:bg-zinc-800/40 rounded-xl border border-gray-200/80 dark:border-zinc-700/60">
                <p className="font-bold text-gray-900 dark:text-white mb-1">
                  {lang === 'it' ? 'Come si apre un file con "Apri con -> LiViA Editor" da Google Drive™?' : 'How do I open a file with "Open with -> LiViA Editor" in Google Drive™?'}
                </p>
                <p className="text-gray-600 dark:text-zinc-300 leading-relaxed">
                  {lang === 'it'
                    ? 'In Google Drive™, fai clic con il tasto destro del mouse su qualsiasi file di testo, documento .docx o codice (.py, .kt, .js, .md) e seleziona "Apri con" -> "LiViA Editor". Il file verrà caricato direttamente nell\'editor.'
                    : 'In Google Drive™, right-click any text file, .docx document, or code file (.py, .kt, .js, .md) and select "Open with" -> "LiViA Editor". The document will open seamlessly.'}
                </p>
              </div>

              <div className="p-3 bg-gray-50/80 dark:bg-zinc-800/40 rounded-xl border border-gray-200/80 dark:border-zinc-700/60">
                <p className="font-bold text-gray-900 dark:text-white mb-1">
                  {lang === 'it' ? 'Dove posso trovare la guida completa dei comandi Vim?' : 'Where can I find the complete Vim commands manual?'}
                </p>
                <p className="text-gray-600 dark:text-zinc-300 leading-relaxed">
                  {lang === 'it'
                    ? 'Digita il comando :help o :he nella modalità comando (:), oppure clicca sul pulsante "Manuale" nella barra laterale o nel menu per aprire il manuale interattivo.'
                    : 'Type :help or :he in command mode (:), or click the "Manual" button in the sidebar or menu to view the full interactive manual.'}
                </p>
              </div>

              <div className="p-3 bg-gray-50/80 dark:bg-zinc-800/40 rounded-xl border border-gray-200/80 dark:border-zinc-700/60">
                <p className="font-bold text-gray-900 dark:text-white mb-1">
                  {lang === 'it' ? 'I miei file vengono inviati a server terzi?' : 'Are my files sent to third-party servers?'}
                </p>
                <p className="text-gray-600 dark:text-zinc-300 leading-relaxed">
                  {lang === 'it'
                    ? 'No. LiViA Editor funziona interamente nel browser e interagisce unicamente con le API ufficiali Google Drive™ dell\'utente via OAuth sicuro. Nessun dato o contenuto di documento viene salvato su server esterni.'
                    : 'No. LiViA Editor operates in the user\'s browser and communicates directly with official Google Drive™ APIs via secure OAuth. No document data is retained on external servers.'}
                </p>
              </div>
            </div>
          </section>

          {/* Modal Links Trigger */}
          <div className="flex flex-wrap gap-2 pt-2">
            {onOpenPrivacyModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrivacyModal();
                }}
                className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-100 transition-all cursor-pointer"
              >
                <ShieldCheck size={14} />
                <span>{lang === 'it' ? 'Informativa Privacy' : 'Privacy Policy'}</span>
              </button>
            )}

            {onOpenTermsModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTermsModal();
                }}
                className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-100 transition-all cursor-pointer"
              >
                <FileText size={14} />
                <span>{lang === 'it' ? 'Termini di Servizio' : 'Terms of Service'}</span>
              </button>
            )}

            {onOpenHelp && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenHelp();
                }}
                className="px-3 py-2 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-100 transition-all cursor-pointer"
              >
                <BookOpen size={14} />
                <span>{lang === 'it' ? 'Apri Manuale (:help)' : 'Open Manual (:help)'}</span>
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 text-[10px] text-gray-400 dark:text-zinc-500">
            Google Drive™, Google Docs™, Google Workspace™ and Gemini™ are trademarks of Google LLC.
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-[#2D2D2D] bg-gray-50/50 dark:bg-[#0D0F12]/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 dark:bg-zinc-100 text-white dark:text-gray-900 font-bold rounded-xl text-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            {lang === 'it' ? 'Chiudi' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}
