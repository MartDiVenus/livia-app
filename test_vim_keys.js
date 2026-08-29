import { Vim } from '@replit/codemirror-vim';
const cm = { state: {}, on: () => {}, off: () => {}, getCursor: () => ({line: 0, ch: 0}), setCursor: () => {} };
Vim.maybeInitVimState_(cm);
console.log(cm.state.vim.inputState);
