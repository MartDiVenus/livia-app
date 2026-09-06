const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `  // Track Vim mode and fix search panel UI globally`;

const replaceStr = `  // Test async insert
  useEffect(() => {
    (window as any).testInsert = () => {
       const view = editorRef.current?.view;
       if (view) {
          const cm = getCM(view);
          if (cm) {
             setTimeout(() => {
                cm.replaceSelection("ASYNC TEST\\n");
             }, 1000);
          }
       }
    };
  }, []);
  // Track Vim mode and fix search panel UI globally`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/VimEditor.tsx', code);
