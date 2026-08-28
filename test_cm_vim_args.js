import { Vim } from '@replit/codemirror-vim';
Vim.defineEx('gemini', 'gem', (cm, params) => {
  console.log('argString:', JSON.stringify(params.argString));
});
// Let's just look at how Vim parser parses arguments!
