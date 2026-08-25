import React, { useEffect, useRef, useState } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { vim, Vim } from '@replit/codemirror-vim';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { insertTab } from '@codemirror/commands';
import { foldService, foldCode, unfoldCode } from '@codemirror/language';
import { VimMode, FileFormat } from '../types';
import { Sparkles, Eye, Edit3, ZoomIn, ZoomOut, Check, X, FileText, Keyboard, Terminal, Maximize2, Minimize2, Info } from 'lucide-react';
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
  onSaveFileState: (name: string, content: string) => void;
  onReadFileState: (name: string) => string | null;
  onOpenFileState?: (targetName: string) => { found: boolean; name: string };
  onShowHelp?: (topic?: string) => void;
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
  onSaveFileState,
  onReadFileState,
  onOpenFileState,
  onShowHelp,
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
  const [showPreview, setShowPreview] = useState(false);
  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false);
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
    
    // 1. \begin ... \end
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
    if (format === 'md') extensions.push(markdown({ base: markdownLanguage }));
    if (format === 'js' || format === 'ts') extensions.push(javascript());
    if (format === 'py') extensions.push(python());
  }

  if (wordWrap) {
    extensions.push(EditorView.lineWrapping);
  }

  // Handle Tab key overriding CodeMirror defaults in Insert mode
  // The \`vim\` extension handles Insert mode keymaps, so we let CodeMirror's basicSetup or custom extension handle it.
  
  useEffect(() => {
    // Custom Vim commands mapping
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
      setStatusMessage(lang === 'it' ? `"${filename}" salvato.` : `"${filename}" written.`);
    });
    
    Vim.defineEx('help', 'h', (cm: any, params: any) => {
      if (onShowHelp) onShowHelp(params?.args?.[0]);
    });
  }, [filename, content, lang, onSaveFileState, onShowHelp]);

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
      if (e.mode === 'visual') m = 'visual';
      if (onModeChange) onModeChange(m);
      setStatusMessage(`-- ${m.toUpperCase()} MODE --`);
    };
    
    const view = editorRef.current?.view;
    if (view) {
       const cm = (view as any).cm;
       if (cm && cm.on) {
          cm.on('vim-mode-change', handleVimMode);
          return () => cm.off('vim-mode-change', handleVimMode);
       }
    }
  }, [editorRef.current?.view, onModeChange]);

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0D0F12] text-gray-900 dark:text-[#E0E0E0] transition-colors duration-200 min-w-0 min-h-0 overflow-hidden">
      {/* Header Bar */}
      <div className="bg-gray-50 dark:bg-[#16181D] px-4 py-3 sm:px-4 sm:py-2 flex flex-wrap justify-between items-center gap-2 text-lg sm:text-xs text-gray-500 dark:text-zinc-400 border-b border-gray-200 dark:border-[#2D2D2D] font-sans">
        {showPreview && isPreviewFullScreen ? (
          <>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-zinc-100 font-sans text-sm sm:text-xs uppercase">
                <Sparkles size={16} className="text-[#8AB4F8]" />
                {lang === 'it' ? "Anteprima Formattata" : "Formatted Preview"} ({format.toUpperCase()})
              </span>
            </div>
            <div className="flex items-center gap-2 font-sans">
              <div className="flex items-center gap-0.5 bg-white dark:bg-[#0D0F12] border border-gray-200 dark:border-[#2D2D2D] rounded-xl sm:rounded-lg p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setPreviewZoom(Math.max(50, previewZoom - 10))}
                  className="p-1.5 sm:p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <ZoomOut size={20} className="sm:size-[14px]" />
                </button>
                <span className="text-sm sm:text-[10px] font-mono font-bold px-2 py-1 w-12 text-center text-gray-700 dark:text-zinc-300">
                  {previewZoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(Math.min(200, previewZoom + 10))}
                  className="p-1.5 sm:p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <ZoomIn size={20} className="sm:size-[14px]" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewFullScreen(false)}
                className="p-2 sm:p-1.5 bg-white dark:bg-[#0D0F12] border border-gray-200 dark:border-[#2D2D2D] text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white rounded-xl sm:rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all flex items-center justify-center shadow-xs"
              >
                <Minimize2 size={20} className="sm:size-[14px]" />
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="p-2 sm:p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400 rounded-xl sm:rounded-lg font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all flex items-center justify-center shadow-xs"
              >
                <X size={20} className="sm:size-[14px]" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="font-mono text-gray-800 dark:text-zinc-200 font-bold truncate max-w-[200px] text-base sm:text-xs">
                {filename}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(format === 'md' || format === 'html' || format === 'svg') && (
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-xl sm:rounded-lg font-bold transition-all shadow-xs active:scale-95 cursor-pointer text-sm sm:text-[10px] uppercase tracking-wide border ${
                    showPreview 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400 hover:bg-emerald-100' 
                      : 'bg-white dark:bg-[#0D0F12] text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-[#2D2D2D] hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {showPreview ? <Edit3 size={24} className="sm:size-[13px]" /> : <Eye size={24} className="sm:size-[13px]" />}
                  <span className="hidden sm:inline">{showPreview ? (lang === 'it' ? "Chiudi Anteprima" : "Close Preview") : (lang === 'it' ? "Anteprima" : "Preview")}</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        <div className={`flex-1 flex relative overflow-hidden bg-white dark:bg-[#0D0F12] transition-colors duration-200 min-w-0 min-h-0 ${
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
                    className="p-1.5 bg-white dark:bg-[#16181D] border border-gray-200 dark:border-[#2D2D2D] text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all flex items-center justify-center shadow-xs"
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
             const key = e.currentTarget.getAttribute('data-key');
             if (key && editorRef.current?.view) {
                const cm = (editorRef.current.view as any).cm;
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

      <footer className="bg-emerald-600 dark:bg-[#21252B] h-6 flex text-[10px] items-center text-white dark:text-[#9DA5B4] font-sans font-medium tracking-wide uppercase shrink-0 w-full overflow-x-auto overflow-y-hidden">
        <div className="px-2.5 text-white dark:text-[#0D0F12] font-semibold tracking-tight truncate hidden sm:block min-w-0">
          {filename}
        </div>
        <div className="flex-1 text-white/80 dark:text-zinc-800 italic text-[11px] lowercase normal-case px-2.5 truncate min-w-0">
          {statusMessage}
        </div>
        <div className="px-2 font-mono tabular-nums">Ln {cursorPos.line}, Col {cursorPos.col}</div>
        <div className="px-2 hidden sm:block font-mono">UTF-8</div>
        <div className="px-2 font-mono">{format}</div>
      </footer>
    </div>
  );
}
