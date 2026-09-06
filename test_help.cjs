const { Vim } = require('@replit/codemirror-vim');
const fs = require('fs');

const code = `
  Vim.defineEx('help', 'h', (cm, params) => {
    console.log('Help called with:', params);
  });
  
  Vim.handleEx(null, 'help');
  Vim.handleEx(null, 'h');
`;

fs.writeFileSync('test_help.js', code);
