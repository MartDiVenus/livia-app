const fs = require('fs');
let code = fs.readFileSync('src/lib/vimCommands.ts', 'utf-8');

const targetStr = `                const success = await navigator.clipboard.writeText(files[target]);
                if (success) {
                   showFlashMessage(lang === 'it' ? \`Contenuto di "\${target}" copiato.\` : \`Content of "\${target}" copied.\`);
                } else {
                   showFlashMessage(lang === 'it' ? 'Errore durante la copia.' : 'Error copying.');
                }`;

const replaceStr = `                try {
                   await navigator.clipboard.writeText(files[target]);
                   showFlashMessage(lang === 'it' ? \`Contenuto di "\${target}" copiato.\` : \`Content of "\${target}" copied.\`);
                } catch (e) {
                   showFlashMessage(lang === 'it' ? 'Errore durante la copia.' : 'Error copying.');
                }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/lib/vimCommands.ts', code);
