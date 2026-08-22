const fs = require('fs');
let code = fs.readFileSync('src/components/AuxiliaryKeyboard.tsx', 'utf8');

// replace onClick={() => onKeyPress('u')} with onPointerDown/onTouchStart
code = code.replace(
`              onClick={() => onKeyPress('u')}`,
`              onPointerDown={(e) => { e.preventDefault(); onKeyPress('u'); }}
              onTouchStart={(e) => { e.preventDefault(); onKeyPress('u'); }}`
);

code = code.replace(
`              onClick={() => onKeyPress('.')}`,
`              onPointerDown={(e) => { e.preventDefault(); onKeyPress('.'); }}
              onTouchStart={(e) => { e.preventDefault(); onKeyPress('.'); }}`
);

code = code.replace(
`              onClick={onYankCurrent}`,
`              onPointerDown={(e) => { e.preventDefault(); onYankCurrent(); }}
              onTouchStart={(e) => { e.preventDefault(); onYankCurrent(); }}`
);

code = code.replace(
`              onClick={onPasteCurrent}`,
`              onPointerDown={(e) => { e.preventDefault(); onPasteCurrent(); }}
              onTouchStart={(e) => { e.preventDefault(); onPasteCurrent(); }}`
);

code = code.replace(
`              onClick={() => onKeyPress('/')}`,
`              onPointerDown={(e) => { e.preventDefault(); onKeyPress('/'); }}
              onTouchStart={(e) => { e.preventDefault(); onKeyPress('/'); }}`
);

code = code.replace(
`              onClick={() => onKeyPress(':')}`,
`              onPointerDown={(e) => { e.preventDefault(); onKeyPress(':'); }}
              onTouchStart={(e) => { e.preventDefault(); onKeyPress(':'); }}`
);

fs.writeFileSync('src/components/AuxiliaryKeyboard.tsx', code);
console.log('Done');
