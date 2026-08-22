const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

// Layer 1
code = code.replace(
  /className=\{`col-start-1 row-start-1 py-4 pr-4 pl-\[72px\]/g,
  "className={`col-start-1 row-start-1 w-full h-full py-4 pr-4 pl-[72px]"
);

// Layer 2
code = code.replace(
  /className=\{`col-start-1 row-start-1 absolute top-0 bottom-0 right-0 \$\{showLineNumbers \? 'left-14 sm:left-16' : 'left-0'\} p-4 box-border/g,
  "className={`col-start-1 row-start-1 w-full h-full ${showLineNumbers ? 'ml-14 sm:ml-16' : 'ml-0'} p-4 box-border"
);

// Layer 3
code = code.replace(
  /className=\{`col-start-1 row-start-1 absolute top-0 bottom-0 right-0 \$\{showLineNumbers \? 'left-14 sm:left-16' : 'left-0'\} p-4 box-border font-mono/g,
  "className={`col-start-1 row-start-1 w-full h-full ${showLineNumbers ? 'ml-14 sm:ml-16' : 'ml-0'} p-4 box-border font-mono"
);

fs.writeFileSync('src/components/VimEditor.tsx', code);
