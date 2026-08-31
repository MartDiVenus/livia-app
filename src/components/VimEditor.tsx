import React, { useEffect, useRef, useState } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { vim, Vim, getCM } from '@replit/codemirror-vim';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { insertTab } from '@codemirror/commands';
import { foldService, foldCode, unfoldCode } from '@codemirror/language';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { sql } from '@codemirror/lang-sql';
import { rust } from '@codemirror/lang-rust';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { StreamLanguage } from '@codemirror/language';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { go } from '@codemirror/legacy-modes/mode/go';
import { kotlin } from '@codemirror/legacy-modes/mode/clike';

import { VimMode, FileFormat } from '../types';
import { Code, Sparkles, Eye, Edit3, ZoomIn, ZoomOut, Check, X, FileText, Keyboard, Terminal, Maximize2, Minimize2, Info, ChevronUp, Copy, Table, Image as ImageIcon, HardDrive, Cloud, FilePlus } from 'lucide-react';
import { renderRichPreviewContent } from '../utils/previewRenderer';

interface VimEditorProps {
  content: string;
  setContent: (text: string) => void;
  format: FileFormat;
  filename: string;
  theme: 'light' | 'dark' | 'system';
  fileSessionId: number;
  onSyncClipboard: (yankText: string) => void;
  externalClipboardText: () => Promise<string>;
  showLineNumbers: boolean;
  wordWrap: boolean;
  editorFontSize: number;
  setEditorFontSize?: (val: number) => void;
  syntaxHighlightOn: boolean;
  setSyntaxHighlightOn?: (val: boolean) => void;
  onSaveFileState: (name: string, content: string) => void;
  onReadFileState: (name: string) => string | null;
  onOpenFileState?: (targetName: string) => { found: boolean; name: string };
  onCloseFileState?: (force: boolean) => { success: boolean; message: string; isEmptyHistory?: boolean };
  onShowHelp?: (topic?: string) => void;
  onAiCommand?: (action: 'prompt' | 'translate' | 'latin', arg: string, textToProcess: string, isSelection: boolean, onInsert: (newText: string) => void) => Promise<void>;
  lang?: 'it' | 'en';
  setLang?: (lang: 'it' | 'en') => void;
  onOpenGoogleDocsModal?: () => void;
  onOpenSettingsModal?: () => void;
  onModeChange?: (mode: VimMode) => void;
  isSoftKeyboardOpen?: boolean;
  onSoftKeyboardChange?: (isOpen: boolean) => void;
}

