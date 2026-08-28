import { Vim } from '@replit/codemirror-vim';
Vim.defineOption('model', 'flash', 'string', ['tier'], (value, cm) => {
  console.log("model set to", value);
});
console.log("Option defined!");
