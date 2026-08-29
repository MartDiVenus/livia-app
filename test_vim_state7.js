import { Vim } from '@replit/codemirror-vim';
const cm = { state: {}, on: () => {}, off: () => {}, getCursor: () => ({line: 0, ch: 0}), setCursor: () => {}, getOption: () => false, getWrapperElement: () => ({className: ''}) };
Vim.maybeInitVimState_(cm);

const origFindKey = Vim.findKey;
Vim.findKey = function(cm_, key, origin) {
  if (key === 'g' && cm_.state && cm_.state.vim && cm_.state.vim.inputState) {
    const is = cm_.state.vim.inputState;
    console.log("keyBuffer:", is.keyBuffer);
    console.log("prefixRepeat:", is.prefixRepeat);
    console.log("motionRepeat:", is.motionRepeat);
  }
  return origFindKey.call(this, cm_, key, origin);
}

Vim.handleKey(cm, 'd', 'mapping');
Vim.handleKey(cm, '2', 'mapping');
Vim.handleKey(cm, 'g', 'mapping');
