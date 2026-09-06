const fs = require('fs');
let code = fs.readFileSync('src/lib/vimCommands.ts', 'utf-8');

const targetStr = `  onSaveFileState?: (filename: string, content: string) => void;
  onCloseFileState?: (filename: string) => void;
  onShowHelp?: (cmd?: string) => void;
  onAiCommand?: (type: 'prompt' | 'translate' | 'latin', arg: string, textToProcess: string, isSelection: boolean, onInsert: (newText: string) => void) => void;
  setLang?: (lang: 'en' | 'it') => void;
  showFlashMessage: (msg: string) => void;
}`;

const replaceStr = `  onSaveFileState?: (filename: string, content: string) => void;
  onCloseFileState?: (filename: string) => void;
  onShowHelp?: (cmd?: string) => void;
  onAiCommand?: (type: 'prompt' | 'translate' | 'latin', arg: string, textToProcess: string, isSelection: boolean, onInsert: (newText: string) => void) => void;
  setLang?: (lang: 'en' | 'it') => void;
  showFlashMessage: (msg: string) => void;
  setShowLineNumbers?: (show: boolean) => void;
}`;

code = code.replace(targetStr, replaceStr);

const targetStr2 = `    onShowHelp,
    onAiCommand,
    setLang,
    showFlashMessage
  } = options;`;

const replaceStr2 = `    onShowHelp,
    onAiCommand,
    setLang,
    showFlashMessage,
    setShowLineNumbers
  } = options;`;

code = code.replace(targetStr2, replaceStr2);

const targetStr3 = `    } else if (param.includes('lang=en')) {
       if (setLang) setLang('en');
       showFlashMessage('✓ Language set to English (EN).');
    }`;

const replaceStr3 = `    } else if (param.includes('lang=en')) {
       if (setLang) setLang('en');
       showFlashMessage('✓ Language set to English (EN).');
    } else if (param === 'nu' || param === 'number') {
       if (setShowLineNumbers) setShowLineNumbers(true);
       showFlashMessage('✓ Line numbers enabled');
    } else if (param === 'nonu' || param === 'nonumber') {
       if (setShowLineNumbers) setShowLineNumbers(false);
       showFlashMessage('✓ Line numbers disabled');
    }`;

code = code.replace(targetStr3, replaceStr3);

fs.writeFileSync('src/lib/vimCommands.ts', code);
