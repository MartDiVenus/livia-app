import { Vim } from '@replit/codemirror-vim';
import { EditorView } from '@codemirror/view';

export interface VimCommandsContext {
  lang: string;
  filename: string;
  content: string;
  onSaveFileState: (filename: string, content: string) => void;
  onCloseFileState?: (force: boolean) => { message: string } | void;
  onShowHelp?: (cmd?: string) => void;
  onAiCommand?: (
    type: 'prompt' | 'translate' | 'latin',
    prompt: string,
    targetText: string,
    isSelection: boolean,
    onInsert: (text: string) => void
  ) => void;
  setLang?: (lang: 'it' | 'en') => void;
  showFlashMessage: (msg: string) => void;
  setShowLineNumbers?: (show: boolean) => void;
  onOpenAiAssistant?: () => void;
}

export function registerVimCommands(ctx: VimCommandsContext) {
  const {
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
    onOpenAiAssistant
  } = ctx;

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
    if (typeof window !== 'undefined') {
       const saved = localStorage.getItem('livia_files');
       if (saved) {
          try {
             const files = JSON.parse(saved);
             if (files[target]) {
                showFlashMessage(lang === 'it' ? `File "${target}" esiste già` : `File "${target}" already exists`);
                return;
             }
          } catch (e) {}
       }
       if (onSaveFileState) {
          onSaveFileState(target, '');
          showFlashMessage(lang === 'it' ? `Nuovo file "${target}"` : `New file "${target}"`);
       }
    }
  });

  Vim.defineEx('quit', 'q', (cm: any, params: any) => {
    const force = params?.argString?.trim() === '!';
    if (onCloseFileState) {
       const res = onCloseFileState(force);
       if (res && res.message) {
          showFlashMessage(res.message);
       } else {
          showFlashMessage(lang === 'it' ? 'Ultimo file chiuso' : 'Last file closed');
       }
    }
  });

  Vim.defineEx('wq', 'wq', (cm: any, params: any) => {
    onSaveFileState(filename, content);
    if (onCloseFileState) {
       const res = onCloseFileState(true); 
       if (res && res.message) {
          showFlashMessage(res.message);
       } else {
          showFlashMessage(lang === 'it' ? 'Salvato e chiuso' : 'Saved and closed');
       }
    }
  });

  Vim.map('ZZ', ':wq<CR>', 'normal');

  const showModelInfo = () => {
    const currentModel = typeof window !== 'undefined' ? (localStorage.getItem('livia_gemini_model') || 'flash') : 'flash';
    let modelLabel = 'Gemini Flash (gemini-3.8 / latest)';
    if (currentModel === 'flash-lite') modelLabel = 'Gemini Flash-Lite (3.1)';
    else if (currentModel === 'pro') modelLabel = 'Gemini Pro (3.1 Pro)';
    else if (currentModel === 'pro-thinking') modelLabel = lang === 'it' ? 'Pro Esteso (Ragionamento)' : 'Pro Extended (Reasoning)';
    showFlashMessage(lang === 'it' ? `Modello AI in uso: ${modelLabel}` : `Current AI Model: ${modelLabel}`);
  };

  Vim.defineEx('model', 'model', showModelInfo);
  Vim.defineEx('tier', 'tier', showModelInfo);

  const setLanguage = (cm: any, params: any) => {
    const arg = params?.argString?.trim()?.replace('?', '');
    if (arg === 'it') {
       if (setLang) setLang('it');
       showFlashMessage('✓ Lingua impostata su Italiano (IT).');
    } else if (arg === 'en') {
       if (setLang) setLang('en');
       showFlashMessage('✓ Language set to English (EN).');
    } else {
       const currLangName = lang === 'it' ? 'Italiano (IT)' : 'English (EN)';
       showFlashMessage(lang === 'it' ? `Lingua attiva: ${currLangName}` : `Active Language: ${currLangName}`);
    }
  };

  Vim.defineEx('lang', 'lang', setLanguage);
  Vim.defineEx('language', 'language', setLanguage);

  const showCreditsInfo = () => {
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
  };

  Vim.defineEx('credits', 'credits', showCreditsInfo);
  Vim.defineEx('quota', 'quota', showCreditsInfo);

  Vim.defineEx('set', 'set', (cm: any, params: any) => {
    const param = params?.argString?.trim();
    if (!param) return;
    if (param.includes('model=flash-lite')) {
       if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'flash-lite');
       showFlashMessage(lang === 'it' ? '✓ Modello impostato su Gemini Flash-Lite (3.1).' : '✓ Model set to Gemini Flash-Lite (3.1).');
    } else if (param.includes('model=flash')) {
       if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'flash');
       showFlashMessage(lang === 'it' ? '✓ Modello impostato su Gemini Flash (gemini-3.8 / latest).' : '✓ Model set to Gemini Flash (gemini-3.8 / latest).');
    } else if (param.includes('model=pro-thinking')) {
       if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'pro-thinking');
       showFlashMessage(lang === 'it' ? '✓ Modello impostato su Pro Esteso (Ragionamento).' : '✓ Model set to Pro Extended (Reasoning).');
    } else if (param.includes('model=pro')) {
       if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'pro');
       showFlashMessage(lang === 'it' ? '✓ Modello impostato su Gemini 3.1 Pro.' : '✓ Model set to Gemini 3.1 Pro.');
    } else if (param.includes('lang=it')) {
       if (setLang) setLang('it');
       showFlashMessage('✓ Lingua impostata su Italiano (IT).');
    } else if (param.includes('lang=en')) {
       if (setLang) setLang('en');
       showFlashMessage('✓ Language set to English (EN).');
    } else if (param === 'nu' || param === 'number') {
       if (setShowLineNumbers) setShowLineNumbers(true);
       showFlashMessage('✓ Line numbers enabled');
    } else if (param === 'nonu' || param === 'nonumber') {
       if (setShowLineNumbers) setShowLineNumbers(false);
       showFlashMessage('✓ Line numbers disabled');
    }
  });

  Vim.defineEx('tear', 'tear', async (cm: any, params: any) => {
    const target = params?.args?.[0];
    if (!target) {
       showFlashMessage(lang === 'it' ? 'Specificare un nome file.' : 'Specify a filename.');
       return;
    }
    if (typeof window !== 'undefined') {
       const saved = localStorage.getItem('livia_files');
       if (saved) {
          try {
             const files = JSON.parse(saved);
             if (files[target] !== undefined) {
                // Copy to clipboard
                try {
                   await navigator.clipboard.writeText(files[target]);
                   showFlashMessage(lang === 'it' ? `Contenuto di "${target}" copiato.` : `Content of "${target}" copied.`);
                } catch (e) {
                   showFlashMessage(lang === 'it' ? 'Errore durante la copia.' : 'Error copying.');
                }
                return;
             }
          } catch (e) {}
       }
       showFlashMessage(lang === 'it' ? `File "${target}" non trovato.` : `File "${target}" not found.`);
    }
  });

  Vim.defineEx('help', 'h', (cm: any, params: any) => {
    if (onShowHelp) onShowHelp(params?.args?.[0]);
  });

  const handleAiCommand = (type: 'prompt' | 'translate' | 'latin', cm: any, arg: string) => {
    if (onAiCommand) {
      let isSelection = cm.somethingSelected();
      let textToProcess = "";
      let fromPos = cm.getCursor('start');
      let toPos = cm.getCursor('end');

      if (isSelection) {
        textToProcess = cm.getSelection();
      } else if (cm.state?.vim?.marks) {
        // If visual mode was active before Ex command was invoked, Vim saves marks '<' and '>'
        try {
          const mStart = cm.state.vim.marks['<']?.find?.();
          const mEnd = cm.state.vim.marks['>']?.find?.();
          if (mStart && mEnd) {
            let s = mStart;
            let e = mEnd;
            if (s.line > e.line || (s.line === e.line && s.ch > e.ch)) {
              s = mEnd;
              e = mStart;
            }
            const rangeText = cm.getRange(s, { line: e.line, ch: e.ch + 1 });
            if (rangeText && rangeText.length > 0) {
              isSelection = true;
              textToProcess = rangeText;
              fromPos = s;
              toPos = { line: e.line, ch: e.ch + 1 };
            }
          }
        } catch {}
      }

      if (!isSelection) {
        textToProcess = cm.getValue();
      }
      
      let placeholderLength = 0;
      let insertedPlaceholder = "";

      const onInsert = (newText: string, isUpdate?: boolean) => {
         try {
           const finalStr = newText || "";
           
           if (isUpdate) {
               let replacedViaStringMatch = false;
               if (cm.cm6 && insertedPlaceholder) {
                   const view = cm.cm6;
                   const docText = view.state.doc.toString();
                   const idx = docText.indexOf(insertedPlaceholder);
                   if (idx !== -1) {
                       view.dispatch({
                           changes: { from: idx, to: idx + insertedPlaceholder.length, insert: finalStr + (isSelection ? "" : "\n") }
                       });
                       replacedViaStringMatch = true;
                   }
               }
               
               if (!replacedViaStringMatch) {
                   // Fallback to coordinates
                   const pFrom = isSelection ? fromPos : toPos;
                   const pTo = { line: pFrom.line, ch: pFrom.ch + placeholderLength };
                   try {
                       cm.replaceRange(finalStr + (isSelection ? "" : "\n"), pFrom, pTo);
                   } catch (err: any) {
                       console.error("Errore replaceRange:", err.message);
                   }
               }
           } else {
               insertedPlaceholder = finalStr;
               // Initial insertion of placeholder
               if (isSelection) {
                 cm.replaceRange(finalStr, fromPos, toPos);
               } else {
                 cm.replaceRange(finalStr, toPos);
               }
               placeholderLength = finalStr.length;
           }
           
           setTimeout(() => {
             if (cm.cm6) {
               const view = cm.cm6;
               view.contentDOM.focus();
               view.requestMeasure();
               
               const mainSel = view.state.selection.main;
               if (mainSel) {
                   view.dispatch({
                       effects: EditorView.scrollIntoView(mainSel.head, { y: 'center' })
                   });
               }
             }
           }, 50);
         } catch(e: any) {
           console.error("Vim AI insert error", e);
           showFlashMessage("Errore insert: " + e.message);
         }
      };
      onAiCommand(type, arg, textToProcess, isSelection, onInsert);
    }
  };

  Vim.defineEx('gemini', 'gem', (cm: any, params: any) => {
    let arg = params?.argString?.trim();
    if (!arg) {
      if (onOpenAiAssistant) {
        onOpenAiAssistant();
        return;
      }
      showFlashMessage(lang === 'it' ? 'Specifica un prompt (es. :gem correggi).' : 'Specify a prompt (e.g. :gem fix errors).');
      return;
    }
    if (arg.startsWith('ini ')) {
       arg = arg.substring(4).trim();
    }
    handleAiCommand('prompt', cm, arg);
  });

  Vim.defineEx('ai', 'ai', (cm: any, params: any) => {
    let arg = params?.argString?.trim();
    if (!arg) {
      if (onOpenAiAssistant) {
        onOpenAiAssistant();
        return;
      }
      showFlashMessage(lang === 'it' ? 'Specifica un prompt.' : 'Specify a prompt.');
      return;
    }
    handleAiCommand('prompt', cm, arg);
  });

  Vim.defineEx('translate', 'tr', (cm: any, params: any) => {
    const arg = params?.argString?.trim();
    if (!arg && onOpenAiAssistant) {
      onOpenAiAssistant();
      return;
    }
    handleAiCommand('translate', cm, arg || 'Italian');
  });

  Vim.defineEx('latin', 'lat', (cm: any, params: any) => {
    const arg = params?.argString?.trim();
    if (!arg && onOpenAiAssistant) {
      onOpenAiAssistant();
      return;
    }
    handleAiCommand('latin', cm, arg || 'random');
  });
}
