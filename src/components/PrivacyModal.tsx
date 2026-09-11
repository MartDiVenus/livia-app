/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, X, FileText, Lock, Globe, Mail, HelpCircle } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'it' | 'en';
  onOpenTermsModal?: () => void;
  onOpenSupportModal?: () => void;
}

export function PrivacyModal({
  isOpen,
  onClose,
  lang,
  onOpenTermsModal,
  onOpenSupportModal
}: PrivacyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden font-sans">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-[#2D2D2D] flex items-center justify-between bg-gray-50/50 dark:bg-[#0D0F12]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {lang === 'it' ? 'Informativa sulla Privacy - LiViA editor' : 'Privacy Policy - LiViA editor'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {lang === 'it' ? 'Ultimo aggiornamento: Luglio 2026' : 'Last updated: July 2026'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
          
          <section className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mb-1 text-sm">
              <Globe size={16} className="text-blue-500" />
              <span>{lang === 'it' ? '1. Informazioni sull\'Applicazione' : '1. Application Overview'}</span>
            </h3>
            <p>
              {lang === 'it'
                ? 'LiViA editor è un editor di testo e codice in stile Vim leggero ed essenziale. Consente la creazione, modifica ed esportazione di documenti in vari formati (.txt, .md, .docx, .py, .kt, .tex).'
                : 'LiViA editor is a lightweight Vim-style text and code editor. It enables creating, editing, and exporting documents in multiple formats (.txt, .md, .docx, .py, .kt, .tex).'}
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-sm">
              <Lock size={16} className="text-emerald-500" />
              <span>{lang === 'it' ? '2. Utilizzo delle Credenziali Google Drive™ & OAuth' : '2. Google Drive™ & OAuth Credentials Usage'}</span>
            </h3>
            <p>
              {lang === 'it'
                ? 'L\'applicazione richiede l\'autorizzazione Google OAuth esclusivamente per consentire all\'utente di aprire e salvare direttamente i propri documenti nel proprio account personale Google Drive™.'
                : 'The application requests Google OAuth scope exclusively to allow users to directly open and save their own documents into their personal Google Drive™ account.'}
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-zinc-400">
              <li>{lang === 'it' ? 'Nessun dato o contenuto di documento viene memorizzato su server terzi o esterni.' : 'No document content or personal data is stored on third-party external servers.'}</li>
              <li>{lang === 'it' ? 'Le credenziali di accesso e i token di sessione risiedono unicamente nella memoria locale del browser dell\'utente.' : 'Access credentials and session tokens remain strictly in the local browser memory of the user.'}</li>
              <li>{lang === 'it' ? 'LiViA editor non vende, condivide o trasferisce alcuna informazione personale a terzi.' : 'LiViA editor does not sell, share, or transfer any personal information to third parties.'}</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-sm">
              <FileText size={16} className="text-indigo-500" />
              <span>{lang === 'it' ? '3. Diritti dell\'Utente e Revoca Accesso' : '3. User Rights & Access Revocation'}</span>
            </h3>
            <p>
              {lang === 'it'
                ? 'L\'utente può scollegare in qualsiasi momento il proprio account Google Drive™ tramite il pulsante "Disconnetti" presente nell\'interfaccia o revocando l\'accesso dalle impostazioni di sicurezza del proprio Account Google (myaccount.google.com/permissions).'
                : 'Users can disconnect their Google Drive™ account at any time using the "Disconnect" button in the interface or by revoking permissions in Google Account Security Settings (myaccount.google.com/permissions).'}
            </p>
          </section>

          <section className="p-3.5 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-200 dark:border-zinc-700">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mb-1 text-sm">
              <Mail size={16} className="text-amber-500" />
              <span>{lang === 'it' ? '4. Contatti per l\'Assistenza' : '4. Support & Contact'}</span>
            </h3>
            <p className="text-gray-600 dark:text-zinc-400">
              {lang === 'it' 
                ? 'Per qualsiasi domanda relativa alla privacy o al funzionamento di LiViA editor, contattare il team di supporto:'
                : 'For any privacy inquiries or support regarding LiViA editor, contact support:'}
            </p>
            <p className="font-mono font-bold text-blue-600 dark:text-blue-400 mt-1">
              support-livia-editor@googlegroups.com
            </p>
          </section>

          {/* Cross Modal Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {onOpenSupportModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSupportModal();
                }}
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-blue-100 transition-all cursor-pointer"
              >
                <HelpCircle size={14} />
                <span>{lang === 'it' ? 'Centro Supporto' : 'Support Center'}</span>
              </button>
            )}

            {onOpenTermsModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTermsModal();
                }}
                className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-purple-100 transition-all cursor-pointer"
              >
                <FileText size={14} />
                <span>{lang === 'it' ? 'Termini di Servizio' : 'Terms of Service'}</span>
              </button>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-[#2D2D2D] bg-gray-50/50 dark:bg-[#0D0F12]/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            {lang === 'it' ? 'Ho Capito' : 'Understood'}
          </button>
        </div>

      </div>
    </div>
  );
}
