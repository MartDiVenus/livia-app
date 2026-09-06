const fs = require('fs');

const vimEditorPath = 'src/components/VimEditor.tsx';
let code = fs.readFileSync(vimEditorPath, 'utf-8');

// 1. Add import
if (!code.includes('import { registerVimCommands }')) {
    code = code.replace(
        "import { VimMode, FileFormat } from '../types';",
        "import { VimMode, FileFormat } from '../types';\nimport { registerVimCommands } from '../lib/vimCommands';"
    );
}

// 2. Replace the massive useEffect block with a call to registerVimCommands
const startEx = code.indexOf("    Vim.mapCommand('zc'");
const endEx = code.indexOf("    Vim.defineEx('latin',") + 2000;
const endExActual = code.indexOf("  }, [filename, content, lang, onSaveFileState, onShowHelp, onAiCommand]);", startEx);

if (startEx !== -1 && endExActual !== -1) {
    const codeBefore = code.slice(0, startEx);
    const codeAfter = code.slice(endExActual);
    
    const replacement = `    registerVimCommands({
      lang,
      filename,
      content,
      onSaveFileState,
      onCloseFileState,
      onShowHelp,
      onAiCommand,
      setLang,
      showFlashMessage
    });
`;
    
    code = codeBefore + replacement + codeAfter;
}

fs.writeFileSync(vimEditorPath, code);
console.log("Refactored VimEditor successfully");
