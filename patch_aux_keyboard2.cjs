const fs = require('fs');
let code = fs.readFileSync('src/components/AuxiliaryKeyboard.tsx', 'utf-8');

code = code.replace(
  "onPointerDown={(e) => { e.preventDefault(); onKeyPress('/'); }}",
  "onClick={(e) => { e.preventDefault(); onKeyPress('/'); }}"
);

fs.writeFileSync('src/components/AuxiliaryKeyboard.tsx', code);
