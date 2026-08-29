import { Vim } from '@replit/codemirror-vim';
// Mock CM properly
const cm = {
  state: {},
  on: () => {},
  off: () => {},
  getCursor: () => ({line: 0, ch: 0}),
  setCursor: () => {},
  getOption: () => false,
  getWrapperElement: () => ({className: ''})
};
Vim.maybeInitVimState_(cm);
console.log("Before:", cm.state.vim.inputState.prefixRepeat);
try {
  Vim.handleKey(cm, '2', 'mapping');
  console.log("After:", cm.state.vim.inputState.prefixRepeat);
} catch (e) {
  console.log(e);
}
