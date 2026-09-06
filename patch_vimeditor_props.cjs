const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `  showLineNumbers: boolean;
  wordWrap: boolean;`;

const replaceStr = `  showLineNumbers: boolean;
  setShowLineNumbers?: (val: boolean) => void;
  wordWrap: boolean;`;

code = code.replace(targetStr, replaceStr);

const targetStr2 = `  onShowHelp,
  onAiCommand,
  lang,
  setLang
}: VimEditorProps`;

const replaceStr2 = `  onShowHelp,
  onAiCommand,
  lang,
  setLang,
  setShowLineNumbers
}: VimEditorProps`;

code = code.replace(targetStr2, replaceStr2);

const targetStr3 = `      onShowHelp,
      onAiCommand,
      setLang,
      showFlashMessage
    });
  }, [filename, content, lang, onSaveFileState, onShowHelp, onAiCommand]);`;

const replaceStr3 = `      onShowHelp,
      onAiCommand,
      setLang,
      showFlashMessage,
      setShowLineNumbers
    });
  }, [filename, content, lang, onSaveFileState, onShowHelp, onAiCommand, setShowLineNumbers]);`;

code = code.replace(targetStr3, replaceStr3);

fs.writeFileSync('src/components/VimEditor.tsx', code);
