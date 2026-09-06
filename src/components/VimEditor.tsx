import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { vim, Vim, getCM } from '@replit/codemirror-vim';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { EditorView, keymap } from '@codemirror/view';
import { Prec, EditorState, Transaction } from '@codemirror/state';
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
import { copyToClipboard } from '../utils/clipboard';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { go } from '@codemirror/legacy-modes/mode/go';
import { kotlin } from '@codemirror/legacy-modes/mode/clike';

import { VimMode, FileFormat, AiProfile } from '../types';
import { registerVimCommands } from '../lib/vimCommands';
import { Code, Sparkles, Eye, Edit3, ZoomIn, ZoomOut, Check, X, FileText, Keyboard, Terminal, Maximize2, Minimize2, Info, ChevronUp, Copy, Table, Image as ImageIcon, HardDrive, Cloud, FilePlus } from 'lucide-react';
import { renderRichPreviewContent } from '../utils/previewRenderer';
import { AiAssistantModal } from './AiAssistantModal';

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
  setShowLineNumbers?: (val: boolean) => void;
  wordWrap: boolean;
  editorFontSize: number;
  setEditorFontSize?: (val: number) => void;
  syntaxHighlightOn: boolean;
  setSyntaxHighlightOn?: (val: boolean) => void;
  onSaveFileState: (name: string, content: string) => void;
  onReadFileState: (name: string) => string | null;
  onOpenFileState?: (targetName: string) => { found: boolean; name: string };
  onTearFileState?: (target: string) => { found: boolean; name: string; content?: string };
  onCloseFileState?: (force: boolean) => { success: boolean; message: string; isEmptyHistory?: boolean };
  onShowHelp?: (topic?: string) => void;
  onAiCommand?: (action: 'prompt' | 'translate' | 'latin', arg: string, textToProcess: string, isSelection: boolean, onInsert: (newText: string, isUpdate?: boolean) => void) => Promise<void>;
  lang?: 'it' | 'en';
  setLang?: (lang: 'it' | 'en') => void;
  onOpenGoogleDocsModal?: () => void;
  onOpenSettingsModal?: () => void;
  onModeChange?: (mode: VimMode) => void;
  isSoftKeyboardOpen?: boolean;
  onSoftKeyboardChange?: (isOpen: boolean) => void;
  aiProfiles?: AiProfile[];
  activeAiProfileId?: string | null;
  setActiveAiProfileId?: (id: string | null) => void;
  onOpenAiProfilesModal?: () => void;
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
  setShowLineNumbers,
  wordWrap,
  editorFontSize,
  setEditorFontSize,
  syntaxHighlightOn,
  setSyntaxHighlightOn,
  onSaveFileState,
  onReadFileState,
  onOpenFileState,
  onTearFileState,
  onCloseFileState,
  onShowHelp,
  onAiCommand,
  lang = 'en',
  setLang,
  onOpenGoogleDocsModal,
  onOpenSettingsModal,
  onModeChange,
  isSoftKeyboardOpen,
  onSoftKeyboardChange,
  aiProfiles,
  activeAiProfileId,
  setActiveAiProfileId,
  onOpenAiProfilesModal
}: VimEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const proxyInputRef = useRef<HTMLTextAreaElement>(null);
  const isInsertModeRef = useRef(false);
  const setContentRef = useRef(setContent);
  useEffect(() => {
    setContentRef.current = setContent;
  }, [setContent]);

  // State for AI Assistant Modal (optimized for mobile touch screens)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalContext, setAiModalContext] = useState<{
    selectionText: string;
    hasSelection: boolean;
    docLength: number;
    selFrom?: number;
    selTo?: number;
  }>({ selectionText: '', hasSelection: false, docLength: 0 });

  const handleOpenAiModal = useCallback(() => {
    const view = editorRef.current?.view;
    if (view) {
      const sel = view.state.selection.main;
      let hasSel = !sel.empty;
      let selText = hasSel ? view.state.sliceDoc(sel.from, sel.to) : '';
      let selFrom = sel.from;
      let selTo = sel.to;

      // If no CodeMirror selection, check Vim marks '<' and '>'
      const cm = getCM(view);
      if (!hasSel && (cm as any)?.state?.vim?.marks) {
        try {
          const mStart = (cm as any).state.vim.marks['<']?.find?.();
          const mEnd = (cm as any).state.vim.marks['>']?.find?.();
          if (mStart && mEnd) {
            let s = mStart;
            let e = mEnd;
            if (s.line > e.line || (s.line === e.line && s.ch > e.ch)) {
              s = mEnd;
              e = mStart;
            }
            const rangeText = (cm as any).getRange(s, { line: e.line, ch: e.ch + 1 });
            if (rangeText && rangeText.length > 0) {
              hasSel = true;
              selText = rangeText;
              const startLine = view.state.doc.line(s.line + 1);
              const endLine = view.state.doc.line(e.line + 1);
              selFrom = Math.min(startLine.from + s.ch, view.state.doc.length);
              selTo = Math.min(endLine.from + e.ch + 1, view.state.doc.length);
            }
          }
        } catch {}
      }

      setAiModalContext({
        selectionText: selText,
        hasSelection: hasSel,
        docLength: view.state.doc.length,
        selFrom,
        selTo
      });
    } else {
      setAiModalContext({
        selectionText: '',
        hasSelection: false,
        docLength: content.length
      });
    }
    setIsAiModalOpen(true);
  }, [content.length]);

  const handleExecuteAiModal = async (
    action: 'prompt' | 'translate' | 'latin',
    arg: string,
    targetMode: 'selection' | 'document' | 'cursor',
    modelTier?: 'flash' | 'flash-lite' | 'pro'
  ) => {
    const view = editorRef.current?.view;
    if (!view) throw new Error(lang === 'it' ? "Editor non pronto." : "Editor not ready.");

    const userApiKey = typeof window !== 'undefined' ? localStorage.getItem('livia_custom_gemini_key') || undefined : undefined;
    let systemInstruction: string | undefined = undefined;
    if (activeAiProfileId && aiProfiles) {
      const p = aiProfiles.find(x => x.id === activeAiProfileId);
      if (p) systemInstruction = p.instruction;
    }

    let textToProcess = "";
    if (targetMode === 'selection') {
      textToProcess = aiModalContext.selectionText || (aiModalContext.selFrom !== undefined && aiModalContext.selTo !== undefined ? view.state.sliceDoc(aiModalContext.selFrom, aiModalContext.selTo) : "");
      if (!textToProcess) {
        textToProcess = view.state.doc.toString();
      }
    } else if (targetMode === 'document') {
      textToProcess = view.state.doc.toString();
    } else {
      textToProcess = "";
    }

    let storedTier = typeof window !== 'undefined' ? localStorage.getItem('livia_gemini_model') || 'flash' : 'flash';
    if (storedTier.includes('2.5') || storedTier.includes('2.0') || storedTier.includes('1.5') || storedTier.includes('3.7')) {
      storedTier = 'flash';
      if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'flash');
    }

    const finalTier = modelTier || storedTier;

    const payload: any = {
      action,
      text: textToProcess,
      userApiKey,
      systemInstruction,
      modelTier: finalTier
    };
    if (action === 'translate') payload.targetLanguage = arg;
    if (action === 'prompt') {
      payload.prompt = arg;
    }
    if (action === 'latin') payload.theme = arg;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const res = await fetch("/api/gemini/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let errData: any = {};
      try { errData = await res.json(); } catch(e){}
      const errMsg = errData.error || res.statusText || (lang === 'it' ? 'Errore generazione IA' : 'AI Generation Error');
      throw new Error(errMsg);
    }

    const data = await res.json();
    const resultText = data.result || "";

    if (!resultText) {
      showFlashMessage(lang === 'it' ? "L'IA non ha restituito alcun testo." : "AI returned empty response.");
      return true;
    }

    // Dispatch changes directly into CodeMirror 6
    (window as any).isVimHandling = true;
    try {
      if (targetMode === 'selection' && aiModalContext.selFrom !== undefined && aiModalContext.selTo !== undefined && aiModalContext.selTo <= view.state.doc.length) {
        view.dispatch({
          changes: { from: aiModalContext.selFrom, to: aiModalContext.selTo, insert: resultText },
          selection: { anchor: aiModalContext.selFrom + resultText.length, head: aiModalContext.selFrom + resultText.length }
        });
      } else if (targetMode === 'document') {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: resultText },
          selection: { anchor: 0, head: 0 }
        });
      } else {
        const pos = aiModalContext.selTo !== undefined ? aiModalContext.selTo : view.state.selection.main.head;
        view.dispatch({
          changes: { from: pos, to: pos, insert: resultText },
          selection: { anchor: pos + resultText.length, head: pos + resultText.length }
        });
      }
    } finally {
      (window as any).isVimHandling = false;
    }

    // Exit Vim visual mode if active
    try {
      const cm = getCM(view);
      if (cm && (cm as any).state?.vim?.visualMode) {
        Vim.exitVisualMode(cm as any, false);
      }
    } catch {}

    const newDocStr = view.state.doc.toString();
    setContent(newDocStr);
    onSaveFileState(filename, newDocStr);

    setTimeout(() => {
      if (editorRef.current?.view) {
        const v = editorRef.current.view;
        v.requestMeasure();
        const head = v.state.selection.main.head;
        v.dispatch({
          effects: EditorView.scrollIntoView(head, { y: 'center' })
        });
        v.contentDOM.focus();
      }
    }, 60);

    showFlashMessage(lang === 'it' ? `IA: Inseriti ${resultText.length} caratteri con successo!` : `AI: Inserted ${resultText.length} characters successfully!`);
    return true;
  };

  // Synchronize CodeMirror internal document if external content changes without remounting
  useEffect(() => {
    if (editorRef.current?.view) {
      const view = editorRef.current.view;
      const currentDoc = view.state.doc.toString();
      if (currentDoc !== content) {
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: content }
        });
      }
    }
  }, [content, filename, fileSessionId]);

  const handleEditorChange = useCallback((val: string) => {
    if (setContentRef.current) setContentRef.current(val);
  }, []);
  const lastKeydownRef = useRef<{key: string, time: number}>({key: '', time: 0});
  const isTouchDeviceRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
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
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
    setIsTouchDevice(isTouch);
    isTouchDeviceRef.current = isTouch;

    // Refresh CodeMirror metrics as soon as webfonts are loaded
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (editorRef.current?.view) {
          editorRef.current.view.requestMeasure();
        }
      });
    }
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
      (window as any).isVimHandling = true;
      Vim.handleKey(cm, key, 'mapping');
      (window as any).isVimHandling = false;
    }
    
    if (isTouchDeviceRef.current) {
      editorRef.current?.view?.contentDOM.focus();
    }
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

  const extensions = useMemo(() => {
    const exts = [
    vim({ status: true }),
    
    EditorView.domEventHandlers({
      focus(event, view) {
        // Keep focus directly in CodeMirror
      },
      touchstart(event, view) {
        if (!isTouchDeviceRef.current) return false;
        if (event.touches.length === 1) {
          touchStartRef.current = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
            time: Date.now()
          };
        }
        return false;
      },
      touchend(event, view) {
        if (!isTouchDeviceRef.current) return false;
        if (touchStartRef.current && event.changedTouches.length === 1) {
          const touch = event.changedTouches[0];
          const dx = Math.abs(touch.clientX - touchStartRef.current.x);
          const dy = Math.abs(touch.clientY - touchStartRef.current.y);
          const dt = Date.now() - touchStartRef.current.time;
          touchStartRef.current = null;

          // Check if there is already an active non-collapsed text selection range
          const sel = view.state.selection.main;
          const domSel = window.getSelection ? window.getSelection() : null;
          const hasActiveRange = (!sel.empty) || (domSel && !domSel.isCollapsed && domSel.toString().length > 0);

          // Quick tap detection (< 12px drag, < 350ms duration)
          // Preserves native Android drag handles and selection extension gestures!
          if (!hasActiveRange && dx < 12 && dy < 12 && dt < 350) {
            const pos = view.posAtCoords({ x: touch.clientX, y: touch.clientY }, false);
            if (pos !== null) {
              view.dispatch({
                selection: { anchor: pos, head: pos },
                scrollIntoView: false
              });
              if (!view.hasFocus) {
                view.contentDOM.focus();
              }
            }
          }
        }
        return false;
      },
      keydown(event, view) {
        if (!isTouchDeviceRef.current) return;
        lastKeydownRef.current = { key: event.key, time: Date.now() };
        
        if (!isInsertModeRef.current) {
          // Attempt to aggressively intercept the keydown and process it via Vim
          // This prevents Gboard composition if the browser respects preventDefault on keydown
          if (event.key && event.key !== 'Unidentified' && event.key !== 'Process') {
            event.preventDefault();
            const cm = getCM(view);
            if (cm && Vim) {
              (window as any).isVimHandling = true;
              Vim.handleKey(cm, event.key, 'mapping');
              (window as any).isVimHandling = false;
            }
            return true;
          }
        }
      },
      beforeinput(event, view) {
        if (!isTouchDeviceRef.current) return;

        if (!isInsertModeRef.current) {
          const timeSinceKeydown = Date.now() - lastKeydownRef.current.time;
          const wasRealKey = lastKeydownRef.current.key !== 'Unidentified' && lastKeydownRef.current.key !== 'Process' && lastKeydownRef.current.key !== '';
          
          if (timeSinceKeydown < 100 && wasRealKey) {
            // Key was typed on a physical keyboard attached to mobile
            event.preventDefault();
            return true;
          }

          // Soft keyboard (Gboard) typing directly without a valid keydown
          event.preventDefault();
          const cm = getCM(view);
          if (cm && Vim) {
            (window as any).isVimHandling = true;
            if (event.data) {
              for (const c of event.data) {
                Vim.handleKey(cm, c, 'mapping');
              }
            } else if (event.inputType === 'deleteContentBackward') {
              Vim.handleKey(cm, '<Backspace>', 'mapping');
            } else if (event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph') {
              Vim.handleKey(cm, '<Enter>', 'mapping');
            }
            (window as any).isVimHandling = false;
          }
          return true;
        }
        return false;
      }
    }),

    EditorView.contentAttributes.of({
      inputmode: (isTouchDeviceRef.current && isSoftKeyboardOpen === false) ? 'none' : 'text',
      autocorrect: 'off',
      autocapitalize: 'none',
      spellcheck: 'false',
      'data-gramm': 'false'
    }),
    
    // STRICT MOBILE FIX: Prevent soft keyboard from modifying document in NORMAL/VISUAL mode
    EditorState.transactionFilter.of((tr) => {
      if (isTouchDeviceRef.current && !isInsertModeRef.current && tr.docChanged) {
        // Se la modifica al documento NON proviene esplicitamente da un comando Vim,
        // ma arriva (ad esempio) dal DOM observer di CodeMirror che cerca di sincronizzare
        // una modifica fatta dalla tastiera Gboard in modalità composition, bloccala!
        if (!(window as any).isVimHandling) {
          return [];
        }
      }
      return tr;
    }),



    EditorView.theme({
      "&": {
        fontFamily: 'var(--font-mono)'
      },
      ".cm-content": {
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0px'
      },
      ".cm-line": {
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0px'
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

    Prec.highest(keymap.of([
      {
        key: 'ArrowLeft',
        run: (view) => {
          if (!isInsertModeRef.current) {
            const cm = getCM(view);
            if (cm && Vim) { Vim.handleKey(cm, 'h', 'mapping'); return true; }
          }
          return false;
        }
      },
      {
        key: 'ArrowRight',
        run: (view) => {
          if (!isInsertModeRef.current) {
            const cm = getCM(view);
            if (cm && Vim) { Vim.handleKey(cm, 'l', 'mapping'); return true; }
          }
          return false;
        }
      },
      {
        key: 'ArrowUp',
        run: (view) => {
          if (!isInsertModeRef.current) {
            const cm = getCM(view);
            if (cm && Vim) { Vim.handleKey(cm, 'k', 'mapping'); return true; }
          }
          return false;
        }
      },
      {
        key: 'ArrowDown',
        run: (view) => {
          if (!isInsertModeRef.current) {
            const cm = getCM(view);
            if (cm && Vim) { Vim.handleKey(cm, 'j', 'mapping'); return true; }
          }
          return false;
        }
      },
      {
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
    if (format === 'md' || format === 'docx') exts.push(markdown({ base: markdownLanguage }));
    else if (format === 'js' || format === 'ts') exts.push(javascript());
    else if (format === 'py') exts.push(python());
    else if (format === 'c' || format === 'cpp') exts.push(cpp());
    else if (format === 'java') exts.push(java());
    else if (format === 'html') exts.push(html());
    else if (format === 'css') exts.push(css());
    else if (format === 'sql') exts.push(sql());
    else if (format === 'rs') exts.push(rust());
    else if (format === 'json') exts.push(json());
    else if (format === 'xml') exts.push(xml());
    else if (format === 'sh' || format === 'bash') exts.push(StreamLanguage.define(shell));
    else if (format === 'tex' || format === 'ly') exts.push(StreamLanguage.define(stex));
    else if (format === 'go') exts.push(StreamLanguage.define(go));
    else if (format === 'kt') exts.push(StreamLanguage.define(kotlin));
  }

  if (wordWrap) {
    exts.push(EditorView.lineWrapping);
  }
  return exts;
  }, [isSoftKeyboardOpen, syntaxHighlightOn, format, wordWrap]);

  // Handle Tab key overriding CodeMirror defaults in Insert mode
  // The `vim` extension handles Insert mode keymaps, so we let CodeMirror's basicSetup or custom extension handle it.

  useEffect(() => {
    // Custom Vim commands mapping
    
    // Monkey-patch findKey to allow `ng` instead of `ngg` (jump to line n)
    // We only do this once to avoid infinite wrapping.
    // Removed old Vim.map for arrow keys as they don't work reliably
    // Map G in visual mode to select to the very end of the last line
    // Map G in visual mode to select to the very end of the last line
    Vim.defineMotion("gotoEndFull", (cm, head, motionArgs) => {
      const lastLine = cm.lineCount() - 1;
      const lastCh = cm.getLine(lastLine).length;
      return { line: lastLine, ch: lastCh };
    });
    Vim.mapCommand("G", "motion", "gotoEndFull", {}, { context: "visual" });
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

    registerVimCommands({
      lang,
      filename,
      content,
      onSaveFileState,
      onCloseFileState,
      onShowHelp,
      onAiCommand,
      setLang,
      showFlashMessage,
      setShowLineNumbers,
      onOpenAiAssistant: handleOpenAiModal
    });
  }, [filename, content, lang, onSaveFileState, onShowHelp, onAiCommand, setShowLineNumbers, handleOpenAiModal]);



  // Patch Vim's openDialog on mobile to use native prompt (fixes focus/keyboard issues)
  useEffect(() => {
    const patchDialog = () => {
       if (editorRef.current?.view && isTouchDeviceRef.current) {
          const cm = getCM(editorRef.current.view);
          if (cm && !(cm as any)._dialogPatched) {
             (cm as any)._dialogPatched = true;
             cm.openDialog = (template: any, callback: any, options: any) => {
            let shortText = "";
            if (typeof options?.prefix === "string" && options.prefix) {
               shortText += options.prefix;
            } else if (options?.prefix?.textContent) {
               shortText += options.prefix.textContent;
            } else if (typeof template === 'string') {
               shortText += template.replace(/<[^>]+>/g, '');
            } else if (template?.textContent) {
               shortText += template.textContent;
            }
            if (options?.desc) shortText += " " + options.desc;
            
            shortText = shortText.replace(/\(.*?regexp.*?\)/i, '').replace(/javascript regexp/i, '').replace(/regexp/i, '').trim();
            if (!shortText) shortText = "Command/Search:";
            
            const isSearch = options?.prefix === '/' || options?.prefix === '?' || shortText.startsWith('/') || shortText.startsWith('?');
            
            let result = window.prompt(shortText, options?.value || "");
            if (result !== null) {
              if (callback) {
                 try {
                    // Do not wrap in custom cm.operation which suppresses scrollIntoView
                    callback(result);
                 } catch(e: any) {
                    console.error("Dialog callback error", e);
                 }
              }
              
              if (isSearch) {
                // Ensure editor scrolls the matched cursor position directly into view (centered on screen)
                const scrollToCurrentMatch = () => {
                  if (editorRef.current?.view) {
                    const v = editorRef.current.view;
                    v.requestMeasure();
                    const head = v.state.selection.main.head;
                    v.dispatch({
                      effects: EditorView.scrollIntoView(head, { y: 'center' })
                    });
                  }
                };
                scrollToCurrentMatch();
                setTimeout(scrollToCurrentMatch, 50);
                setTimeout(scrollToCurrentMatch, 150);
                setTimeout(scrollToCurrentMatch, 300);
              }
            } else {
              // User clicked Cancel on prompt dialog: return cleanly to Normal mode
              if (cm && Vim) {
                try {
                  Vim.handleKey(cm, '<Esc>', 'mapping');
                } catch {}
              }
            }
            
            if (!result?.toLowerCase().startsWith('help') && !result?.toLowerCase().startsWith('h')) {
              setTimeout(() => {
                if (editorRef.current?.view) {
                  editorRef.current.view.contentDOM.focus();
                }
              }, 50);
            } else {
              setTimeout(() => {
                if (editorRef.current?.view) {
                  editorRef.current.view.contentDOM.blur();
                }
              }, 50);
            }
            
            return () => {}; // Return a dummy close function
             };
          }
       }
    };
    
    // Try patching immediately and also set a few fallbacks
    patchDialog();
    const interval = setInterval(patchDialog, 500);
    return () => clearInterval(interval);
  }, [isTouchDevice]);

      // Track Vim mode and fix search panel UI globally
  useEffect(() => {
    let observer: MutationObserver | null = null;
    if (editorRef.current?.view?.dom) {
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            const panels = document.querySelectorAll('.cm-panel input, .cm-vim-panel input');
            panels.forEach(input => {
              if (!input.hasAttribute('data-vim-fixed')) {
                input.setAttribute('autocomplete', 'off');
                input.setAttribute('autocorrect', 'off');
                input.setAttribute('autocapitalize', 'off');
                input.setAttribute('spellcheck', 'false');
                input.setAttribute('data-form-type', 'other');
                input.setAttribute('data-vim-fixed', 'true');
                
                input.addEventListener('keydown', (e: Event) => {
                  const ke = e as KeyboardEvent;
                  if (ke.key === 'Enter') {
                    const scrollMatch = () => {
                      if (editorRef.current?.view) {
                        const v = editorRef.current.view;
                        v.requestMeasure();
                        const head = v.state.selection.main.head;
                        v.dispatch({
                          effects: EditorView.scrollIntoView(head, { y: 'center' })
                        });
                      }
                    };
                    scrollMatch();
                    setTimeout(scrollMatch, 50);
                    setTimeout(scrollMatch, 150);
                    setTimeout(scrollMatch, 300);
                  }
                });
                
                const parent = input.parentElement;
                if (parent) {
                  // Hide any span that contains "regexp" text
                  const spans = parent.querySelectorAll('span');
                  spans.forEach(span => {
                    if (span.textContent?.toLowerCase().includes('regexp')) {
                      span.style.display = 'none';
                    }
                  });
                  // Also check direct text nodes just in case
                  parent.childNodes.forEach(node => {
                     if (node.nodeType === 3) {
                        let text = node.textContent || '';
                        if (text.toLowerCase().includes('regexp')) {
                           node.textContent = text.replace(/\(.*?regexp.*?\)/i, '').replace(/javascript regexp/i, '').replace(/regexp/i, '');
                        }
                     }
                  });
                }
              }
            });
          }
        }
      });
      observer.observe(editorRef.current.view.dom, { childList: true, subtree: true });
    }

    const handleVimMode = (e: any) => {
      let m: VimMode = 'normal';
      if (e.mode === 'insert') {
        m = 'insert';
        isInsertModeRef.current = true;
        onSoftKeyboardChange?.(true);
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
    
    const handleVimKeyPress = (key: string) => {
      if (key === 'n' || key === 'N') {
        const scrollToCurrentMatch = () => {
          if (editorRef.current?.view) {
            const v = editorRef.current.view;
            v.requestMeasure();
            const head = v.state.selection.main.head;
            v.dispatch({
              effects: EditorView.scrollIntoView(head, { y: 'center' })
            });
          }
        };
        scrollToCurrentMatch();
        setTimeout(scrollToCurrentMatch, 50);
        setTimeout(scrollToCurrentMatch, 150);
      }
    };

    const view = editorRef.current?.view;
    if (view) {
       const cm = getCM(view);
       if (cm && (cm as any).on) {
          (cm as any).on('vim-mode-change', handleVimMode);
          (cm as any).on('vim-keypress', handleVimKeyPress);
          return () => {
             (cm as any).off('vim-mode-change', handleVimMode);
             (cm as any).off('vim-keypress', handleVimKeyPress);
          };
       }
    }
  }, [editorRef.current?.view, onModeChange]);

  const basicSetupOptions = useMemo(() => ({
    lineNumbers: showLineNumbers,
    foldGutter: true,
    highlightActiveLine: false,
    highlightSelectionMatches: !isTouchDevice,
  }), [showLineNumbers, isTouchDevice]);

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
          <div className={`flex-1 overflow-hidden ${currentMode === 'insert' ? 'cm-mode-insert' : 'cm-mode-' + currentMode}`} style={{ fontSize: `${editorFontSize}px` }}>
            <CodeMirror
              key={`${filename}_${fileSessionId}`}
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
              basicSetup={basicSetupOptions}
              onChange={handleEditorChange}
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

      {/* Proxy input for Vim commands on mobile */ }
      <textarea
        ref={proxyInputRef}
        id="vim-hidden-textarea"
        name="vim-hidden-textarea"
        autoCapitalize="none"

        autoCorrect="off"
        spellCheck={false}
        data-gramm="false"
        data-form-type="other"
        data-lpignore="true"
        data-1p-ignore="true"
        data-bwignore="true"
        autoComplete="new-password"
        className="opacity-0 fixed top-1/2 left-1/2 w-px h-px -z-10 resize-none p-0 m-0 border-0"
        onInput={(e) => {
          const val = e.currentTarget.value;
          if (val) {
            const cm = getCM(editorRef.current?.view);
            if (cm && Vim) {
              (window as any).isVimHandling = true;
              for (const c of val) {
                Vim.handleKey(cm, c, 'mapping');
              }
              (window as any).isVimHandling = false;
            }
            e.currentTarget.value = '';
          }
        }}
        onKeyDown={(e) => {
          const cm = getCM(editorRef.current?.view);
          if (!cm || !Vim) return;
          let key = '';
          if (e.key === 'Backspace') key = '<Backspace>';
          else if (e.key === 'Enter') key = '<Enter>';
          else if (e.key === 'Escape') key = '<Esc>';
          
          if (key) {
             (window as any).isVimHandling = true;
             Vim.handleKey(cm, key, 'mapping');
             (window as any).isVimHandling = false;
          }
        }}
      />
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
                   if (key === ':') {
                     let cmd = window.prompt(lang === 'it' ? 'Inserisci comando Vim (es. w, q, tear local)' : 'Enter Vim command (e.g. w, q, tear local)');
                     if (cmd !== null) {
                        cmd = cmd.trim();
                        if (cmd.startsWith(':')) {
                          cmd = cmd.substring(1).trim();
                        }
                        if (cmd) {
                          try {
                            Vim.handleEx(cm as any, cmd);
                          } catch(e) {
                            console.error('Vim handleEx error', e);
                            alert('Errore: ' + e.message);
                          }
                        }
                        // Do not forcefully regain focus if the command was 'help', to avoid virtual keyboard popping up
                        if (!cmd.toLowerCase().startsWith('help') && !cmd.toLowerCase().startsWith('h')) {
                          setTimeout(() => {
                            if (editorRef.current?.view) {
                              editorRef.current.view.contentDOM.focus();
                            }
                          }, 50);
                        }
                        
                        // Async test
                        if (cmd === 'testasync') {
                           setTimeout(() => {
                              try {
                                 cm.operation(() => {
                                   cm.replaceSelection("ASYNC TEST RESULT\n");
                                 });
                                 cm.scrollIntoView(cm.getCursor());
                              } catch(e) {
                                 alert("Async insert error: " + e.message);
                              }
                           }, 2000);
                        }
                     }
                   } else {
                     Vim.handleKey(cm, key, 'mapping');
                     if (key === 'n' || key === 'N') {
                       const scrollMatch = () => {
                         if (editorRef.current?.view) {
                           const v = editorRef.current.view;
                           v.requestMeasure();
                           const head = v.state.selection.main.head;
                           v.dispatch({
                             effects: EditorView.scrollIntoView(head, { y: 'center' })
                           });
                         }
                       };
                       scrollMatch();
                       setTimeout(scrollMatch, 50);
                       setTimeout(scrollMatch, 150);
                     }
                   }
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
        <button
          id="simulated-ai-trigger"
          onClick={() => {
             handleOpenAiModal();
          }}
        />
      </div>
      
          {/* Mode Selection Popover Menu */}
          {showModeMenu && (
            <>
              <div className="fixed inset-0 z-40 bg-black/10 dark:bg-black/40" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModeMenu(false); }} />
              <div className="absolute bottom-16 sm:bottom-6 left-0 z-50 min-w-[210px] bg-white dark:bg-[#1E2127] border border-gray-200 dark:border-[#2C313C] rounded-lg shadow-2xl py-1 text-gray-800 dark:text-[#ABB2BF] text-xs font-sans normal-case animate-in fade-in slide-in-from-bottom-2 duration-150" id="footer-mode-dropdown-menu">
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
                    let cmd = window.prompt(lang === 'it' ? 'Inserisci comando Vim (es. w, q, tear local)' : 'Enter Vim command (e.g. w, q, tear local)');
                    if (cmd !== null) {
                       cmd = cmd.trim();
                       if (cmd.startsWith(':')) {
                         cmd = cmd.substring(1).trim();
                       }
                       if (cmd) {
                         try {
                           Vim.handleEx(cm as any, cmd);
                         } catch(e) {
                           console.error('Vim handleEx error', e);
                           alert('Errore: ' + e.message);
                         }
                       }
                       if (!cmd.toLowerCase().startsWith('help') && !cmd.toLowerCase().startsWith('h')) {
                         setTimeout(() => {
                           if (editorRef.current?.view) {
                             editorRef.current.view.contentDOM.focus();
                           }
                         }, 50);
                       }
                    }
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
        
        {/* Gemini Model Indicator & Quick Switcher in Status Bar */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const current = typeof window !== 'undefined' ? localStorage.getItem('livia_gemini_model') || 'flash' : 'flash';
            const next = current === 'flash' ? 'flash-lite' : current === 'flash-lite' ? 'pro' : 'flash';
            if (typeof window !== 'undefined') {
              localStorage.setItem('livia_gemini_model', next);
            }
            setStatusMessage(lang === 'it' 
              ? `Modello IA: ${next === 'flash' ? 'Gemini 3.8 Flash' : next === 'flash-lite' ? 'Gemini 3.1 Flash-Lite' : 'Gemini 3.1 Pro'}` 
              : `AI Model: ${next === 'flash' ? 'Gemini 3.8 Flash' : next === 'flash-lite' ? 'Gemini 3.1 Flash-Lite' : 'Gemini 3.1 Pro'}`);
          }}
          className="px-1.5 py-0.5 my-auto mx-1 bg-white/20 hover:bg-white/30 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-white dark:text-emerald-300 rounded text-[9px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all border border-white/30 dark:border-emerald-700/50 shadow-xs"
          title={lang === 'it' ? 'Modello Gemini attivo. Clicca per alternare (Flash / Flash-Lite / Pro)' : 'Active Gemini Model. Click to cycle (Flash / Flash-Lite / Pro)'}
          id="footer-gemini-model-btn"
        >
          <Sparkles size={10} className="text-amber-300 shrink-0" />
          <span>
            {typeof window !== 'undefined' && localStorage.getItem('livia_gemini_model') === 'pro' 
              ? '3.1 PRO' 
              : typeof window !== 'undefined' && localStorage.getItem('livia_gemini_model') === 'flash-lite' 
              ? '3.1 LITE' 
              : '3.8 FLASH'}
          </span>
        </button>

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

      {/* Mobile-Friendly AI Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        lang={lang}
        selectionText={aiModalContext.selectionText}
        hasSelection={aiModalContext.hasSelection}
        docLength={aiModalContext.docLength}
        aiProfiles={aiProfiles || []}
        activeProfileId={activeAiProfileId || null}
        onSelectProfile={(id) => {
          if (setActiveAiProfileId) setActiveAiProfileId(id);
        }}
        onOpenSettingsModal={() => {
          if (onOpenSettingsModal) onOpenSettingsModal();
        }}
        onOpenAiProfilesModal={() => {
          if (onOpenAiProfilesModal) onOpenAiProfilesModal();
        }}
        onExecute={handleExecuteAiModal}
      />
    </div>
  );
}
