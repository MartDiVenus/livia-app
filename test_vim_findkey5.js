import { Vim } from '@replit/codemirror-vim';
const cm = { state: {}, on: () => {}, off: () => {}, getCursor: () => ({line: 0, ch: 0}), setCursor: () => {}, getOption: () => false, getWrapperElement: () => ({className: ''}) };
Vim.maybeInitVimState_(cm);

const f = Vim.findKey(cm, '2', 'mapping');
f();
console.log(cm.state.vim.inputState.prefixRepeat);
