const fs = require('fs');
function fixSizes(file) {
  let c = fs.readFileSync(file, 'utf8');
  
  // Revert Text sizes
  c = c.replace(/text-3xl/g, 'text-xl');
  c = c.replace(/text-2xl/g, 'text-lg');
  
  // Revert Icons
  c = c.replace(/size=\{32\}/g, 'size={24}');
  c = c.replace(/size=\{42\}/g, 'size={32}');
  
  // Revert Heights
  c = c.replace(/min-h-\[64px\]/g, 'min-h-[48px]');
  c = c.replace(/min-h-\[56px\]/g, 'min-h-[40px]');
  c = c.replace(/h-14/g, 'h-10'); // Footer
  
  // Revert Paddings
  c = c.replace(/px-6 py-5\.5/g, 'px-4 py-3.5'); // FAB
  c = c.replace(/px-6 py-5/g, 'px-4 py-3');
  c = c.replace(/px-5 py-4/g, 'px-4 py-3');
  c = c.replace(/px-6 py-4/g, 'px-4 py-3');
  c = c.replace(/px-4 py-4/g, 'px-3 py-3'); 
  
  c = c.replace(/p-4 sm:p-1/g, 'p-2 sm:p-1'); 
  c = c.replace(/p-4 rounded-2xl/g, 'p-2.5 rounded-xl');
  c = c.replace(/w-10 h-10/g, 'w-8 h-8');
  
  fs.writeFileSync(file, c);
}

['src/components/Toolbar.tsx', 'src/components/AuxiliaryKeyboard.tsx', 'src/components/VimEditor.tsx'].forEach(fixSizes);

// Update Desktop Font Size
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/checkIsMobile\(\) \? 30 : 12/g, 'checkIsMobile() ? 30 : 20');
fs.writeFileSync('src/App.tsx', app);