export function VimEditor({
  content,
  setContent,
  format,
  filename,
  theme,
  fileSessionId,
  onSyncClipboard,
  externalClipboardText,
  showLineNumbers,
  wordWrap,
  editorFontSize,
  setEditorFontSize,
  syntaxHighlightOn,
  setSyntaxHighlightOn,
  onSaveFileState,
  onReadFileState,
  onOpenFileState,
  onCloseFileState,
  onShowHelp,
  onAiCommand,
  lang = 'en',
  setLang,
  onOpenGoogleDocsModal,
  onOpenSettingsModal,
  onModeChange,
  isSoftKeyboardOpen,
  onSoftKeyboardChange
}: VimEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const isInsertModeRef = useRef(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);

  const fileInputRefTemp = useRef<HTMLInputElement>(null);
  const fileInputRefBase64 = useRef<HTMLInputElement>(null);

  const insertAtCursor = (text: string, offset?: number) => {
    if (!editorRef.current?.view) return;
    const view = editorRef.current.view;
    const pos = view.state.selection.main.head;
    view.dispatch({
        changes: { from: pos, to: pos, insert: text },
        selection: { anchor: pos + (offset !== undefined ? offset : text.length) }
    });
    view.contentDOM.focus();
  };

  const appendToBottom = (text: string) => {
    if (!editorRef.current?.view) return;
    const view = editorRef.current.view;
    const end = view.state.doc.length;
    view.dispatch({
        changes: { from: end, to: end, insert: text }
    });
  };

  const [currentMode, setCurrentMode] = useState<VimMode>('normal');
  const currentModeRef = useRef<VimMode>('normal');
  const flashMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const showFlashMessage = (msg: string, duration = 4000) => {
    setStatusMessage(msg);
    if (flashMessageTimeoutRef.current) clearTimeout(flashMessageTimeoutRef.current);
    flashMessageTimeoutRef.current = setTimeout(() => {
      flashMessageTimeoutRef.current = null;
      setStatusMessage(`-- ${currentModeRef.current.toUpperCase()} MODE --`);
    }, duration);
  };
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice(('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || ''));
  }, []);

  const vimModesList: { key: VimMode; label: string; shortcut: string; descIt: string; descEn: string }[] = [
    { key: 'normal', label: 'NORMAL', shortcut: 'Esc', descIt: 'Comandi e movimenti Vim', descEn: 'Vim navigation & commands' },
    { key: 'insert', label: 'INSERT', shortcut: 'i', descIt: 'Scrittura e digitazione testo', descEn: 'Text typing & editing' },
    { key: 'visual', label: 'VISUAL', shortcut: 'v', descIt: 'Selezione per caratteri', descEn: 'Character-wise selection' },
    { key: 'visual-line', label: 'V-LINE', shortcut: 'V', descIt: 'Selezione intere righe', descEn: 'Line-wise selection' },
  ];

  const handleSelectMode = (newMode: VimMode) => {
    setShowModeMenu(false);
    if (!editorRef.current?.view) return;
    const cm = getCM(editorRef.current.view);
    if (!cm || !Vim) return;

    // 1. Reset sicuro dello stato
    Vim.handleKey(cm, '<Esc>', 'mapping');

    if (newMode === 'normal') return;

    // 2. Transizione di stato sincrona
    let key = '';
    if (newMode === 'insert') key = 'i';
    if (newMode === 'visual') key = 'v';
    if (newMode === 'visual-line') key = 'V';
    
    if (key) {
      Vim.handleKey(cm, key, 'mapping');
    }
    // Nessun trigger di focus() sul DOM: questo evita l'apertura forzata della Gboard.
  };

  const [showPreview, setShowPreview] = useState(false);
  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false);
  const [isMasterCopied, setIsMasterCopied] = useState(false);

  const handleMasterCopy = () => {
    navigator.clipboard.writeText(content);
    setIsMasterCopied(true);
    setTimeout(() => setIsMasterCopied(false), 2000);
  };

  const [previewZoom, setPreviewZoom] = useState(100);
  const [statusMessage, setStatusMessage] = useState(
    lang === 'it' ? 'Benvenuto in LiViA. Premi "i" per scrivere, o :h per la guida.' : 'Welcome to LiViA. Press "i" to write, or :h for help.'
  );

  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const customFoldService = foldService.of((state, lineStart, lineEnd) => {
    const doc = state.doc;
    const line = doc.lineAt(lineStart);
    const text = line.text;
    const trimmed = text.trim();
    
    const latexLevels = ['chapter', 'section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph'];
    
    // 1. egin ... \end
    const beginMatch = trimmed.match(/^\\begin\{([^}]+)\}/);
    if (beginMatch) {
      const envName = beginMatch[1];
      let endLine = line.number;
      let depth = 1;
      for (let i = line.number + 1; i <= doc.lines; i++) {
        const lText = doc.line(i).text.trim();
        if (lText.startsWith(`\\begin{${envName}}`)) depth++;
        if (lText.startsWith(`\\end{${envName}}`)) depth--;
        endLine = i;
        if (depth === 0) break;
      }
      if (endLine > line.number) return { from: line.to, to: doc.line(endLine).to };
    }

    // 2. LaTeX Headings
    const headingMatch = trimmed.match(/^\\(chapter|section|subsection|subsubsection|paragraph|subparagraph)/);
    if (headingMatch) {
      const levelIdx = latexLevels.indexOf(headingMatch[1]);
      let endLine = line.number;
      for (let i = line.number + 1; i <= doc.lines; i++) {
        const lText = doc.line(i).text.trim();
        const nextHeadingMatch = lText.match(/^\\(chapter|section|subsection|subsubsection|paragraph|subparagraph)/);
        if (nextHeadingMatch) {
          const nextLevelIdx = latexLevels.indexOf(nextHeadingMatch[1]);
          if (nextLevelIdx <= levelIdx) break;
        }
        endLine = i;
      }
      if (endLine > line.number) return { from: line.to, to: doc.line(endLine).to };
    }
    
    // 3. Markdown headings
    const mdMatch = trimmed.match(/^(#+)\s/);
    if (mdMatch) {
       const level = mdMatch[1].length;
       let endLine = line.number;
       for (let i = line.number + 1; i <= doc.lines; i++) {
         const lText = doc.line(i).text.trim();
         const nextMdMatch = lText.match(/^(#+)\s/);
         if (nextMdMatch && nextMdMatch[1].length <= level) break;
         endLine = i;
       }
       if (endLine > line.number) return { from: line.to, to: doc.line(endLine).to };
    }
    
    // 4. Code Blocks (def/class/function)
    const isCodeHeading = /^(def |class |function |\{)/.test(trimmed);
    if (isCodeHeading) {
      let endLine = line.number;
      for (let i = line.number + 1; i <= doc.lines; i++) {
        if (/^(def |class |function |\}|\\})/.test(doc.line(i).text.trim())) break;
        endLine = i;
      }
      if (endLine > line.number) return { from: line.to, to: doc.line(endLine).to };
    }
    
    // 5. Indent-based folding fallback
    if (trimmed.length > 0) {
      const indent = text.search(/\S/);
      if (indent >= 0) {
        let nextLineIndent = -1;
        let nextLineNum = line.number + 1;
        while (nextLineNum <= doc.lines) {
          const nextText = doc.line(nextLineNum).text;
          if (nextText.trim().length > 0) {
            nextLineIndent = nextText.search(/\S/);
            break;
          }
          nextLineNum++;
        }

        if (nextLineIndent > indent) {
          let endLine = nextLineNum;
          for (let i = nextLineNum + 1; i <= doc.lines; i++) {
            const lText = doc.line(i).text;
            if (lText.trim().length > 0) {
              if (lText.search(/\S/) <= indent) break;
            }
            endLine = i;
          }
          return { from: line.to, to: doc.line(endLine).to };
        }
      }
    }
    
    return null;
  });

  const extensions = [
    vim({ status: true }),
    
    EditorView.contentAttributes.of({
      inputmode: (isSoftKeyboardOpen === false) ? 'none' : 'text',
    }),

    EditorView.theme({
      "&": {
        fontFamily: 'var(--font-mono)'
      },
      ".cm-content": {
        fontFamily: 'var(--font-mono)'
      },
      ".cm-scroller": {
        fontFamily: 'var(--font-mono)'
      },
      ".cm-tooltip": {
        fontFamily: 'var(--font-mono)'
      }
    }),

    EditorView.updateListener.of((update) => {
      if (update.selectionSet || update.docChanged) {
        const head = update.state.selection.main.head;
        const line = update.state.doc.lineAt(head);
        setCursorPos({ line: line.number, col: head - line.from + 1 });
      }
    }),

    customFoldService,

    Prec.highest(keymap.of([{
       key: 'Tab',
       run: (view) => {
        const cm = (view as any).cm;
        const isInsert = cm?.state?.vim?.insertMode || false;
        if (!isInsert) return false;
        
        // Handle Tab character properly via CodeMirror command
        insertTab(view);
        return true;
      }
    }]))
  ];

  if (syntaxHighlightOn) {
    if (format === 'md' || format === 'docx') extensions.push(markdown({ base: markdownLanguage }));
    else if (format === 'js' || format === 'ts') extensions.push(javascript());
    else if (format === 'py') extensions.push(python());
    else if (format === 'c' || format === 'cpp') extensions.push(cpp());
    else if (format === 'java') extensions.push(java());
    else if (format === 'html') extensions.push(html());
    else if (format === 'css') extensions.push(css());
    else if (format === 'sql') extensions.push(sql());
    else if (format === 'rs') extensions.push(rust());
    else if (format === 'json') extensions.push(json());
    else if (format === 'xml') extensions.push(xml());
    else if (format === 'sh' || format === 'bash') extensions.push(StreamLanguage.define(shell));
    else if (format === 'tex' || format === 'ly') extensions.push(StreamLanguage.define(stex));
    else if (format === 'go') extensions.push(StreamLanguage.define(go));
    else if (format === 'kt') extensions.push(StreamLanguage.define(kotlin));
  }

  if (wordWrap) {
    extensions.push(EditorView.lineWrapping);
  }

  // Handle Tab key overriding CodeMirror defaults in Insert mode
  // The `vim` extension handles Insert mode keymaps, so we let CodeMirror's basicSetup or custom extension handle it.

  useEffect(() => {
    // Custom Vim commands mapping
    
    // Monkey-patch findKey to allow `ng` instead of `ngg` (jump to line n)
    // We only do this once to avoid infinite wrapping.
    if (!(Vim as any)._liviaFindKeyPatched) {
      const origFindKey = Vim.findKey;
      Vim.findKey = function(cm_: any, key: string, origin: string) {
        if (key === 'g' && cm_?.state?.vim?.inputState) {
          const is = cm_.state.vim.inputState;
          if (is.keyBuffer && is.keyBuffer.length > 0) {
            const lastKey = is.keyBuffer[is.keyBuffer.length - 1];
            if (/^[0-9]$/.test(lastKey)) {
              key = 'G';
            }
          }
        }
        return origFindKey.call(this, cm_, key, origin);
      };
      (Vim as any)._liviaFindKeyPatched = true;
    }

    Vim.defineAction('fold', (cm) => {
       if (editorRef.current?.view) foldCode(editorRef.current.view);
    });
    Vim.defineAction('unfold', (cm) => {
       if (editorRef.current?.view) unfoldCode(editorRef.current.view);
    });

    Vim.mapCommand('zc', 'action', 'fold', {}, {});
    Vim.mapCommand('zo', 'action', 'unfold', {}, {});
    
    Vim.defineEx('write', 'w', () => {
      onSaveFileState(filename, content);
      showFlashMessage(lang === 'it' ? `"${filename}" salvato.` : `"${filename}" written.`);
    });
    
    Vim.defineEx('edit', 'e', (cm: any, params: any) => {
      const target = params?.args?.[0];
      if (!target) {
         showFlashMessage(lang === 'it' ? 'Specificare un nome file.' : 'Specify a filename.');
         return;
      }
      if (onOpenFileState) {
         onSaveFileState(filename, content); 
         const res = onOpenFileState(target);
         if (res && res.found) {
            showFlashMessage(lang === 'it' ? `Aperto "${res.name}"` : `Opened "${res.name}"`);
         } else if (res && !res.found) {
            showFlashMessage(lang === 'it' ? `Nuovo file "${res.name}"` : `New file "${res.name}"`);
         }
      }
    });

    Vim.defineEx('quit', 'q', (cm: any, params: any) => {
      const force = params?.argString?.trim() === '!';
      if (onCloseFileState) {
         const res = onCloseFileState(force);
         if (res && res.message) {
            showFlashMessage(res.message);
         }
         if (res && res.closedAll) {
            showFlashMessage(lang === 'it' ? 'Ultimo file chiuso' : 'Last file closed');
         }
      }
    });

    Vim.defineEx('wq', 'wq', (cm: any, params: any) => {
      const force = params?.argString?.trim() === '!';
      onSaveFileState(filename, content);
      if (onCloseFileState) {
         const res = onCloseFileState(true); 
         if (res && res.message) {
            showFlashMessage(res.message);
         }
      }
    });

    Vim.map('ZZ', ':wq<CR>', 'normal');

    Vim.defineEx('model', 'model', (cm: any, params: any) => {
      const currentModel = typeof window !== 'undefined' ? (localStorage.getItem('livia_gemini_model') || 'flash') : 'flash';
      let modelLabel = '3.7 Flash';
      if (currentModel === 'flash-lite') modelLabel = '3.5 Flash-Lite';
      else if (currentModel === 'pro') modelLabel = '3.1 Pro';
      else if (currentModel === 'pro-thinking') modelLabel = lang === 'it' ? 'Pro Esteso (Ragionamento)' : 'Pro Extended (Reasoning)';
      showFlashMessage(lang === 'it' ? `Modello AI in uso: ${modelLabel}` : `Current AI Model: ${modelLabel}`);
    });

    Vim.defineEx('tier', 'tier', (cm: any, params: any) => {
      const currentModel = typeof window !== 'undefined' ? (localStorage.getItem('livia_gemini_model') || 'flash') : 'flash';
      let modelLabel = '3.7 Flash';
      if (currentModel === 'flash-lite') modelLabel = '3.5 Flash-Lite';
      else if (currentModel === 'pro') modelLabel = '3.1 Pro';
      else if (currentModel === 'pro-thinking') modelLabel = lang === 'it' ? 'Pro Esteso (Ragionamento)' : 'Pro Extended (Reasoning)';
      showFlashMessage(lang === 'it' ? `Modello AI in uso: ${modelLabel}` : `Current AI Model: ${modelLabel}`);
    });

    Vim.defineEx('lang', 'lang', (cm: any, params: any) => {
      const arg = params?.argString?.trim()?.replace('?', '');
      if (arg === 'it' || arg === 'it') {
         if (setLang) setLang('it');
         showFlashMessage('✓ Lingua impostata su Italiano (IT).');
      } else if (arg === 'en') {
         if (setLang) setLang('en');
         showFlashMessage('✓ Language set to English (EN).');
      } else {
         const currLangName = lang === 'it' ? 'Italiano (IT)' : 'English (EN)';
         showFlashMessage(lang === 'it' ? `Lingua attiva: ${currLangName}` : `Active Language: ${currLangName}`);
      }
    });

    Vim.defineEx('language', 'language', (cm: any, params: any) => {
      const arg = params?.argString?.trim()?.replace('?', '');
      if (arg === 'it' || arg === 'it') {
         if (setLang) setLang('it');
         showFlashMessage('✓ Lingua impostata su Italiano (IT).');
      } else if (arg === 'en') {
         if (setLang) setLang('en');
         showFlashMessage('✓ Language set to English (EN).');
      } else {
         const currLangName = lang === 'it' ? 'Italiano (IT)' : 'English (EN)';
         showFlashMessage(lang === 'it' ? `Lingua attiva: ${currLangName}` : `Active Language: ${currLangName}`);
      }
    });

    Vim.defineEx('credits', 'credits', (cm: any, params: any) => {
      const customKey = typeof window !== 'undefined' ? localStorage.getItem('livia_custom_gemini_key') : null;
      if (customKey) {
        showFlashMessage(lang === 'it' 
          ? '✓ Chiave API personale attiva. Controlla il consumo esatto su AI Studio.'
          : '✓ Personal API key active. Check exact usage & quotas on AI Studio.');
      } else {
        showFlashMessage(lang === 'it'
          ? '✓ Stai usando la chiave di sistema dei Secret della piattaforma (Gratuita).'
          : '✓ You are using the shared platform Secret API key (Free tier).');
      }
    });

    Vim.defineEx('quota', 'quota', (cm: any, params: any) => {
      const customKey = typeof window !== 'undefined' ? localStorage.getItem('livia_custom_gemini_key') : null;
      if (customKey) {
        showFlashMessage(lang === 'it' 
          ? '✓ Chiave API personale attiva. Controlla il consumo esatto su AI Studio.'
          : '✓ Personal API key active. Check exact usage & quotas on AI Studio.');
      } else {
        showFlashMessage(lang === 'it'
          ? '✓ Stai usando la chiave di sistema dei Secret della piattaforma (Gratuita).'
          : '✓ You are using the shared platform Secret API key (Free tier).');
      }
    });

    Vim.defineEx('set', 'set', (cm: any, params: any) => {
      const param = params?.argString?.trim();
      if (!param) return;
      if (param.includes('model=flash-lite')) {
         if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'flash-lite');
         showFlashMessage(lang === 'it' ? '✓ Modello impostato su 3.5 Flash-Lite.' : '✓ Model set to 3.5 Flash-Lite.');
      } else if (param.includes('model=flash')) {
         if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'flash');
         showFlashMessage(lang === 'it' ? '✓ Modello impostato su 3.7 Flash.' : '✓ Model set to 3.7 Flash.');
      } else if (param.includes('model=pro-thinking')) {
         if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'pro-thinking');
         showFlashMessage(lang === 'it' ? '✓ Modello impostato su Pro Esteso (Ragionamento).' : '✓ Model set to Pro Extended.');
      } else if (param.includes('model=pro')) {
         if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'pro');
         showFlashMessage(lang === 'it' ? '✓ Modello impostato su 3.1 Pro.' : '✓ Model set to 3.1 Pro.');
      } else if (param.includes('lang=it') || param.includes('language=it')) {
         if (setLang) setLang('it');
         showFlashMessage('✓ Lingua impostata su Italiano (IT).');
      } else if (param.includes('lang=en') || param.includes('language=en')) {
         if (setLang) setLang('en');
         showFlashMessage('✓ Language set to English (EN).');
      }
    });

    Vim.defineEx('help', 'h', (cm: any, params: any) => {
      if (onShowHelp) onShowHelp(params?.args?.[0]);
    });

    Vim.defineEx('gemini', 'gem', (cm: any, params: any) => {
      let arg = params?.argString?.trim();
      if (!arg) {
        showFlashMessage(lang === 'it' ? 'Specifica un prompt (es. :gem correggi).' : 'Specify a prompt (e.g. :gem fix errors).');
        return;
      }
      
      const argLower = arg.toLowerCase();
      if (argLower === 'which model' || argLower === 'model' || argLower === 'model?' || argLower === 'tier' || argLower === 'tier?') {
         const currentModel = typeof window !== 'undefined' ? (localStorage.getItem('livia_gemini_model') || 'flash') : 'flash';
      let modelLabel = '3.7 Flash';
      if (currentModel === 'flash-lite') modelLabel = '3.5 Flash-Lite';
      else if (currentModel === 'pro') modelLabel = '3.1 Pro';
      else if (currentModel === 'pro-thinking') modelLabel = lang === 'it' ? 'Pro Esteso (Ragionamento)' : 'Pro Extended (Reasoning)';
      showFlashMessage(lang === 'it' ? `Modello AI in uso: ${modelLabel}` : `Current AI Model: ${modelLabel}`);
         return;
      }
      if (argLower === 'set model=flash-lite' || argLower === 'model flash-lite') {
         if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'flash-lite');
         showFlashMessage(lang === 'it' ? '✓ Modello impostato su 3.5 Flash-Lite.' : '✓ Model set to 3.5 Flash-Lite.');
         return;
      }
      if (argLower === 'set model=flash' || argLower === 'model flash') {
         if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'flash');
         showFlashMessage(lang === 'it' ? '✓ Modello impostato su 3.7 Flash.' : '✓ Model set to 3.7 Flash.');
         return;
      }
      if (argLower === 'set model=pro-thinking' || argLower === 'model pro-thinking') {
         if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'pro-thinking');
         showFlashMessage(lang === 'it' ? '✓ Modello impostato su Pro Esteso (Ragionamento).' : '✓ Model set to Pro Extended.');
         return;
      }
      if (argLower === 'set model=pro' || argLower === 'model pro') {
         if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'pro');
         showFlashMessage(lang === 'it' ? '✓ Modello impostato su 3.1 Pro.' : '✓ Model set to 3.1 Pro.');
         return;
      }
      if (argLower === 'credits' || argLower === 'quota') {
         const customKey = typeof window !== 'undefined' ? localStorage.getItem('livia_custom_gemini_key') : null;
         if (customKey) {
           showFlashMessage(lang === 'it' ? '✓ Chiave API personale attiva.' : '✓ Personal API key active.');
         } else {
           showFlashMessage(lang === 'it' ? '✓ Usando la chiave di sistema (Gratuita).' : '✓ Using shared platform key (Free tier).');
         }
         return;
      }

      if (onAiCommand) {
        const isSelection = cm.somethingSelected();
        const textToProcess = isSelection ? cm.getSelection() : cm.getValue();
        const onInsert = (newText: string) => {
            if (isSelection) cm.replaceSelection(newText);
            else cm.setValue(newText);
        };
        // Log to console to debug just in case
        console.log("Sending AI command prompt:", arg);
        onAiCommand('prompt', arg, textToProcess, isSelection, onInsert);
      }
    });

    Vim.defineEx('ai', 'ai', (cm: any, params: any) => {
      let arg = params?.argString?.trim();
      if (!arg) {
        showFlashMessage(lang === 'it' ? 'Specifica un prompt.' : 'Specify a prompt.');
        return;
      }
      
      const argLower = arg.toLowerCase();
      if (argLower === 'which model' || argLower === 'model' || argLower === 'model?' || argLower === 'tier' || argLower === 'tier?') {
         const currentModel = typeof window !== 'undefined' ? (localStorage.getItem('livia_gemini_model') || 'flash') : 'flash';
      let modelLabel = '3.7 Flash';
      if (currentModel === 'flash-lite') modelLabel = '3.5 Flash-Lite';
      else if (currentModel === 'pro') modelLabel = '3.1 Pro';
      else if (currentModel === 'pro-thinking') modelLabel = lang === 'it' ? 'Pro Esteso (Ragionamento)' : 'Pro Extended (Reasoning)';
      showFlashMessage(lang === 'it' ? `Modello AI in uso: ${modelLabel}` : `Current AI Model: ${modelLabel}`);
         return;
      }
      if (argLower === 'set model=flash-lite' || argLower === 'model flash-lite') {
         if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'flash-lite');
         showFlashMessage(lang === 'it' ? '✓ Modello impostato su 3.5 Flash-Lite.' : '✓ Model set to 3.5 Flash-Lite.');
         return;
      }
      if (argLower === 'set model=flash' || argLower === 'model flash') {
         if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'flash');
         showFlashMessage(lang === 'it' ? '✓ Modello impostato su 3.7 Flash.' : '✓ Model set to 3.7 Flash.');
         return;
      }
      if (argLower === 'set model=pro-thinking' || argLower === 'model pro-thinking') {
         if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'pro-thinking');
         showFlashMessage(lang === 'it' ? '✓ Modello impostato su Pro Esteso (Ragionamento).' : '✓ Model set to Pro Extended.');
         return;
      }
      if (argLower === 'set model=pro' || argLower === 'model pro') {
         if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'pro');
         showFlashMessage(lang === 'it' ? '✓ Modello impostato su 3.1 Pro.' : '✓ Model set to 3.1 Pro.');
         return;
      }

      if (onAiCommand) {
        const isSelection = cm.somethingSelected();
        const textToProcess = isSelection ? cm.getSelection() : cm.getValue();
        const onInsert = (newText: string) => {
            if (isSelection) cm.replaceSelection(newText);
            else cm.setValue(newText);
        };
        console.log("Sending AI command ai:", arg);
        onAiCommand('prompt', arg, textToProcess, isSelection, onInsert);
      }
    });

    Vim.defineEx('translate', 'tr', (cm: any, params: any) => {
      const arg = params?.argString?.trim();
      if (onAiCommand) {
        const isSelection = cm.somethingSelected();
        const textToProcess = isSelection ? cm.getSelection() : cm.getValue();
        const onInsert = (newText: string) => {
           if (isSelection) cm.replaceSelection(newText);
           else cm.setValue(newText);
        };
        console.log("Sending AI command translate:", arg);
        onAiCommand('translate', arg || 'Italian', textToProcess, isSelection, onInsert);
      }
    });

    Vim.defineEx('latin', 'lat', (cm: any, params: any) => {
      const arg = params?.argString?.trim() || 'random';
      if (onAiCommand) {
        const isSelection = cm.somethingSelected();
        const onInsert = (newText: string) => {
           if (isSelection) {
             cm.replaceSelection(newText);
           } else {
             // cm.replaceSelection without a selection will insert at the current cursor position
             cm.replaceSelection(newText + '\n');
           }
        };
        onAiCommand('latin', arg, '', isSelection, onInsert);
      }
    });
  }, [filename, content, lang, onSaveFileState, onShowHelp, onAiCommand]);



  // Track Vim mode
  useEffect(() => {
    const handleVimMode = (e: any) => {
      let m: VimMode = 'normal';
      if (e.mode === 'insert') {
        m = 'insert';
        isInsertModeRef.current = true;
      } else {
        isInsertModeRef.current = false;
      }
      if (e.mode === 'visual') {
        if (e.subMode === 'linewise') m = 'visual-line';
        else m = 'visual';
      }

      if (onModeChange) onModeChange(m);
      setCurrentMode(m);
      currentModeRef.current = m;
      if (!flashMessageTimeoutRef.current) {
        setStatusMessage(`-- ${m.toUpperCase()} MODE --`);
      }
    };
    
    const view = editorRef.current?.view;
    if (view) {
       const cm = getCM(view);
       if (cm && (cm as any).on) {
          (cm as any).on('vim-mode-change', handleVimMode);
          return () => (cm as any).off('vim-mode-change', handleVimMode);
       }
    }
  }, [editorRef.current?.view, onModeChange]);

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0D0F12] text-gray-900 dark:text-[#E0E0E0] transition-colors duration-200 min-w-0 min-h-0 overflow-hidden">
      
      {/* Header Bar */}
      <div className="bg-gray-50 dark:bg-[#16181D] px-4 py-3 sm:px-4 sm:py-2 flex flex-wrap justify-between items-center gap-2 text-lg sm:text-xs text-gray-500 dark:text-zinc-400 border-b border-gray-200 dark:border-[#2D2D2D] font-sans">
        {showPreview && isPreviewFullScreen ? (
          /* PREVIEW FULLSCREEN REPLACEMENT TOOLBAR */
          <>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-zinc-100 font-sans text-sm sm:text-xs uppercase">
                <Sparkles size={16} className="text-[#8AB4F8]" />
                {lang === 'it' ? "Anteprima Formattata" : "Formatted Preview"} ({format.toUpperCase()})
              </span>
              <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-gray-200/80 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold">
                {lang === 'it' ? "Solo Lettura" : "Read Only"}
              </span>
            </div>

            <div className="flex items-center gap-2 font-sans">
              {/* Dedicated Preview Zoom Regulator */}
              <div className="flex items-center gap-0.5 bg-white dark:bg-[#0D0F12] border border-gray-200 dark:border-[#2D2D2D] rounded-xl sm:rounded-lg p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setPreviewZoom(Math.max(50, previewZoom - 10))}
                  className="px-2.5 py-1.5 sm:p-1 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                  title={lang === 'it' ? 'Riduci zoom anteprima (-)' : 'Zoom out preview (-)'}
                >
                  <ZoomOut size={16} className="sm:size-[13px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(100)}
                  className="px-2 py-0.5 text-xs sm:text-[11px] font-mono font-bold text-gray-700 dark:text-zinc-200 hover:text-blue-500 rounded transition-colors cursor-pointer"
                  title={lang === 'it' ? 'Ripristina zoom 100%' : 'Reset zoom to 100%'}
                >
                  {previewZoom}%
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(Math.min(250, previewZoom + 10))}
                  className="px-2.5 py-1.5 sm:p-1 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                  title={lang === 'it' ? 'Aumenta zoom anteprima (+)' : 'Zoom in preview (+)'}
                >
                  <ZoomIn size={16} className="sm:size-[13px]" />
                </button>
              </div>

              {/* Split View Toggle */}
              <button
                type="button"
                onClick={() => setIsPreviewFullScreen(false)}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1 rounded-xl sm:rounded-lg text-sm sm:text-xs font-bold border transition-all cursor-pointer bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-[#8AB4F8] dark:border-blue-900 shadow-xs"
                title={lang === 'it' ? 'Torna a vista affiancata' : 'Switch to split view'}
              >
                <Minimize2 size={16} className="sm:size-[13px]" />
                <span>{lang === 'it' ? 'Vista Affiancata' : 'Split View'}</span>
              </button>

              {/* Close Preview Button */}
              <button
                type="button"
                onClick={() => {
                  setShowPreview(false);
                  setIsPreviewFullScreen(false);
                }}
                className="p-2 sm:p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl sm:rounded-lg transition-colors cursor-pointer"
                title={lang === 'it' ? 'Chiudi anteprima' : 'Close preview'}
              >
                <X size={20} className="sm:size-[16px]" />
              </button>
            </div>
          </>
        ) : (
          /* STANDARD EDITING TOOLBAR */
          <>
            <div className="flex items-center gap-3">
              <span className="font-mono text-gray-800 dark:text-zinc-200 font-bold truncate max-w-[200px] text-base sm:text-xs">
                {filename}
              </span>
            </div>

            <div className="flex items-center gap-2">
              
              {/* Table & Image Inserts (MD/DOCX only) */}
              {(format === 'md' || format === 'docx') && (
                <div className="flex items-center gap-1 bg-white dark:bg-[#0D0F12] border border-gray-200 dark:border-[#2D2D2D] rounded-xl sm:rounded-lg p-0.5 mr-1 relative">
                  
                  {/* Table Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowTableMenu(!showTableMenu); setShowImageMenu(false); }}
                      className={`p-1.5 sm:p-1 rounded-lg transition-colors ${showTableMenu ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                      title={lang === 'it' ? 'Inserisci Tabella' : 'Insert Table'}
                    >
                      <Table size={20} className="sm:size-[14px]" />
                    </button>
                    {showTableMenu && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-lg shadow-xl z-50 overflow-hidden font-sans">
                        <button onClick={() => { 
                          const content = lang === 'it' ? `\n| Colonna 1 | Colonna 2 |\n|---|---|\n| Dato 1 | Dato 2 |\n` : `\n| Column 1 | Column 2 |\n|---|---|\n| Data 1 | Data 2 |\n`;
                          insertAtCursor(content); 
                          setShowTableMenu(false); 
                        }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300">{lang === 'it' ? 'Tabella Semplice (2x2)' : 'Simple Table (2x2)'}</button>
                        
                        <button onClick={() => { 
                          const content = lang === 'it' ? `\n| Colonna 1 | Colonna 2 | Colonna 3 |\n|---|---|---|\n| Dato 1 | Dato 2 | Dato 3 |\n| Dato 4 | Dato 5 | Dato 6 |\n` : `\n| Column 1 | Column 2 | Column 3 |\n|---|---|---|\n| Data 1 | Data 2 | Data 3 |\n| Data 4 | Data 5 | Data 6 |\n`;
                          insertAtCursor(content); 
                          setShowTableMenu(false); 
                        }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300">{lang === 'it' ? 'Tabella Media (3x3)' : 'Medium Table (3x3)'}</button>
                        
                        <button onClick={() => { 
                          const content = lang === 'it' ? `\n| Allineata a Sinistra | Centrata | Allineata a Destra |\n| :--- | :---: | ---: |\n| Testo | Testo | Testo |\n` : `\n| Left Aligned | Centered | Right Aligned |\n| :--- | :---: | ---: |\n| Text | Text | Text |\n`;
                          insertAtCursor(content); 
                          setShowTableMenu(false); 
                        }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300">{lang === 'it' ? 'Tabella con Allineamenti' : 'Table with Alignments'}</button>
                      </div>
                    )}
                  </div>

                  {/* Image Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowImageMenu(!showImageMenu); setShowTableMenu(false); }}
                      className={`p-1.5 sm:p-1 rounded-lg transition-colors ${showImageMenu ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                      title={lang === 'it' ? 'Inserisci Immagine' : 'Insert Image'}
                    >
                      <ImageIcon size={20} className="sm:size-[14px]" />
                    </button>
                    {showImageMenu && (
                      <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-lg shadow-xl z-50 overflow-hidden font-sans flex flex-col">
                            <button onClick={() => { 
                               fileInputRefTemp.current?.click();
                              setShowImageMenu(false);
                            }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                              <FilePlus size={12} className="text-emerald-500" /> {lang === 'it' ? 'File Locale (Rapido/Temporaneo Blob)' : 'Local File (Quick/Temp Blob)'}
                            </button>
                            <button onClick={() => { 
                               fileInputRefBase64.current?.click();
                              setShowImageMenu(false);
                            }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                              <HardDrive size={12} className="text-amber-500" /> {lang === 'it' ? 'File Locale (Incorporato Base64)' : 'Local File (Embedded Base64)'}
                            </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Font Size Adjusters (A- / A+) */}
              {setEditorFontSize && (
                <div className="flex items-center gap-1 bg-white dark:bg-[#0D0F12] border border-gray-200 dark:border-[#2D2D2D] rounded-xl sm:rounded-lg p-0.5 sm:p-0.5">
                  <button
                    type="button"
                    onClick={() => setEditorFontSize(Math.max(12, editorFontSize - 2))}
                    className="px-4 py-3 min-h-[48px] sm:min-h-0 sm:px-1.5 sm:py-0.5 text-lg sm:text-xs font-black text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                    title={lang === 'it' ? 'Riduci dimensione testo' : 'Decrease text size'}
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sizes = [12, 14, 18, 24, 30, 32, 36, 40, 48];
                      const currentIdx = sizes.indexOf(editorFontSize);
                      const nextSize = sizes[(currentIdx + 1) % sizes.length];
                      setEditorFontSize(nextSize);
                    }}
                    className="text-xs sm:text-sm sm:text-[10px] font-mono px-2 sm:px-1 font-bold text-gray-700 dark:text-zinc-300 hover:text-blue-500 cursor-pointer"
                    title={lang === 'it' ? 'Tocca per scorrere dimensioni (12, 14, 18, 24, 30, 32, 36, 40, 48px)' : 'Tap to cycle preset font sizes'}
                  >
                    {editorFontSize}px
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorFontSize(Math.min(48, editorFontSize + 2))}
                    className="px-4 py-3 min-h-[48px] sm:min-h-0 sm:px-1.5 sm:py-0.5 text-lg sm:text-xs font-black text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                    title={lang === 'it' ? 'Aumenta dimensione testo fino a 48px' : 'Increase text size up to 48px'}
                  >
                    A+
                  </button>
                </div>
              )}


              {setSyntaxHighlightOn && (
                <button
                  onClick={() => setSyntaxHighlightOn(!syntaxHighlightOn)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-xl sm:rounded-lg font-bold transition-all shadow-xs active:scale-95 cursor-pointer text-sm sm:text-[10px] uppercase tracking-wide border ${
                    syntaxHighlightOn
                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800/50 dark:text-amber-400 hover:bg-amber-100'
                      : 'bg-white dark:bg-[#0D0F12] text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-[#2D2D2D] hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-200'
                  }`}
                  title={lang === 'it' ? "Attiva/Disattiva Evidenziazione Sintassi (:set syntax=on|off)" : "Toggle Syntax Highlighting (:set syntax=on|off)"}
                  id="toggle-syntax-btn"
                >
                  <Code size={24} className="sm:size-[13px]" />
                  <span className="hidden sm:inline">{lang === 'it' ? `Sintassi: ${syntaxHighlightOn ? 'ON' : 'OFF'}` : `Syntax: ${syntaxHighlightOn ? 'ON' : 'OFF'}`}</span>
                </button>
              )}

              <button
                onClick={() => {
                  const willShow = !showPreview;
                  setShowPreview(willShow);
                  if (willShow) {
                    // Se siamo su schermi piccoli (< 1024px, lg breakpoint Tailwind), attiva automaticamente il full screen
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setIsPreviewFullScreen(true);
                    }
                  } else {
                    setIsPreviewFullScreen(false);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-xl sm:rounded-lg font-bold transition-all shadow-xs active:scale-95 cursor-pointer text-sm sm:text-[10px] uppercase tracking-wide border ${
                  showPreview 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400 hover:bg-emerald-100' 
                    : 'bg-white dark:bg-[#0D0F12] text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-[#2D2D2D] hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-200'
                }`}
                title={lang === 'it' ? "Affianca anteprima ad albero" : "Side-by-side preview"}
                id="toggle-preview-btn"
              >
                {showPreview ? <Edit3 size={24} className="sm:size-[13px]" /> : <Eye size={24} className="sm:size-[13px]" />}
                <span className="hidden sm:inline">{showPreview ? (lang === 'it' ? "Chiudi Anteprima" : "Close Preview") : (lang === 'it' ? "Anteprima" : "Preview")}</span>
              </button>

              {/* Gboard Soft Keyboard Status & Toggle Indicator - moved to top right */}
              {isTouchDevice && onSoftKeyboardChange && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const nextState = !isSoftKeyboardOpen;
                    onSoftKeyboardChange(nextState);
                    
                    // Call focus/blur synchronously within the user event handler
                    // This is strictly required by iOS/Android to show the keyboard reliably.
                    // We also MUST set inputmode synchronously on the DOM node before calling focus,
                    // otherwise the browser will see inputmode="none" during the focus event and suppress the keyboard.
                    if (editorRef.current?.view) {
                      if (nextState) {
                        editorRef.current.view.contentDOM.setAttribute('inputmode', 'text');
                        editorRef.current.view.contentDOM.focus();
                      } else {
                        editorRef.current.view.contentDOM.setAttribute('inputmode', 'none');
                        editorRef.current.view.contentDOM.blur();
                      }
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-xl sm:rounded-lg font-bold transition-all shadow-xs cursor-pointer text-sm sm:text-[10px] uppercase tracking-wide border ${
                    isSoftKeyboardOpen
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/50 dark:text-blue-400 hover:bg-blue-100'
                      : 'bg-white dark:bg-[#0D0F12] text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-[#2D2D2D] hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-200'
                  }`}
                  title={
                    isSoftKeyboardOpen
                      ? (lang === 'it' ? 'Tastiera Gboard attiva: tocca per nascondere' : 'Gboard keyboard active: tap to hide')
                      : (lang === 'it' ? 'Tastiera Gboard nascosta: tocca per aprire' : 'Gboard keyboard hidden: tap to open')
                  }
                  id="header-gboard-toggle-btn"
                >
                  <Keyboard size={24} className="sm:size-[13px]" />
                  <span className="hidden sm:inline">
                    {lang === 'it' ? 'Tastiera' : 'Keyboard'}: {isSoftKeyboardOpen ? 'ON' : 'OFF'}
                  </span>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        <div className={`flex-1 flex relative overflow-hidden bg-gray-50 dark:bg-[#16181D] transition-colors duration-200 min-w-0 min-h-0 ${
          showPreview ? (isPreviewFullScreen ? 'hidden' : 'hidden lg:flex border-r border-gray-200 dark:border-[#1E2127]') : ''
        }`}>
          <div className="flex-1 overflow-auto" style={{ fontSize: `${editorFontSize}px` }}>
            <CodeMirror
              ref={editorRef}
              value={content}
              height="100%"
              theme={
                theme === 'dark' 
                  ? 'dark' 
                  : theme === 'light' 
                    ? 'light' 
                    : (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
              }
              extensions={extensions}
              basicSetup={{
                lineNumbers: showLineNumbers,
                foldGutter: true,
                highlightActiveLine: false,
                highlightSelectionMatches: true,
              }}
              onChange={(val) => setContent(val)}
              className="h-full"
            />
          </div>
        </div>

        {/* Live Formatted Markdown & XML Rich Preview Pane */}
        {(showPreview) && (
          <div className="flex-1 bg-gray-50 dark:bg-[#0D0F12] p-4 sm:p-6 font-mono text-xs overflow-y-auto leading-6 select-text border-l border-gray-200 dark:border-[#1E2127] transition-colors duration-200"
               style={{ fontFamily: '"DejaVu Sans Mono", "Courier New", Courier, monospace' }}>
            
            {!isPreviewFullScreen && (
              <div className="flex flex-wrap justify-between items-center border-b border-gray-200 dark:border-[#2D2D2D] pb-3 mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-700 dark:text-zinc-200 uppercase flex items-center gap-1.5 font-sans">
                    <Sparkles size={13} className="text-[#8AB4F8]" /> {lang === 'it' ? "Anteprima Formattata" : "Formatted Preview"} ({format.toUpperCase()})
                  </span>
                  <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-gray-200/60 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
                    {lang === 'it' ? "Solo Lettura" : "Read Only"}
                  </span>
                </div>

                {/* Preview Zoom & Fullscreen Controls */}
                <div className="flex items-center gap-1.5 font-sans">
                  <div className="flex items-center gap-0.5 bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] rounded-lg p-0.5 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(Math.max(50, previewZoom - 10))}
                      className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <span className="text-[9px] font-mono font-bold px-1 py-0.5 w-9 text-center text-gray-600 dark:text-zinc-400">
                      {previewZoom}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(Math.min(200, previewZoom + 10))}
                      className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <ZoomIn size={13} />
                    </button>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setIsPreviewFullScreen(true)}
                    className="hidden lg:flex p-1.5 bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all items-center justify-center shadow-xs"
                    title="A tutto schermo"
                  >
                    <Maximize2 size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className="p-1.5 bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] text-gray-600 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all flex items-center justify-center shadow-xs ml-1"
                    title="Chiudi anteprima"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            )}

            <div style={{ zoom: `${previewZoom}%` }} className="transition-all duration-200 origin-top-left">
              {renderRichPreviewContent(content, format, theme)}
            </div>
          </div>
        )}
      </div>

      {/* Hidden elements for auxiliary keyboard to trigger keys in CodeMirror */}
      <div className="hidden">
        <button
          id="simulated-key-trigger"
          onClick={(e) => {
             let key = e.currentTarget.getAttribute('data-key');
             if (key && editorRef.current?.view) {
                const cm = getCM(editorRef.current.view);
                if (key === 'Escape') key = '<Esc>';
                if (cm && Vim) {
                   Vim.handleKey(cm, key, 'mapping');
                }
             }
          }}
        />
        <button
          id="simulated-snippet-trigger"
          onClick={(e) => {
             const text = e.currentTarget.getAttribute('data-text');
             const offsetStr = e.currentTarget.getAttribute('data-offset');
             if (text && editorRef.current?.view) {
                const view = editorRef.current.view;
                const pos = view.state.selection.main.head;
                view.dispatch({
                   changes: { from: pos, to: pos, insert: text },
                   selection: { anchor: pos + text.length + (offsetStr ? parseInt(offsetStr) : 0) }
                });
             }
          }}
        />
      </div>
      
          {/* Mode Selection Popover Menu */}
          {showModeMenu && (
            <>
              <div className="fixed inset-0 z-40 bg-black/10 dark:bg-black/40" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModeMenu(false); }} />
              <div className="absolute bottom-6 left-0 z-50 min-w-[210px] bg-white dark:bg-[#1E2127] border border-gray-200 dark:border-[#2C313C] rounded-lg shadow-2xl py-1 text-gray-800 dark:text-[#ABB2BF] text-xs font-sans normal-case animate-in fade-in slide-in-from-bottom-2 duration-150" id="footer-mode-dropdown-menu">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 tracking-wider border-b border-gray-100 dark:border-[#2C313C] flex items-center justify-between">
                  <span>{lang === 'it' ? 'Cambia Modalità' : 'Switch Mode'}</span>
                  <span className="text-[9px] font-mono text-emerald-600 dark:text-[#8AB4F8]">Vim</span>
                </div>
                <div className="py-1">
                  {vimModesList.map((m) => {
                    const isSelected = currentMode === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectMode(m.key); }}
                        className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-emerald-50 dark:hover:bg-[#2C313C] cursor-pointer transition-colors ${isSelected ? 'text-emerald-700 dark:text-[#8AB4F8] font-bold bg-emerald-50/80 dark:bg-[#2C313C]/80' : 'text-gray-700 dark:text-zinc-300'}`}
                      >
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold tracking-wide flex items-center gap-1.5">
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#8AB4F8]"></span>}
                            {m.label}
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-normal">
                            {lang === 'it' ? m.descIt : m.descEn}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-[#0D0F12] border border-gray-200 dark:border-[#3E4451] px-1.5 py-0.5 rounded ml-2">
                          {m.shortcut}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

      <footer className="relative bg-emerald-600 dark:bg-[#21252B] h-6 flex text-[10px] items-center text-white dark:text-[#9DA5B4] font-sans font-medium tracking-wide uppercase shrink-0 w-full overflow-x-auto overflow-y-hidden transition-colors duration-200">
        <div className="relative flex items-center h-full px-2">
          {/* Direct Tap Mode Selector Button */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModeMenu(prev => !prev); }}
            className="bg-white/20 hover:bg-white/30 active:bg-white/40 dark:bg-[#0D0F12] dark:hover:bg-[#1E2127] text-white dark:text-[#8AB4F8] px-2 h-[18px] my-auto flex items-center gap-1 rounded tracking-wider font-mono cursor-pointer transition-all border border-white/25 dark:border-[#8AB4F8]/40 shadow-xs mr-1.5"
            title={lang === 'it' ? 'Tocca per cambiare modalità (NORMAL, INSERT, VISUAL, V-LINE)' : 'Tap to switch mode (NORMAL, INSERT, VISUAL, V-LINE)'}
            id="footer-mode-selector-btn"
          >
            <span>{currentMode === 'normal' ? 'NORMAL' : currentMode === 'visual' ? 'VISUAL' : currentMode === 'visual-line' ? 'V-LINE' : currentMode.toUpperCase()}</span>
            <ChevronUp size={11} className={`transition-transform duration-200 ${showModeMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Direct CMD (:) Button for Mobile */}
          {isTouchDevice && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (editorRef.current?.view) {
                  const view = editorRef.current.view;
                  const cm = getCM(view);
                  if (cm && Vim) {
                    view.contentDOM.focus();
                    Vim.handleKey(cm, '<Esc>', 'mapping');
                    Vim.handleKey(cm, ':', 'mapping');
                  }
                }
              }}
              className="bg-white/20 hover:bg-white/30 active:bg-white/40 dark:bg-[#0D0F12] dark:hover:bg-[#1E2127] text-white dark:text-[#8AB4F8] px-2 h-[18px] my-auto flex items-center gap-1 rounded tracking-wider font-mono cursor-pointer transition-all border border-white/25 dark:border-[#8AB4F8]/40 shadow-xs mr-1.5"
              title={lang === 'it' ? 'Apri riga di comando (:)' : 'Open command line (:)'}
            >
              <span className="font-bold">:</span>
              <span>CMD</span>
            </button>
          )}
          
          
        </div>

        <div className="px-2 text-white dark:text-[#0D0F12] font-semibold tracking-tight truncate hidden sm:block min-w-0">
          {filename}
        </div>
        
        <div className="flex-1 text-white/80 dark:text-zinc-300 italic text-[11px] lowercase normal-case px-2.5 truncate min-w-0">
          {statusMessage}
        </div>
        
        <div className="px-2 font-mono tabular-nums">Ln {cursorPos.line}, Col {cursorPos.col}</div>
        <div className="px-2 hidden sm:block font-mono">UTF-8</div>
        <div className="px-2 font-mono">{format}</div>

      {/* Hidden File Inputs for Image Upload */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRefTemp} 
        className="hidden" 
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            insertAtCursor(`![${file.name}](${url})`);
          }
          if (fileInputRefTemp.current) fileInputRefTemp.current.value = '';
          setShowImageMenu(false);
        }}
       />
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRefBase64} 
        className="hidden" 
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result as string;
              const refName = `img-${Date.now()}`;
              insertAtCursor(`![${file.name}][${refName}]`);
              appendToBottom(`

[${refName}]: ${base64}`);
            };
            reader.readAsDataURL(file);
          }
          if (fileInputRefBase64.current) fileInputRefBase64.current.value = '';
          setShowImageMenu(false);
        }}
       />
      </footer>
    </div>
  );
}
