const fs = require('fs');
let code = fs.readFileSync('src/lib/vimCommands.ts', 'utf-8');

// replace all alerts with empty strings
code = code.replace(/if \(\/Mobi\|Android\|iPhone\|iPad\/i\.test\(navigator\.userAgent\)\) \{\s*alert\(.*?\);\s*\}/g, '');

fs.writeFileSync('src/lib/vimCommands.ts', code);
