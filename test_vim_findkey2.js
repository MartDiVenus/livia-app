import { Vim } from '@replit/codemirror-vim';
const cm = { state: {}, on: () => {}, off: () => {}, getCursor: () => ({line: 0, ch: 0}), setCursor: () => {}, getOption: () => false, getWrapperElement: () => ({className: ''}) };
Vim.maybeInitVimState_(cm);

// Try to patch findKey
const origFindKey = Vim.findKey;
Vim.findKey = function(cm_, key, origin) {
  console.log("Called findKey with key:", key, cm_.state.vim.inputState.prefixRepeat);
  return origFindKey.call(this, cm_, key, origin);
}

Vim.handleKey(cm, '2', 'mapping');
Vim.handleKey(cm, 'g', 'mapping');
