const fs = require('fs');
let code = fs.readFileSync('src/components/Toolbar.tsx', 'utf8');

// Fix buttons min-h
code = code.replace(/min-h-\[48px\]/g, 'min-h-[48px] sm:min-h-0');

// Fix messed up classes from previous sed
code = code.replace(/px-4 py-3 min-h-\[48px\] sm:min-h-0\.5/g, 'px-4 py-3 min-h-[48px] sm:min-h-0 sm:px-3 sm:py-2');

// Fix text sizes: text-lg without sm: should have sm:text-sm
code = code.replace(/text-lg([^s]|$)/g, 'text-lg sm:text-sm$1');
code = code.replace(/sm:text-sm sm:text-xs/g, 'sm:text-xs');

// Fix size={24} to have sm:size-[15px] if it lacks one
code = code.replace(/size=\{24\} className="([^"]*)"/g, (match, p1) => {
  if (p1.includes('sm:size-')) return match;
  return `size={24} className="${p1} sm:size-[15px]"`;
});

fs.writeFileSync('src/components/Toolbar.tsx', code);
