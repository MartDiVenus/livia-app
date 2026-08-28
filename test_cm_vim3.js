import { Vim } from '@replit/codemirror-vim';
Vim.defineEx('model', 'model', (cm, params) => {
  console.log('called model');
});
console.log('done');
