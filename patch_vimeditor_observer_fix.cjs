const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');

const targetStr = `                const parent = input.parentElement;
                if (parent) {
                  parent.childNodes.forEach(node => {
                     if (node.nodeType === 3) {
                        let text = node.textContent || '';
                        if (text.toLowerCase().includes('regexp')) {
                           node.textContent = text.replace(/\\(.*?regexp.*?\\)/i, '').replace(/javascript regexp/i, '').replace(/regexp/i, '');
                        }
                     }
                  });
                }`;

const replaceStr = `                const parent = input.parentElement;
                if (parent) {
                  // Hide any span that contains "regexp" text
                  const spans = parent.querySelectorAll('span');
                  spans.forEach(span => {
                    if (span.textContent?.toLowerCase().includes('regexp')) {
                      span.style.display = 'none';
                    }
                  });
                  // Also check direct text nodes just in case
                  parent.childNodes.forEach(node => {
                     if (node.nodeType === 3) {
                        let text = node.textContent || '';
                        if (text.toLowerCase().includes('regexp')) {
                           node.textContent = text.replace(/\\(.*?regexp.*?\\)/i, '').replace(/javascript regexp/i, '').replace(/regexp/i, '');
                        }
                     }
                  });
                }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/VimEditor.tsx', code);
