const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf8');

// Fix min-h
code = code.replace(/min-h-\[48px\] sm:px-/g, 'min-h-[48px] sm:min-h-0 sm:px-');

// Fix the Execute button which has no sm: classes
code = code.replace(/px-4 py-3 min-h-\[48px\] rounded-lg/g, 'px-4 py-3 min-h-[48px] sm:px-3 sm:py-1.5 sm:min-h-0 rounded-lg');

// Fix stacked text classes
code = code.replace(/text-lg sm:text-sm sm:text-xs/g, 'text-lg sm:text-xs');

// Fix size={24} to have sm:size-[18px] if it lacks one (mostly the formatting bar icons)
code = code.replace(/size=\{24\} className="([^"]*)"/g, (match, p1) => {
  if (p1.includes('sm:size-')) return match;
  return `size={24} className="${p1} sm:size-[18px]"`;
});

// Also, let's fix isReadMode initial state so it starts with 'Edit'
code = code.replace(/useState<boolean>\(false\)/g, 'useState<boolean>(true)');

fs.writeFileSync('src/components/VimEditor.tsx', code);
