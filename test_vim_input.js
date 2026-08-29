import { Vim } from '@replit/codemirror-vim';
const cm = { state: {}, on: () => {}, off: () => {} };
Vim.maybeInitVimState_(cm);
console.log(Object.keys(cm.state.vim.inputState));
console.log(cm.state.vim.inputState.prefixRepeat);
