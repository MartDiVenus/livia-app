const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const enNotice = `* Intellectual Property Notice:
This software architecture, parsing logic, and source code are the proprietary 
work of the author. Manifestations of interest for the complete acquisition 
of commercial rights and ownership buyout are welcome, subject to prior economic 
agreement, while preserving the historical and moral authorship.`;

const itNotice = `* Avviso sulla Proprietà Intellettuale:
Questa architettura software, logica di parsing e codice sorgente sono opera 
proprietaria dell'autore. Manifestazioni di interesse per l'acquisizione completa 
dei diritti commerciali e il buyout di proprietà sono ben accette, previo accordo 
economico, pur preservando la paternità storica e morale.`;

code = code.replace(
  'License: CC BY-NC 4.0 (Non-commercial with attribution)',
  'License: CC BY-NC 4.0 (Non-commercial with attribution)\n\n' + enNotice
);

code = code.replace(
  'Licenza: CC BY-NC 4.0 (Non commerciale con attribuzione)',
  'Licenza: CC BY-NC 4.0 (Non commerciale con attribuzione)\n\n' + itNotice
);

fs.writeFileSync('src/types.ts', code);
console.log("Types patched");
