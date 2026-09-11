/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FileText, X, ShieldCheck, Scale, Globe, Mail } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'it' | 'en';
  onOpenPrivacyModal?: () => void;
  onOpenSupportModal?: () => void;
}

export function TermsModal({
  isOpen,
  onClose,
  lang,
  onOpenPrivacyModal,
  onOpenSupportModal
}: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn font-sans">
      <div className="bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-[#2D2D2D] flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Scale size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {lang === 'it' ? 'Termini di Servizio e Licenza - LiViA editor' : 'Terms of Service & License - LiViA editor'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {lang === 'it' ? 'Ultimo aggiornamento: Luglio 2026' : 'Last updated: July 2026'}
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
          
          <section className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mb-1 text-sm">
              <Globe size={16} className="text-indigo-500" />
              <span>{lang === 'it' ? '1. Descrizione del Servizio' : '1. Service Description'}</span>
            </h3>
            <p>
              {lang === 'it'
                ? 'LiViA editor è un editor di testo e codice in stile Vim ultra-leggero, utilizzabile via Web. L\'applicazione consente la creazione, visualizzazione, modifica, riformattazione ed esportazione di documenti in vari formati (.txt, .md, .docx, .py, .kt, .js, .ts, .tex).'
                : 'LiViA editor is an ultra-lightweight Vim-style text and code editor available via Web. The software enables creating, viewing, editing, reformatting, and exporting documents in various formats (.txt, .md, .docx, .py, .kt, .js, .ts, .tex).'}
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-sm">
              <Scale size={16} className="text-emerald-500" />
              <span>{lang === 'it' ? '2. Licenza di Utilizzo (CC BY-NC 4.0)' : '2. License Terms (CC BY-NC 4.0)'}</span>
            </h3>
            <p>
              {lang === 'it'
                ? 'L\'applicazione è distribuita sotto licenza Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0). L\'utente è libero di utilizzare l\'editor per fini personali, accademici e di studio.'
                : 'The software is distributed under Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0). Users are free to use the editor for personal, educational, and academic purposes.'}
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-sm">
              <ShieldCheck size={16} className="text-blue-500" />
              <span>{lang === 'it' ? '3. Integrazione Google Drive™ e Diritti sui Dati' : '3. Google Drive™ Integration & Data Rights'}</span>
            </h3>
            <p>
              {lang === 'it'
                ? 'LiViA editor interagisce con Google Drive™ tramite l\'autorizzazione OAuth dell\'utente. Tutti i documenti modificati o creati dall\'utente rimangono di esclusiva proprietà dell\'utente e non vengono archiviati su server terzi.'
                : 'LiViA editor interacts with Google Drive™ via user OAuth authorization. All documents created or edited remain the sole property of the user and are never stored on external third-party servers.'}
            </p>
          </section>



          {/* Cross Modal Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {onOpenPrivacyModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrivacyModal();
                }}
                className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-emerald-100 transition-all cursor-pointer"
              >
                <ShieldCheck size={14} />
                <span>{lang === 'it' ? 'Informativa Privacy' : 'Privacy Policy'}</span>
              </button>
            )}

            {onOpenSupportModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSupportModal();
                }}
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-blue-100 transition-all cursor-pointer"
              >
                <Globe size={14} />
                <span>{lang === 'it' ? 'Centro Supporto' : 'Support Center'}</span>
              </button>
            )}
          </div>

        </div>

        {/* Copyright, License & Intellectual Property Notice */}
        <div className="p-4 sm:p-5 text-[10px] leading-relaxed text-gray-500 dark:text-zinc-400 bg-gray-50/50 dark:bg-[#121418]/50 mt-2 border-t border-gray-100 dark:border-[#2D2D2D] space-y-2">
          <p>
            <strong>{lang === 'it' ? 'Autore:' : 'Author:'}</strong> Ing. Mario Fantini (<a href="https://mariofantini.eu" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">https://mariofantini.eu</a>)<br/>
            <strong>{lang === 'it' ? 'Piattaforme di sviluppo:' : 'Development platforms:'}</strong> Ecosistema Google™<br/>
            <strong>{lang === 'it' ? 'Sistemi supportati:' : 'Supported systems:'}</strong> Android™, Linux, ChromeOS™, WEB, Microsoft Windows, macOS<br/>
          </p>
          <p>
            * Intellectual Property Notice:<br/>
            This software architecture, parsing logic, and source code are the proprietary 
            work of the author. Manifestations of interest for the complete acquisition 
            of commercial rights and ownership buyout are welcome, subject to prior economic 
            agreement, while preserving the historical and moral authorship.<br/>
            Contact: support-livia-editor@googlegroups.com
          </p>
          <p className="border-t border-gray-200 dark:border-[#2D2D2D] pt-2 text-gray-400 dark:text-zinc-500">
            Google Drive™, Google Docs™, Google Workspace™ and Gemini™ are trademarks of Google LLC.
          </p>
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
