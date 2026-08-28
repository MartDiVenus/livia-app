import { Vim } from '@replit/codemirror-vim';
Vim.defineEx('model', 'mod', () => { console.log('called'); });
console.log("Defined successfully");
