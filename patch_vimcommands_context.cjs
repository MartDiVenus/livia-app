const fs = require('fs');
let code = fs.readFileSync('src/lib/vimCommands.ts', 'utf-8');

const targetStr = `  setLang?: (lang: 'it' | 'en') => void;
  showFlashMessage: (msg: string) => void;
}`;

const replaceStr = `  setLang?: (lang: 'it' | 'en') => void;
  showFlashMessage: (msg: string) => void;
  setShowLineNumbers?: (show: boolean) => void;
}`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('src/lib/vimCommands.ts', code);
