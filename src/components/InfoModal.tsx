/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X, ShieldCheck, Mail, Globe, BookOpen, Sparkles, Check, HelpCircle, FileText } from 'lucide-react';
import { Logo } from './Logo';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'it' | 'en';
  setLang: (lang: 'it' | 'en') => void;
  onOpenPrivacyModal: () => void;
  onOpenTermsModal?: () => void;
  onOpenSupportModal?: () => void;
  onOpenHelp?: () => void;
  onOpenDriveIconsModal?: () => void;
}

export function InfoModal({
  isOpen,
  onClose,
  lang,
  setLang,
  onOpenPrivacyModal,
  onOpenTermsModal,
  onOpenSupportModal,
  onOpenHelp,
}: InfoModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-2xl max-w-lg w-full max-h-[90dvh] shadow-2xl flex flex-col text-gray-800 dark:text-zinc-200 font-sans relative overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Logo and Close Button (Sticky at Top) */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2D2D2D] p-4 bg-gray-50/70 dark:bg-[#121418] shrink-0">
          <div className="flex items-center gap-3">
            <Logo size={32} className="shrink-0" />
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight font-sans">
                LiViA editor
              </h2>
              <span className="text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-[#8AB4F8] px-1.5 py-0.5 rounded">
                v1.0-LiViA
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
            title={lang === 'it' ? 'Chiudi (Esc)' : 'Close (Esc)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs leading-relaxed text-gray-600 dark:text-zinc-300">
          {/* Main Description */}
          <p className="font-medium text-gray-800 dark:text-zinc-100 bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl">
            {lang === 'it'
              ? "Editor di testo super leggero in stile Vim. Supporto per molteplici linguaggi, scorciatoie da tastiera, esportazione PDF, TEX, MD, DOCX. Integrazione con Google Docs™, Google Drive™, Google Gemini™, e un'interfaccia terminale altamente personalizzabile tramite file di configurazione (.lvarc)."
              : "Ultra-lightweight Vim-style text editor. Support for multiple languages, keyboard shortcuts, PDF, TEX, MD, DOCX export. Integration with Google Docs™, Google Drive™, Google Gemini™, and a terminal interface highly customizable via configuration files (.lvarc)."}
          </p>

          {/* Language Switcher Section */}
          <div className="bg-gray-50 dark:bg-[#0D0F12] border border-gray-200/80 dark:border-[#2D2D2D] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Globe size={14} className="text-blue-500" />
                  {lang === 'it' ? 'Lingua dell\'interfaccia:' : 'Interface Language:'}
                </span>
                <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                  {lang === 'it' ? 'in .lvarc o con :set lang=it|en' : 'in .lvarc or via :set lang=it|en'}
                </span>
              </div>
              <div className="flex items-center bg-gray-200/70 dark:bg-[#16181D] p-0.5 rounded-lg border border-gray-300/50 dark:border-[#2D2D2D] font-mono">
                <button
                  type="button"
                  onClick={() => setLang('it')}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    lang === 'it' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'it' && <Check size={12} />} IT
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    lang === 'en' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'en' && <Check size={12} />} EN
                </button>
              </div>
            </div>
          </div>

          {/* Links & Quick Actions */}
          <div className="space-y-2 pt-1">
            {/* Support Center Trigger */}
            {onOpenSupportModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSupportModal();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 text-blue-800 dark:text-[#8AB4F8] transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle size={16} className="text-blue-600 dark:text-[#8AB4F8]" />
                  <span className="font-semibold text-xs">
                    {lang === 'it' ? 'Centro Assistenza & Supporto' : 'Help & Support Center'}
                  </span>
                </div>
                <span className="text-[10px] text-blue-600 dark:text-[#8AB4F8] font-mono">/support &rarr;</span>
              </button>
            )}

            {/* Privacy Policy Trigger */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPrivacyModal();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-xs">
                  {lang === 'it' ? 'Informativa sulla Privacy (Privacy Policy)' : 'Privacy Policy'}
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">/privacy &rarr;</span>
            </button>


            {/* Manual / Help Trigger */}
            {onOpenHelp && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenHelp();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-zinc-800/20 hover:bg-gray-100/50 dark:hover:bg-zinc-800/50 text-gray-800 dark:text-zinc-200 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-gray-600 dark:text-zinc-400" />
                  <span className="font-semibold text-xs">
                    {lang === 'it' ? 'Manuale Utente & Guida Comandi (:he)' : 'User Manual & Command Guide (:he)'}
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono">:help &rarr;</span>
              </button>
            )}

            {/* Support Email Contact */}
            <div className="p-2.5 rounded-xl border border-gray-200 dark:border-[#2D2D2D] bg-gray-50/50 dark:bg-[#0D0F12]/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-gray-500" />
                <div className="flex flex-col">
                  <span className="font-bold text-[11px] text-gray-700 dark:text-zinc-300">
                    {lang === 'it' ? 'Assistenza & Contatto:' : 'Support & Contact:'}
                  </span>
                  <a 
                    href="mailto:support-livia-editor@googlegroups.com"
                    className="text-blue-600 dark:text-[#8AB4F8] hover:underline font-mono text-[11px]"
                  >
                    support-livia-editor@googlegroups.com
                  </a>
                </div>
              </div>
            </div>

            {/* Terms of Service Trigger */}
            {onOpenTermsModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTermsModal();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/50 dark:hover:bg-purple-900/30 text-purple-800 dark:text-purple-300 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-purple-600 dark:text-purple-400" />
                  <span className="font-semibold text-xs">
                    {lang === 'it' ? 'Termini di Servizio e Licenza' : 'Terms of Service & License'}
                  </span>
                </div>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">/terms &rarr;</span>
              </button>
            )}
          </div>

          {/* Tribute to Bram Moolenaar */}
          <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 font-sans">
            <h3 className="text-xs font-bold text-amber-800 dark:text-amber-400 mb-1 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              <span>{lang === 'it' ? 'In Memoria di Bram Moolenaar' : 'In Memory of Bram Moolenaar'}</span>
            </h3>
            <p className="text-[11px] text-gray-700 dark:text-zinc-300 leading-relaxed">
              {lang === 'it'
                ? "In memoria di Bram Moolenaar (1961 - 2023), l'altruista creatore di Vim. LiViA è un piccolo e umile omaggio alla sua filosofia di sviluppo e invita i suoi utenti a sostenere i bambini in Uganda (tramite ICCF Holland)."
                : "In memory of Bram Moolenaar (1961 - 2023), the altruistic creator of Vim. LiViA is a small and humble tribute to his engineering philosophy, encouraging users to support orphans in Uganda (via ICCF Holland)."}
            </p>
          </div>


        </div>

        {/* Footer with Close Button (Sticky at Bottom) */}
        <div className="flex justify-end p-3.5 border-t border-gray-100 dark:border-[#2D2D2D] bg-gray-50/70 dark:bg-[#121418] shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-gray-900 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            {lang === 'it' ? 'Chiudi' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
