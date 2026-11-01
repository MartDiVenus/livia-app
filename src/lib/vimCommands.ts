import { Vim } from '@replit/codemirror-vim';
import { EditorView } from '@codemirror/view';

export interface VimCommandsContext {
  lang: string;
  filename: string;
  content: string;
  onSaveFileState: (filename: string, content: string) => void | Promise<void>;
  onReadFileState?: (name: string) => string | null | Promise<string | null>;
  onOpenFileState?: (targetName: string) => { found: boolean; name: string } | Promise<{ found: boolean; name: string }>;
  onTearFileState?: (target: string) => { found: boolean; name: string; content?: string } | Promise<{ found: boolean; name: string; content?: string }>;
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
  insertBelowCursor?: (text: string) => void;
}

export function registerVimCommands(ctx: VimCommandsContext) {
  const {
    lang,
    filename,
    content,
    onSaveFileState,
    onReadFileState,
    onOpenFileState,
    onTearFileState,
    onCloseFileState,
    onShowHelp,
    onAiCommand,
    setLang,
    showFlashMessage,
    setShowLineNumbers,
    onOpenAiAssistant,
    insertBelowCursor
  } = ctx;

  Vim.mapCommand('zc', 'action', 'fold', {}, {});
  Vim.mapCommand('zo', 'action', 'unfold', {}, {});
  
  Vim.defineEx('write', 'w', async (cm: any, params: any) => {
    const rawTarget = params?.argString?.trim() || filename;
    const currentText = cm?.getValue ? cm.getValue() : content;
    await onSaveFileState(rawTarget, currentText);
    showFlashMessage(lang === 'it' ? `"${rawTarget}" salvato.` : `"${rawTarget}" written.`);
  });
  
  Vim.defineEx('edit', 'e', async (cm: any, params: any) => {
    const rawTarget = params?.argString?.trim() || params?.args?.[0]?.trim() || '';
    if (!rawTarget) {
       showFlashMessage(lang === 'it' ? 'Specificare un nome file o percorso POSIX (es. :e /percorso/file.md).' : 'Specify a filename or POSIX path (e.g. :e /path/to/file.md).');
       return;
    }
    if (onOpenFileState) {
       await onOpenFileState(rawTarget);
       return;
    }
    if (typeof window !== 'undefined') {
       if (onSaveFileState) {
          await onSaveFileState(rawTarget, '');
          showFlashMessage(lang === 'it' ? `Nuovo file "${rawTarget}"` : `New file "${rawTarget}"`);
       }
    }
  });

  Vim.defineEx('read', 'r', async (cm: any, params: any) => {
    const rawTarget = params?.argString?.trim() || params?.args?.[0]?.trim() || '';
    if (!rawTarget) {
      showFlashMessage(
        lang === 'it'
          ? 'Specificare un file o percorso POSIX da inserire (es. :r /percorso/file.md).'
          : 'Specify a file or POSIX path to read (e.g. :r /path/to/file.md).'
      );
      return;
    }
    if (onReadFileState) {
      const readContent = await onReadFileState(rawTarget);
      if (readContent !== null && readContent !== undefined) {
        if (insertBelowCursor) {
          insertBelowCursor(readContent);
        } else if (cm?.replaceRange && cm?.getCursor) {
          const cur = cm.getCursor();
          const lineText = cm.getLine ? (cm.getLine(cur.line) || '') : '';
          cm.replaceRange('\n' + readContent, { line: cur.line, ch: lineText.length });
        }
        showFlashMessage(
          lang === 'it'
            ? `Inserito contenuto da "${rawTarget}"`
            : `Inserted content from "${rawTarget}"`
        );
      } else {
        showFlashMessage(
          lang === 'it'
            ? `File "${rawTarget}" non trovato.`
            : `File "${rawTarget}" not found.`
        );
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

  Vim.defineEx('wq', 'wq', async (cm: any, params: any) => {
    const rawTarget = params?.argString?.trim() || filename;
    const currentText = cm?.getValue ? cm.getValue() : content;
    await onSaveFileState(rawTarget, currentText);
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
    let modelLabel = 'Gemini 3.8 Flash (gemini-3.8-flash)';
    if (currentModel === 'argon' || currentModel === 'gemini-4-argon') modelLabel = 'Gemini 4 Argon (gemini-4-argon)';
    else if (currentModel === 'pro') modelLabel = 'Gemini 3.1 Pro (gemini-3.1-pro-preview)';
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
    if (param.includes('model=argon') || param.includes('model=gemini-4-argon') || param.includes('model=4-argon')) {
       if (typeof window !== 'undefined') {
         localStorage.setItem('livia_gemini_model', 'argon');
         window.dispatchEvent(new CustomEvent('livia-model-changed', { detail: { model: 'argon' } }));
       }
       showFlashMessage(lang === 'it' ? '✓ Modello impostato su Gemini 4 Argon (gemini-4-argon).' : '✓ Model set to Gemini 4 Argon (gemini-4-argon).');
    } else if (param.includes('model=flash')) {
       if (typeof window !== 'undefined') {
         localStorage.setItem('livia_gemini_model', 'flash');
         window.dispatchEvent(new CustomEvent('livia-model-changed', { detail: { model: 'flash' } }));
       }
       showFlashMessage(lang === 'it' ? '✓ Modello impostato su Gemini 3.8 Flash (gemini-3.8-flash).' : '✓ Model set to Gemini 3.8 Flash (gemini-3.8-flash).');
    } else if (param.includes('model=pro-thinking')) {
       if (typeof window !== 'undefined') localStorage.setItem('livia_gemini_model', 'pro-thinking');
       showFlashMessage(lang === 'it' ? '✓ Modello impostato su Pro Esteso (Ragionamento).' : '✓ Model set to Pro Extended (Reasoning).');
    } else if (param.includes('model=pro')) {
       if (typeof window !== 'undefined') {
         localStorage.setItem('livia_gemini_model', 'pro');
         window.dispatchEvent(new CustomEvent('livia-model-changed', { detail: { model: 'pro' } }));
       }
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
    const rawTarget = params?.argString?.trim() || params?.args?.[0]?.trim() || '';
    if (!rawTarget) {
       showFlashMessage(lang === 'it' ? 'Specificare un nome file o percorso POSIX.' : 'Specify a filename or POSIX path.');
       return;
    }
    if (onTearFileState) {
       const res = await onTearFileState(rawTarget);
       if (res.found && res.content !== undefined) {
          try {
             await navigator.clipboard.writeText(res.content);
             showFlashMessage(lang === 'it' ? `Contenuto di "${res.name}" copiato negli appunti.` : `Content of "${res.name}" copied to clipboard.`);
          } catch {
             showFlashMessage(lang === 'it' ? 'Errore durante la copia negli appunti.' : 'Error copying to clipboard.');
          }
       } else {
          showFlashMessage(lang === 'it' ? `File "${rawTarget}" non trovato.` : `File "${rawTarget}" not found.`);
       }
       return;
    }
    if (typeof window !== 'undefined') {
       const saved = localStorage.getItem('livia_files');
       if (saved) {
          try {
             const files = JSON.parse(saved);
             if (files[rawTarget] !== undefined) {
                try {
                   await navigator.clipboard.writeText(files[rawTarget]);
                   showFlashMessage(lang === 'it' ? `Contenuto di "${rawTarget}" copiato.` : `Content of "${rawTarget}" copied.`);
                } catch (e) {
                   showFlashMessage(lang === 'it' ? 'Errore durante la copia.' : 'Error copying.');
                }
                return;
             }
          } catch (e) {}
       }
       showFlashMessage(lang === 'it' ? `File "${rawTarget}" non trovato.` : `File "${rawTarget}" not found.`);
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
    const lowerArg = arg.toLowerCase();
    if (lowerArg === 'which model' || lowerArg === 'model' || lowerArg === 'model?') {
      showModelInfo();
      return;
    }
    if (lowerArg.startsWith('model ') || lowerArg.startsWith('model=')) {
      const mVal = lowerArg.replace(/^model[\s=]+/, '').trim();
      if (mVal.includes('argon') || mVal === '4' || mVal === '4.0') {
        if (typeof window !== 'undefined') {
          localStorage.setItem('livia_gemini_model', 'argon');
          window.dispatchEvent(new CustomEvent('livia-model-changed', { detail: { model: 'argon' } }));
        }
        showFlashMessage(lang === 'it' ? '✓ Modello impostato su Gemini 4 Argon (gemini-4-argon).' : '✓ Model set to Gemini 4 Argon (gemini-4-argon).');
        return;
      } else if (mVal.includes('pro')) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('livia_gemini_model', 'pro');
          window.dispatchEvent(new CustomEvent('livia-model-changed', { detail: { model: 'pro' } }));
        }
        showFlashMessage(lang === 'it' ? '✓ Modello impostato su Gemini 3.1 Pro.' : '✓ Model set to Gemini 3.1 Pro.');
        return;
      } else if (mVal.includes('flash')) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('livia_gemini_model', 'flash');
          window.dispatchEvent(new CustomEvent('livia-model-changed', { detail: { model: 'flash' } }));
        }
        showFlashMessage(lang === 'it' ? '✓ Modello impostato su Gemini 3.8 Flash (gemini-3.8-flash).' : '✓ Model set to Gemini 3.8 Flash (gemini-3.8-flash).');
        return;
      }
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
