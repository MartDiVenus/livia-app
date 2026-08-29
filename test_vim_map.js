import { Vim } from '@replit/codemirror-vim';
Vim.map('2g', '2G', 'normal');
console.log(Vim.findKey.toString().substring(0, 100));
