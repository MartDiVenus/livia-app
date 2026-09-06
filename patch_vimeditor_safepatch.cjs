const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `  // Patch Vim's openDialog on mobile to use native prompt (fixes focus/keyboard issues)
  useEffect(() => {
    if (editorRef.current?.view && isTouchDeviceRef.current) {
       const cm = getCM(editorRef.current.view);
       if (cm) {
          cm.openDialog = (template: any, callback: any, options: any) => {`;

const replaceStr = `  // Patch Vim's openDialog on mobile to use native prompt (fixes focus/keyboard issues)
  useEffect(() => {
    const patchDialog = () => {
       if (editorRef.current?.view && isTouchDeviceRef.current) {
          const cm = getCM(editorRef.current.view);
          if (cm && !cm._dialogPatched) {
             cm._dialogPatched = true;
             cm.openDialog = (template: any, callback: any, options: any) => {`;

const targetStr2 = `            return () => {}; // Return a dummy close function
          };
       }
    }
  }, [editorRef.current?.view, isTouchDevice]);`;

const replaceStr2 = `            return () => {}; // Return a dummy close function
             };
          }
       }
    };
    
    // Try patching immediately and also set a few fallbacks
    patchDialog();
    const interval = setInterval(patchDialog, 500);
    return () => clearInterval(interval);
  }, [isTouchDevice]);`;

code = code.replace(targetStr, replaceStr);
code = code.replace(targetStr2, replaceStr2);

fs.writeFileSync('src/components/VimEditor.tsx', code);
