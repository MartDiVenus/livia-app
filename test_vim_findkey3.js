import { Vim } from '@replit/codemirror-vim';
const cm = { state: {}, on: () => {}, off: () => {}, getCursor: () => ({line: 0, ch: 0}), setCursor: () => {}, getOption: () => false, getWrapperElement: () => ({className: ''}) };
Vim.maybeInitVimState_(cm);

const origFindKey = Vim.findKey;
Vim.findKey = function(cm_, key, origin) {
  if (key === 'g' && cm_.state && cm_.state.vim && cm_.state.vim.inputState) {
    if (cm_.state.vim.inputState.prefixRepeat && cm_.state.vim.inputState.prefixRepeat.length > 0) {
      key = 'G';
    }
  }
  return origFindKey.call(this, cm_, key, origin);
}

const res1 = Vim.handleKey(cm, '2', 'mapping');
const res2 = Vim.handleKey(cm, 'g', 'mapping');
console.log(cm.state.vim.inputState.prefixRepeat);
