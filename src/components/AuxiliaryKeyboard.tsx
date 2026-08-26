/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  RotateCw,
  ClipboardCheck,
  Code,
  Copy,
  Scissors,
  Check,
  CornerDownLeft,
  Search,
  Sparkles,
  Keyboard
} from 'lucide-react';
import { VimMode, FileFormat } from '../types';

interface AuxiliaryKeyboardProps {
  mode: VimMode;
  onKeyPress: (key: string) => void;
  onYankCurrent: () => void;
  onPasteCurrent: () => void;
  onCopyAll: () => void;
  format: FileFormat;
  lang: 'it' | 'en';
  onInsertSnippet: (text: string, offset: number) => void;
  isSoftKeyboardOpen?: boolean;
  onToggleSoftKeyboard?: (forceState?: boolean) => void;
}

interface Snippet {
  label: string;
  text: string;
  offset: number; // cursor offset position after insertion
}

const getSnippets = (format: FileFormat, lang: 'it' | 'en'): Snippet[] => {
  switch (format) {
    case 'bash':
      return [
        { label: 'if ... fi', text: 'if [  ]; then\n  \nfi', offset: 4 },
        { label: 'if-else ... fi', text: 'if [  ]; then\n  \nelse\n  \nfi', offset: 4 },
        { label: 'for ... done', text: 'for item in ; do\n  \ndone', offset: 12 },
        { label: 'while ... done', text: 'while [  ]; do\n  \ndone', offset: 7 },
        { label: 'function()', text: 'my_func() {\n  \n}', offset: 0 }
      ];
    case 'tex':
      return [
        { label: 'equation', text: '\\begin{equation}\n  \n\\end{equation}', offset: 19 },
        { label: 'itemize', text: '\\begin{itemize}\n  \\item \n\\end{itemize}', offset: 23 },
        { label: 'section', text: '\\section{}', offset: 9 },
        { label: 'bold', text: '\\textbf{}', offset: 8 }
      ];
    case 'md':
      return [
        { label: 'bold', text: '****', offset: 2 },
        { label: 'italic', text: '**', offset: 1 },
        { label: 'code block', text: '```\n\n```', offset: 4 },
        { label: 'link', text: '[](url)', offset: 1 }
      ];
    case 'py':
      return [
        { label: 'def()', text: 'def function_name():\n    pass', offset: 4 },
        { label: 'class', text: 'class ClassName:\n    def __init__(self):\n        pass', offset: 6 },
        { label: 'try-except', text: 'try:\n    \nexcept Exception as e:\n    pass', offset: 8 }
      ];
    case 'js':
    case 'ts':
      return [
        { label: 'arrow fn', text: 'const fn = () => {\n  \n};', offset: 11 },
        { label: 'class', text: 'class MyClass {\n  constructor() {\n    \n  }\n}', offset: 6 },
        { label: 'log', text: 'console.log();', offset: 12 }
      ];
    case 'xml':
      return [
        { label: 'div', text: '<div>\n  \n</div>', offset: 5 },
        { label: 'span', text: '<span></span>', offset: 6 },
        { label: 'p', text: '<p></p>', offset: 3 }
      ];
    case 'json':
      return [
        { label: 'key-val', text: '"key": "value"', offset: 1 },
        { label: 'object', text: '{\n  \n}', offset: 4 },
        { label: 'array', text: '[\n  \n]', offset: 4 }
      ];
    default:
      return [];
  }
};

