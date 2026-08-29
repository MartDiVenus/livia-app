import { Vim } from '@replit/codemirror-vim';
// Try to log the motions
console.log(Vim.getVimGlobalState_ ? Vim.getVimGlobalState_() : "none");
