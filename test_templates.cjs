const fs = require('fs');
const typesCode = fs.readFileSync('src/types.ts', 'utf-8');
// Evaluate it
const ts = require('typescript');
const jsCode = ts.transpileModule(typesCode, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
fs.writeFileSync('types_compiled.cjs', jsCode);
const { getTemplates } = require('./types_compiled.cjs');
const templates = getTemplates('it');
console.log(Object.keys(templates));
console.log(templates['help'].content.substring(0, 100));
console.log(templates['txt'].content.substring(0, 100));
