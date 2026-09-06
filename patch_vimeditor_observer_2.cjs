const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `  // Track Vim mode
  useEffect(() => {
    const handleVimMode = (e: any) => {`;

const replaceStr = `  // Track Vim mode and fix search panel UI globally
  useEffect(() => {
    let observer: MutationObserver | null = null;
    if (editorRef.current?.view?.dom) {
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            const panels = document.querySelectorAll('.cm-panel input');
            panels.forEach(input => {
              if (!input.hasAttribute('data-vim-fixed')) {
                input.setAttribute('autocomplete', 'off');
                input.setAttribute('autocorrect', 'off');
                input.setAttribute('autocapitalize', 'off');
                input.setAttribute('spellcheck', 'false');
                input.setAttribute('data-form-type', 'other');
                input.setAttribute('data-vim-fixed', 'true');
                
                const parent = input.parentElement;
                if (parent) {
                  parent.childNodes.forEach(node => {
                     if (node.nodeType === 3) {
                        let text = node.textContent || '';
                        if (text.toLowerCase().includes('regexp')) {
                           node.textContent = text.replace(/\\(.*?regexp.*?\\)/i, '').replace(/javascript regexp/i, '').replace(/regexp/i, '');
                        }
                     }
                  });
                }
              }
            });
          }
        }
      });
      observer.observe(editorRef.current.view.dom, { childList: true, subtree: true });
    }

    const handleVimMode = (e: any) => {`;

code = code.replace(targetStr, replaceStr);

// add observer.disconnect() to cleanup
const targetStrCleanup = `      if (cm) {
        cm.off('vim-mode-change', handleVimMode);
      }
    };
  }, [onModeChange]);`;

const replaceStrCleanup = `      if (cm) {
        cm.off('vim-mode-change', handleVimMode);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [onModeChange]);`;

code = code.replace(targetStrCleanup, replaceStrCleanup);

fs.writeFileSync('src/components/VimEditor.tsx', code);