export function AuxiliaryKeyboard({
  mode,
  onKeyPress,
  onYankCurrent,
  onPasteCurrent,
  onCopyAll,
  format,
  lang,
  onInsertSnippet,
  isSoftKeyboardOpen = false,
  onToggleSoftKeyboard
}: AuxiliaryKeyboardProps) {
  const snippets = getSnippets(format, lang);

  const isVisual = mode === 'visual' || mode === 'visual-line';

  // Detect whether device is touch/mobile (Android, iOS, tablets) vs Desktop (Debian, Linux, PC)
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    setIsTouchDevice(('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || ''));
  }, []);

  return (
    <div className="bg-gray-100 dark:bg-[#16181D] border-t border-gray-200 dark:border-[#2D2D2D] p-2 select-none font-sans text-xs">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        
        {/* Visual Mode Active Alert Banner */}
        {isVisual && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-900 dark:text-amber-300 font-semibold animate-fadeIn">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span>
                {mode === 'visual-line' 
                  ? (lang === 'it' ? 'Modalità VISUALE RIGA attiva' : 'VISUAL LINE mode active')
                  : (lang === 'it' ? 'Modalità VISUALE attiva' : 'VISUAL mode active')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); onKeyPress('y'); }}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-mono font-bold rounded shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                id="aux-visual-yank"
              >
                <Copy size={13} />
                <span>{lang === 'it' ? 'Copia (y)' : 'Yank (y)'}</span>
              </button>
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); onKeyPress('d'); }}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-mono font-bold rounded shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                id="aux-visual-del"
              >
                <Scissors size={13} />
                <span>{lang === 'it' ? 'Taglia/Elimina (d)' : 'Cut/Delete (d)'}</span>
              </button>
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); onKeyPress('Escape'); }}
                className="px-2.5 py-1 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 font-mono font-bold rounded transition-all active:scale-95 cursor-pointer"
                id="aux-visual-cancel"
              >
                ESC
              </button>
            </div>
          </div>
        )}

        {/* Main Control Strip */}
        <div className="flex flex-wrap items-center justify-start gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#2D2D2D]">
          
          {/* ESC Button */}
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); onKeyPress('Escape'); }}
            className={`min-h-[34px] px-3.5 py-1 text-xs font-bold font-mono rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer border flex items-center justify-center ${
              mode !== 'normal' 
                ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-400' 
                : 'bg-gray-200 text-gray-800 border-gray-300 dark:bg-[#0D0F12] dark:text-zinc-200 dark:border-[#2D2D2D] hover:bg-gray-300 dark:hover:bg-zinc-800'
            }`}
            title={lang === 'it' ? 'Torna a modalità normale (ESC)' : 'Return to normal mode (ESC)'}
            id="aux-esc"
          >
            ESC
          </button>

          {/* Dedicated Gboard / System Keyboard Toggle Switch - only on mobile/touch */}
          {isTouchDevice && onToggleSoftKeyboard && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onToggleSoftKeyboard();
              }}
              className={`min-h-[34px] px-3 py-1 text-xs font-bold rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer border flex items-center gap-1.5 ${
                isSoftKeyboardOpen
                  ? 'bg-blue-600 dark:bg-[#8AB4F8] text-white dark:text-[#0D0F12] border-blue-700 dark:border-blue-300 ring-2 ring-blue-400/30'
                  : 'bg-white dark:bg-[#0D0F12] text-gray-800 dark:text-zinc-200 border-gray-200 dark:border-[#2D2D2D] hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
              title={
                isSoftKeyboardOpen
                  ? (lang === 'it' ? 'Nascondi tastiera Gboard del telefono' : 'Hide Gboard phone keyboard')
                  : (lang === 'it' ? 'Mostra tastiera Gboard per digitare' : 'Show Gboard keyboard to type')
              }
              id="aux-toggle-gboard"
            >
              <Keyboard size={15} className={isSoftKeyboardOpen ? 'text-white dark:text-[#0D0F12]' : 'text-blue-500'} />
              <span>
                {isSoftKeyboardOpen 
                  ? (lang === 'it' ? 'Chiudi Tastiera' : 'Hide Keyboard')
                  : (lang === 'it' ? 'Tastiera Gboard' : 'Gboard Keyboard')}
              </span>
            </button>
          )}

          {/* Mode Switchers */}
          {mode === 'normal' && (
            <div className="flex items-center gap-1 bg-white dark:bg-[#0D0F12] p-1 rounded-lg border border-gray-200 dark:border-[#2D2D2D] shadow-xs">
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); onKeyPress('i'); }}
                className="min-h-[30px] px-2.5 py-0.5 text-xs font-bold font-mono bg-[#8AB4F8] text-[#0D0F12] rounded hover:opacity-90 transition-all active:scale-95 cursor-pointer"
                title={lang === 'it' ? 'Entra in Inserimento (i)' : 'Enter Insert Mode (i)'}
                id="aux-i"
              >
                i (Insert)
              </button>
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); onKeyPress('v'); }}
                className="min-h-[30px] px-2.5 py-0.5 text-xs font-bold font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-[#8AB4F8] hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-all active:scale-95 cursor-pointer"
                title={lang === 'it' ? 'Entra in Visuale (v)' : 'Enter Visual Mode (v)'}
                id="aux-v"
              >
                v (Visual)
              </button>
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); onKeyPress('V'); }}
                className="min-h-[30px] px-2.5 py-0.5 text-xs font-bold font-mono bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-[#8AB4F8] hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-all active:scale-95 cursor-pointer"
                title={lang === 'it' ? 'Entra in Visuale Riga (V)' : 'Enter Visual Line Mode (V)'}
                id="aux-V"
              >
                V (Line)
              </button>
            </div>
          )}

          {/* Dedicated D-PAD Navigation Cluster (h, j, k, l) */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-[#0D0F12] p-1 rounded-lg border border-gray-200 dark:border-[#2D2D2D] shadow-xs">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onKeyPress('h');
              }}
              className="min-h-[30px] px-2 py-0.5 text-xs font-mono font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors text-gray-800 dark:text-zinc-200 cursor-pointer flex items-center gap-1 active:scale-90"
              title={lang === 'it' ? 'Sposta a Sinistra (h)' : 'Move Left (h)'}
              id="aux-h"
            >
              <ArrowLeft size={14} className="text-blue-500" />
              <span>h</span>
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onKeyPress('j');
              }}
              className="min-h-[30px] px-2 py-0.5 text-xs font-mono font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors text-gray-800 dark:text-zinc-200 cursor-pointer flex items-center gap-1 active:scale-90"
              title={lang === 'it' ? 'Sposta in Basso (j)' : 'Move Down (j)'}
              id="aux-j"
            >
              <ArrowDown size={14} className="text-blue-500" />
              <span>j</span>
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onKeyPress('k');
              }}
              className="min-h-[30px] px-2 py-0.5 text-xs font-mono font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors text-gray-800 dark:text-zinc-200 cursor-pointer flex items-center gap-1 active:scale-90"
              title={lang === 'it' ? 'Sposta in Alto (k)' : 'Move Up (k)'}
              id="aux-k"
            >
              <ArrowUp size={14} className="text-blue-500" />
              <span>k</span>
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onKeyPress('l');
              }}
              className="min-h-[30px] px-2 py-0.5 text-xs font-mono font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors text-gray-800 dark:text-zinc-200 cursor-pointer flex items-center gap-1 active:scale-90"
              title={lang === 'it' ? 'Sposta a Destra (l)' : 'Move Right (l)'}
              id="aux-l"
            >
              <span>l</span>
              <ArrowRight size={14} className="text-blue-500" />
            </button>
          </div>

          {/* Quick Word & Line Jump Helpers (w, b, 0, $, gg, G) */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#0D0F12] p-1 rounded-lg border border-gray-200 dark:border-[#2D2D2D] shadow-xs">
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onKeyPress('b'); }}
              className="min-h-[30px] px-2 py-0.5 text-xs font-mono font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors text-gray-800 dark:text-zinc-200 cursor-pointer active:scale-95"
              title={lang === 'it' ? 'Parola Indietro (b)' : 'Backward word (b)'}
              id="aux-b"
            >
              b
            </button>
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onKeyPress('w'); }}
              className="min-h-[30px] px-2 py-0.5 text-xs font-mono font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors text-gray-800 dark:text-zinc-200 cursor-pointer active:scale-95"
              title={lang === 'it' ? 'Avanza Parola (w)' : 'Forward word (w)'}
              id="aux-w"
            >
              w
            </button>
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onKeyPress('0'); }}
              className="min-h-[30px] px-2 py-0.5 text-xs font-mono font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors text-gray-800 dark:text-zinc-200 cursor-pointer active:scale-95"
              title={lang === 'it' ? 'Inizio riga (0)' : 'Start of line (0)'}
              id="aux-zero"
            >
              0
            </button>
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onKeyPress('$'); }}
              className="min-h-[30px] px-2 py-0.5 text-xs font-mono font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors text-gray-800 dark:text-zinc-200 cursor-pointer active:scale-95"
              title={lang === 'it' ? 'Fine riga ($)' : 'End of line ($)'}
              id="aux-dollar"
            >
              $
            </button>
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onKeyPress('gg'); }}
              className="min-h-[30px] px-2 py-0.5 text-xs font-mono font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors text-gray-800 dark:text-zinc-200 cursor-pointer active:scale-95"
              title={lang === 'it' ? "Inizio documento (gg)" : "Top of file (gg)"}
              id="aux-gg"
            >
              gg
            </button>
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onKeyPress('G'); }}
              className="min-h-[30px] px-2 py-0.5 text-xs font-mono font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors text-gray-800 dark:text-zinc-200 cursor-pointer active:scale-95"
              title={lang === 'it' ? "Fine documento (G)" : "End of file (G)"}
              id="aux-G"
            >
              G
            </button>
          </div>

          {/* Deletion triggers dd / dw / x */}
          {mode === 'normal' && (
            <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/20 p-1 rounded-lg border border-red-100 dark:border-red-950/40 shadow-xs">
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); onKeyPress('dd'); }}
                className="min-h-[30px] px-2 py-0.5 text-xs font-mono font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors cursor-pointer active:scale-95"
                title={lang === 'it' ? 'Elimina riga corrente (dd)' : 'Delete line (dd)'}
                id="aux-dd"
              >
                dd
              </button>
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); onKeyPress('dw'); }}
                className="min-h-[30px] px-2 py-0.5 text-xs font-mono font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors cursor-pointer active:scale-95"
                title={lang === 'it' ? 'Elimina parola (dw)' : 'Delete word (dw)'}
                id="aux-dw"
              >
                dw
              </button>
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); onKeyPress('x'); }}
                className="min-h-[30px] px-2 py-0.5 text-xs font-mono font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors cursor-pointer active:scale-95"
                title={lang === 'it' ? 'Cancella carattere (x)' : 'Delete char (x)'}
                id="aux-x"
              >
                x
              </button>
            </div>
          )}

          {/* Search Trigger (/) and Navigation (n, N) */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#0D0F12] p-1 rounded-lg border border-gray-200 dark:border-[#2D2D2D] shadow-xs">
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onKeyPress('/'); }}
              className="min-h-[30px] px-2.5 py-0.5 text-xs font-mono font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded transition-colors cursor-pointer active:scale-95 flex items-center gap-1"
              title={lang === 'it' ? 'Cerca nel testo (/)' : 'Search text (/)'}
              id="aux-search"
            >
              <Search size={12} />
              <span>/</span>
            </button>
            {mode === 'normal' && (
              <>
                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); onKeyPress('n'); }}
                  className="min-h-[30px] px-2 py-0.5 text-xs font-mono font-bold text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer active:scale-95"
                  title={lang === 'it' ? 'Risultato successivo (n)' : 'Next match (n)'}
                  id="aux-next"
                >
                  n
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); onKeyPress('N'); }}
                  className="min-h-[30px] px-2 py-0.5 text-xs font-mono font-bold text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer active:scale-95"
                  title={lang === 'it' ? 'Risultato precedente (N)' : 'Previous match (N)'}
                  id="aux-prev"
                >
                  N
                </button>
              </>
            )}
          </div>

          {/* Command Mode colon (:) */}
          {mode === 'normal' && (
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onKeyPress(':'); }}
              className="min-h-[34px] px-3 py-1 text-xs font-mono font-bold bg-white dark:bg-[#0D0F12] hover:bg-gray-50 dark:hover:bg-[#16181D] text-indigo-600 dark:text-indigo-400 rounded-lg border border-gray-200 dark:border-[#2D2D2D] active:scale-95 cursor-pointer"
              title={lang === 'it' ? 'Riga di comando (:)' : 'Command line (:)'}
              id="aux-colon"
            >
              :
            </button>
          )}

          {/* Undo and Redo triggers (u and .) */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#0D0F12] p-1 rounded-lg border border-gray-200 dark:border-[#2D2D2D] shadow-xs">
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onKeyPress('u'); }}
              className="min-h-[30px] p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer active:scale-90"
              title={lang === 'it' ? 'Annulla ultima modifica (u)' : 'Undo (u)'}
              id="aux-undo"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onKeyPress('.'); }}
              className="min-h-[30px] p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer active:scale-90"
              title={lang === 'it' ? 'Ripeti ultima azione (.)' : 'Redo / repeat action (.)'}
              id="aux-redo"
            >
              <RotateCw size={14} />
            </button>
          </div>

          {/* Yank, Paste, and Clipboard utilities */}
          <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 p-1 rounded-lg border border-emerald-100 dark:border-emerald-950/40 shadow-xs ml-auto">
            {mode === 'normal' && (
              <>
                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); onYankCurrent(); }}
                  className="min-h-[30px] px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded transition-all cursor-pointer active:scale-95"
                  title={lang === 'it' ? 'Copia riga corrente negli appunti' : 'Copy current line'}
                  id="aux-yank"
                >
                  {lang === 'it' ? 'Copia Riga' : 'Copy Line'}
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); onPasteCurrent(); }}
                  className="min-h-[30px] px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded transition-all cursor-pointer active:scale-95"
                  title={lang === 'it' ? 'Incolla dagli appunti' : 'Paste'}
                  id="aux-paste"
                >
                  {lang === 'it' ? 'Incolla' : 'Paste'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onCopyAll}
              className="min-h-[30px] flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded transition-all cursor-pointer active:scale-95"
              title={lang === 'it' ? "Copia l'intero testo negli appunti di sistema" : "Copy entire text to system clipboard"}
              id="aux-copy-all"
            >
              <ClipboardCheck size={14} />
              <span>{lang === 'it' ? 'Copia Tutto' : 'Copy All'}</span>
            </button>
          </div>

        </div>

        {/* Dynamic Context-Aware Smart Code Snippets (Insert Mode) */}
        {mode === 'insert' && snippets.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1.5 border-t border-dashed border-gray-200 dark:border-[#2D2D2D] overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-zinc-500 uppercase font-sans flex items-center gap-1 mr-1 shrink-0">
              <Code size={13} className="text-emerald-600 dark:text-[#8AB4F8]" />
              <span>{lang === 'it' ? 'Snippet:' : 'Snippets:'}</span>
            </span>
            {snippets.map((snip, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onInsertSnippet(snip.text, snip.offset)}
                className="px-2.5 py-1 text-[11px] font-mono font-bold bg-white dark:bg-[#0D0F12] border border-gray-200 dark:border-[#2D2D2D] hover:border-emerald-500 hover:text-emerald-600 dark:hover:border-[#8AB4F8] dark:hover:text-[#8AB4F8] rounded transition-all cursor-pointer text-gray-700 dark:text-zinc-200 active:scale-95 whitespace-nowrap"
                title={lang === 'it' ? `Inserisci ${snip.label}` : `Insert ${snip.label}`}
              >
                {snip.label}
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
