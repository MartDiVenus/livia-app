import { Vim } from '@replit/codemirror-vim';
Vim.defineEx('model', 'model', (cm, params) => {
  console.log("model command called with:", params);
});
const cm = {
  state: { vim: {} },
  openDialog: (template, callback) => callback(':model\n')
};
// I can't easily run Vim commands outside a real CM instance.
