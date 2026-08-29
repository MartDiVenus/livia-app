import { Vim } from '@replit/codemirror-vim';
const cm = { state: {}, on: () => {}, off: () => {}, getCursor: () => ({line: 0, ch: 0}), setCursor: () => {}, getOption: () => false, getWrapperElement: () => ({className: ''}) };
Vim.maybeInitVimState_(cm);

const origFindKey = Vim.findKey;
Vim.findKey = function(cm_, key, origin) {
  if (key === 'g' && cm_.state && cm_.state.vim && cm_.state.vim.inputState) {
    const is = cm_.state.vim.inputState;
    if (is.keyBuffer && is.keyBuffer.length > 0) {
      // Check if the entire keyBuffer consists of digits
      const isCount = is.keyBuffer.every(k => /^[0-9]$/.test(k));
      if (isCount) {
        console.log("Replacing 'g' with 'G' because of count:", is.keyBuffer.join(''));
        key = 'G';
      }
    }
  }
  return origFindKey.call(this, cm_, key, origin);
}

Vim.handleKey(cm, '2', 'mapping');
Vim.handleKey(cm, '3', 'mapping');
const f = Vim.handleKey(cm, 'g', 'mapping');
console.log(f); // should return true or a function if handled
