import { Vim } from '@replit/codemirror-vim';
// The default keymap might be private, but let's check what we can find.
console.log(Vim.mapCommand ? "mapCommand exists" : "no mapCommand");
