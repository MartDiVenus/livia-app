const fs = require('fs');
let code = fs.readFileSync('src/lib/vimCommands.ts', 'utf-8');

const targetStr = `    onShowHelp,
    onAiCommand,
    setLang,
    showFlashMessage
  } = ctx;`;

const replaceStr = `    onShowHelp,
    onAiCommand,
    setLang,
    showFlashMessage,
    setShowLineNumbers
  } = ctx;`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/lib/vimCommands.ts', code);
