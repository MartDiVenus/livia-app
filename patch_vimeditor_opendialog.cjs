const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `  // Test async insert
  useEffect(() => {`;

const replaceStr = `  // Patch Vim's openDialog on mobile to use native prompt (fixes focus/keyboard issues)
  useEffect(() => {
    if (editorRef.current?.view && isTouchDeviceRef.current) {
       const cm = getCM(editorRef.current.view);
       if (cm) {
          cm.openDialog = (template: any, callback: any, options: any) => {
            let shortText = "";
            if (typeof options?.prefix === "string" && options.prefix) {
               shortText += options.prefix;
            } else if (options?.prefix?.textContent) {
               shortText += options.prefix.textContent;
            } else if (typeof template === 'string') {
               shortText += template.replace(/<[^>]+>/g, '');
            } else if (template?.textContent) {
               shortText += template.textContent;
            }
            if (options?.desc) shortText += " " + options.desc;
            
            shortText = shortText.replace(/\\(.*?regexp.*?\\)/i, '').replace(/javascript regexp/i, '').replace(/regexp/i, '').trim();
            if (!shortText) shortText = "Command/Search:";
            
            let result = window.prompt(shortText, options?.value || "");
            if (result !== null) {
              if (callback) {
                 try {
                    cm.operation(() => {
                       callback(result);
                    });
                 } catch(e: any) {
                    console.error("Dialog callback error", e);
                 }
              }
            }
            
            if (!result?.toLowerCase().startsWith('help') && !result?.toLowerCase().startsWith('h')) {
              setTimeout(() => {
                if (editorRef.current?.view) {
                  editorRef.current.view.contentDOM.focus();
                }
              }, 50);
            } else {
              setTimeout(() => {
                if (editorRef.current?.view) {
                  editorRef.current.view.contentDOM.blur();
                }
              }, 50);
            }
            
            return () => {}; // Return a dummy close function
          };
       }
    }
  }, [editorRef.current?.view, isTouchDevice]);

  // Test async insert
  useEffect(() => {`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/VimEditor.tsx', code);
