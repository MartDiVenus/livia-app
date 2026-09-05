const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const target = `  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0D0F12] text-gray-900 dark:text-[#E0E0E0] transition-colors duration-200 min-w-0 min-h-0 overflow-hidden">`;

const replacement = `  const basicSetupOptions = useMemo(() => ({
    lineNumbers: showLineNumbers,
    foldGutter: true,
    highlightActiveLine: false,
    highlightSelectionMatches: true,
  }), [showLineNumbers]);

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#0D0F12] text-gray-900 dark:text-[#E0E0E0] transition-colors duration-200 min-w-0 min-h-0 overflow-hidden">`;

code = code.replace(target, replacement);

const target2 = `              basicSetup={{
                lineNumbers: showLineNumbers,
                foldGutter: true,
                highlightActiveLine: false,
                highlightSelectionMatches: true,
              }}`;

const replacement2 = `              basicSetup={basicSetupOptions}`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/components/VimEditor.tsx', code);
