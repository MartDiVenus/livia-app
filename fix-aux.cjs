const fs = require('fs');
let code = fs.readFileSync('src/components/AuxiliaryKeyboard.tsx', 'utf8');

// Fix min-h
code = code.replace(/min-h-\[48px\]/g, 'min-h-[48px] sm:min-h-0');
code = code.replace(/p-3/g, 'p-3 sm:p-1.5'); // I had changed p-1.5 to p-3, but need to restore sm

// Fix text sizes
code = code.replace(/sm:text-lg/g, 'sm:text-xs');

fs.writeFileSync('src/components/AuxiliaryKeyboard.tsx', code);
