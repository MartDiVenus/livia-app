const { Vim } = require('@replit/codemirror-vim');
console.log(Vim.getVimGlobalState ? Object.keys(Vim.getVimGlobalState()) : "No global state");
