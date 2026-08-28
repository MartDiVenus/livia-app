import { Vim } from '@replit/codemirror-vim';
Vim.defineEx('set', 'set', () => { console.log('my set called'); });
console.log("Defined successfully");
