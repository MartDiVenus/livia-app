const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const regexType1 = /onAiCommand\?: \(action: 'prompt' \| 'translate' \| 'latin', arg: string, textToProcess: string, isSelection: boolean, onInsert: \(newText: string\) => void\) => Promise<void>;/g;
code = code.replace(regexType1, "onAiCommand?: (action: 'prompt' | 'translate' | 'latin', arg: string, textToProcess: string, isSelection: boolean, onInsert: (newText: string, isUpdate?: boolean) => void) => Promise<void>;");

fs.writeFileSync('src/components/VimEditor.tsx', code);
