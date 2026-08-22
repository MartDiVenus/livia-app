const fs = require('fs');

function upscaleMobile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // Text sizes
  code = code.replace(/text-lg sm:text-xs/g, 'text-2xl sm:text-xs');
  code = code.replace(/text-lg sm:text-sm/g, 'text-2xl sm:text-sm');
  code = code.replace(/text-xl sm:text-xs/g, 'text-3xl sm:text-xs');
  code = code.replace(/text-xl sm:text-lg/g, 'text-3xl sm:text-xs'); // fixed aux keyboard from text-lg to text-xs
  code = code.replace(/text-xs sm:text-xs/g, 'text-xl sm:text-xs');
  
  // Padding & Min heights
  code = code.replace(/min-h-\[48px\]/g, 'min-h-[64px]');
  code = code.replace(/px-4 py-3/g, 'px-5 py-4');
  code = code.replace(/px-5 py-4/g, 'px-6 py-5');
  code = code.replace(/p-3 sm:p-1.5/g, 'p-4 sm:p-1.5');
  code = code.replace(/p-1.5 sm:p-1/g, 'p-3 sm:p-1');
  code = code.replace(/p-2.5 rounded-xl/g, 'p-4 rounded-2xl');

  // Icons
  code = code.replace(/size=\{24\}/g, 'size={32}');
  code = code.replace(/size=\{20\}/g, 'size={32}');
  
  // Specific Info Button
  code = code.replace(/w-5 h-5/g, 'w-10 h-10 sm:w-5 sm:h-5');
  code = code.replace(/text-\[11px\]/g, 'text-[18px] sm:text-[11px]');

  // Logo size on mobile (was 32, make it 48?)
  code = code.replace(/<Logo size=\{32\}/g, '<Logo size={42} className="sm:size-[32px]"');

  fs.writeFileSync(filePath, code);
}

upscaleMobile('src/components/Toolbar.tsx');
upscaleMobile('src/components/AuxiliaryKeyboard.tsx');
upscaleMobile('src/components/VimEditor.tsx');
