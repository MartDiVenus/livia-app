import { Vim } from '@replit/codemirror-vim';
const cm = { state: {}, on: () => {}, off: () => {}, getCursor: () => ({line: 0, ch: 0}), setCursor: () => {}, getOption: () => false, getWrapperElement: () => ({className: ''}) };
Vim.maybeInitVimState_(cm);

console.log(Object.keys(cm.state.vim.inputState.__proto__));
