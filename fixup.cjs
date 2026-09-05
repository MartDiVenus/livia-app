const fs = require('fs');
let code = fs.readFileSync('clean.tsx', 'utf-8');
const lines = code.split('\n');
const fixedLines = [];
let skip = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// Fix G in visual mode stopping at the first character')) {
    fixedLines.push('    // Map G in visual mode to select to the very end of the last line');
    fixedLines.push('    Vim.defineAction("gotoEndFull", (cm) => {');
    fixedLines.push('      (window as any).isVimHandling = true;');
    fixedLines.push('      Vim.handleKey(cm, "G", "mapping");');
    fixedLines.push('      Vim.handleKey(cm, "$", "mapping");');
    fixedLines.push('      (window as any).isVimHandling = false;');
    fixedLines.push('    });');
    fixedLines.push('    Vim.mapCommand("G", "action", "gotoEndFull", {}, { context: "visual" });');
    // skip until _liviaFindKeyPatched
    while(!lines[i+1].includes('if (!(Vim as any)._liviaFindKeyPatched) {')) {
      i++;
    }
  } else {
    fixedLines.push(lines[i]);
  }
}
fs.writeFileSync('src/components/VimEditor.tsx', fixedLines.join('\n'));
