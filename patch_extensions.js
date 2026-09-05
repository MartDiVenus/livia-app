const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const target = `  const extensions = [
    vim({ status: true }),`;

const replacement = `  const extensions = useMemo(() => {
  const exts = [
    vim({ status: true }),`;

code = code.replace(target, replacement);

const target2 = `  if (wordWrap) {
    extensions.push(EditorView.lineWrapping);
  }`;

const replacement2 = `  if (wordWrap) {
    exts.push(EditorView.lineWrapping);
  }
  return exts;
  }, [isSoftKeyboardOpen, syntaxHighlightOn, format, wordWrap]);`;

code = code.replace(target2, replacement2);

code = code.replace(/extensions\.push/g, 'exts.push');

fs.writeFileSync('src/components/VimEditor.tsx', code);
