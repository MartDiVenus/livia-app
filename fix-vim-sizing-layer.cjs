const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

// Replace the sizing layer to NOT be absolute top-0 bottom-0
code = code.replace(
  /<div className=\{`col-start-1 row-start-1 absolute top-0 bottom-0 right-0 \$\{showLineNumbers \? 'left-14 sm:left-16' : 'left-0'\} p-4 box-border font-mono leading-6 tracking-normal invisible pointer-events-none select-none z-0 \$\{wordWrap \? 'whitespace-pre-wrap break-all' : 'whitespace-pre'\}`\}/g,
  "<div className={`col-start-1 row-start-1 w-full ${showLineNumbers ? 'pl-[72px] sm:pl-[80px]' : 'pl-4'} pr-4 py-4 box-border font-mono leading-6 tracking-normal invisible pointer-events-none select-none z-0 ${wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}"
);

fs.writeFileSync('src/components/VimEditor.tsx', code);
