const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf8');

code = code.replace(
`    if (mode === 'normal' || mode === 'command') {
      textarea.setSelectionRange(cursorIndex, Math.min(cursorIndex + 1, content.length));
    } else if (mode === 'visual' || mode === 'visual-line') {
      const anchor = visualAnchorIndex;
      const current = cursorIndex;
      
      if (mode === 'visual-line') {
        const bounds = getVisualLineBounds(content, Math.min(anchor, current), Math.max(anchor, current));
        textarea.setSelectionRange(bounds.startOfLines, bounds.endOfLines);
      } else {
        textarea.setSelectionRange(Math.min(anchor, current), Math.max(anchor, current) + 1);
      }
    } else {
      textarea.setSelectionRange(cursorIndex, cursorIndex);
    }`,
`    if (mode === 'normal' || mode === 'command') {
      const expectedEnd = Math.min(cursorIndex + 1, content.length);
      if (textarea.selectionStart !== cursorIndex || textarea.selectionEnd !== expectedEnd) {
        textarea.setSelectionRange(cursorIndex, expectedEnd);
      }
    } else if (mode === 'visual' || mode === 'visual-line') {
      const anchor = visualAnchorIndex;
      const current = cursorIndex;
      
      if (mode === 'visual-line') {
        const bounds = getVisualLineBounds(content, Math.min(anchor, current), Math.max(anchor, current));
        if (textarea.selectionStart !== bounds.startOfLines || textarea.selectionEnd !== bounds.endOfLines) {
          textarea.setSelectionRange(bounds.startOfLines, bounds.endOfLines);
        }
      } else {
        const expectedStart = Math.min(anchor, current);
        const expectedEnd = Math.max(anchor, current) + 1;
        if (textarea.selectionStart !== expectedStart || textarea.selectionEnd !== expectedEnd) {
          textarea.setSelectionRange(expectedStart, expectedEnd);
        }
      }
    } else {
      if (textarea.selectionStart !== cursorIndex || textarea.selectionEnd !== cursorIndex) {
        textarea.setSelectionRange(cursorIndex, cursorIndex);
      }
    }`
);

fs.writeFileSync('src/components/VimEditor.tsx', code);
console.log('Done');
