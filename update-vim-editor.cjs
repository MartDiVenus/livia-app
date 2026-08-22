const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf8');

code = code.replace(
`  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    if (isProgrammaticSelectionRef.current) {
      isProgrammaticSelectionRef.current = false;
      return;
    }
    let start = e.currentTarget.selectionStart;
    if (mode === 'normal') {
      if (!isUserPointerDownRef.current) {
        return;
      }
      isUserPointerDownRef.current = false;
      // Prevent normal-mode cursor from landing on newline index upon clicking`,
`  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    if (isProgrammaticSelectionRef.current) {
      return;
    }
    let start = e.currentTarget.selectionStart;
    let end = e.currentTarget.selectionEnd;
    
    // Ignore selection events that match our programmatic state
    if (mode === 'normal' && start === cursorIndex && end === Math.min(cursorIndex + 1, content.length)) return;
    if ((mode === 'visual' || mode === 'visual-line')) {
        const expectedStart = mode === 'visual-line' ? getVisualLineBounds(content, Math.min(visualAnchorIndex, cursorIndex), Math.max(visualAnchorIndex, cursorIndex)).startOfLines : Math.min(visualAnchorIndex, cursorIndex);
        const expectedEnd = mode === 'visual-line' ? getVisualLineBounds(content, Math.min(visualAnchorIndex, cursorIndex), Math.max(visualAnchorIndex, cursorIndex)).endOfLines : Math.min(Math.max(visualAnchorIndex, cursorIndex) + 1, content.length);
        if (start === expectedStart && end === expectedEnd) return;
    }
    if ((mode === 'insert' || mode === 'command') && start === cursorIndex && end === cursorIndex) return;

    if (mode === 'normal') {
      if (!isUserPointerDownRef.current) {
        return;
      }
      isUserPointerDownRef.current = false;
      // Prevent normal-mode cursor from landing on newline index upon clicking`
);

code = code.replace(
`      // Automatically keep cursor line visible on scroll with margin
      const textarea = textareaRef.current;
      const currentScrollTop = textarea.scrollTop;`,
`      // Wait for React's synthetic onSelect to fire before allowing user selections again
      setTimeout(() => {
        isProgrammaticSelectionRef.current = false;
      }, 10);

      // Automatically keep cursor line visible on scroll with margin
      const textarea = textareaRef.current;
      const currentScrollTop = textarea.scrollTop;`
);

fs.writeFileSync('src/components/VimEditor.tsx', code);
console.log('Done');
