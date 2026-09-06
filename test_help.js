import { vim, Vim } from '@replit/codemirror-vim';
Vim.defineEx('help', 'h', (cm, params) => {
  console.log('Help called with:', params);
});
Vim.handleEx(null, 'help');
Vim.handleEx(null, 'h');
