import { Vim } from '@replit/codemirror-vim';
const cm = { state: {}, on: () => {}, off: () => {}, getCursor: () => ({line: 0, ch: 0}), setCursor: () => {}, getOption: () => false };
Vim.maybeInitVimState_(cm);
Vim.handleKey(cm, '2', 'mapping');
console.log(cm.state.vim.inputState.prefixRepeat);
