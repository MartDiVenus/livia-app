import React, { useEffect, useRef, useState } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { vim, Vim } from '@replit/codemirror-vim';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { EditorView } from '@codemirror/view';
import { VimMode, FileFormat } from '../types';
import { Sparkles, Eye, Edit3, ZoomIn, ZoomOut, Check, X, FileText, Keyboard, Terminal, Maximize2, Minimize2, Info } from 'lucide-react';

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
  const [showPreview, setShowPreview] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    lang === 'it' ? 'Benvenuto in LiViA. Premi "i" per scrivere, o :h per la guida.' : 'Welcome to LiViA. Press "i" to write, or :h for help.'
  );

  const extensions = [vim({ status: true })];
  if (syntaxHighlightOn) {
    if (format === 'md') extensions.push(markdown({ base: markdownLanguage }));
    if (format === 'js' || format === 'ts') extensions.push(javascript());
    if (format === 'py') extensions.push(python());
  }

  if (wordWrap) {
    extensions.push(EditorView.lineWrapping);
  }

  useEffect(() => {
    // Custom Vim commands mapping
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
      if (e.mode === 'insert') m = 'insert';
      if (e.mode === 'visual') m = 'visual';
      if (onModeChange) onModeChange(m);
      setStatusMessage(`-- ${m.toUpperCase()} MODE --`);
    };
    
    // Attempting to hook into CodeMirror Vim events
    const view = editorRef.current?.view;
    if (view) {
       // Replit codemirror-vim fires 'vim-mode-change' on the editor instance
       const cm = (view as any).cm;
       if (cm && cm.on) {
          cm.on('vim-mode-change', handleVimMode);
          return () => cm.off('vim-mode-change', handleVimMode);
       }
    }
  }, [editorRef.current?.view, onModeChange]);

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0D0F12] text-gray-900 dark:text-[#E0E0E0] min-h-0 overflow-hidden">
      <div className="bg-gray-50 dark:bg-[#16181D] px-4 py-2 flex flex-wrap justify-between items-center gap-2 border-b border-gray-200 dark:border-[#2D2D2D] font-sans">
         <span className="text-xs text-gray-500 font-bold">{filename}</span>
         <button onClick={() => setShowPreview(!showPreview)} className="text-xs p-1 bg-gray-200 dark:bg-gray-800 rounded">
            {showPreview ? 'Close Preview' : 'Preview'}
         </button>
      </div>
      
      {showPreview ? (
         <div className="flex-1 overflow-auto p-4 markdown-body">
            {/* Extremely basic preview just as placeholder */}
            <pre>{content}</pre>
         </div>
      ) : (
         <div className="flex-1 overflow-auto" style={{ fontSize: `${editorFontSize}px` }}>
            <CodeMirror
              ref={editorRef}
              value={content}
              height="100%"
              theme={theme === 'dark' ? 'dark' : 'light'}
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
      )}
      
      <div className="bg-gray-100 dark:bg-[#1E2127] border-t border-gray-300 dark:border-[#2D2D2D] px-4 py-1 flex items-center font-mono text-[10px] sm:text-xs">
         <span>{statusMessage}</span>
      </div>
    </div>
  );
}
