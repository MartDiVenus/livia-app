const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `  const extensions = useMemo(() => {
  const exts = [
    vim({ status: true }),`;

const replaceStr = `  const extensions = useMemo(() => {
  const mobileIntercept = Prec.highest(keymap.of([
    {
      key: ':',
      run: (view) => {
        if (isTouchDeviceRef.current && currentModeRef.current !== 'insert') {
          const cm = getCM(view);
          if (cm && Vim) {
            let cmd = window.prompt(lang === 'it' ? 'Inserisci comando Vim (es. w, q, tear local)' : 'Enter Vim command (e.g. w, q, tear local)');
            if (cmd !== null) {
              cmd = cmd.trim();
              if (cmd.startsWith(':')) {
                cmd = cmd.substring(1).trim();
              }
              if (cmd) {
                try {
                  Vim.handleEx(cm as any, cmd);
                } catch(e: any) {
                  console.error('Vim handleEx error', e);
                  alert('Errore: ' + e.message);
                }
              }
              if (!cmd.toLowerCase().startsWith('help') && !cmd.toLowerCase().startsWith('h')) {
                setTimeout(() => {
                  view.contentDOM.focus();
                }, 50);
              } else {
                 view.contentDOM.blur(); // ensure keyboard closes
              }
            }
          }
          return true; // handled
        }
        return false;
      }
    },
    {
      key: '/',
      run: (view) => {
        if (isTouchDeviceRef.current && currentModeRef.current !== 'insert') {
          const cm = getCM(view);
          if (cm && Vim) {
            let query = window.prompt(lang === 'it' ? 'Cerca (regexp):' : 'Search (regexp):');
            if (query !== null && query.trim() !== '') {
               // Execute search via Ex command
               try {
                 cm.operation(() => {
                   Vim.handleEx(cm as any, '/' + query);
                 });
               } catch (e: any) {
                 console.error('Vim search error', e);
               }
               setTimeout(() => {
                 view.contentDOM.focus();
               }, 50);
            }
          }
          return true; // handled
        }
        return false;
      }
    }
  ]));

  const exts = [
    mobileIntercept,
    vim({ status: true }),`;

code = code.replace(targetStr, replaceStr);

// add Prec to imports if not there
if (!code.includes('Prec,')) {
    code = code.replace(`import { keymap }`, `import { keymap, Prec }`);
}

fs.writeFileSync('src/components/VimEditor.tsx', code);
