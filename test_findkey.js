import { Vim } from '@replit/codemirror-vim';
// We can't easily mock cm without JSDOM, but we can look at the code.
console.log(Vim.findKey.toString());
