import { Vim } from '@replit/codemirror-vim';

let captured = null;
Vim.defineEx('gemini', 'gem', (cm, params) => {
  captured = params;
});

// Since we can't easily run it, let's look at the source again.
