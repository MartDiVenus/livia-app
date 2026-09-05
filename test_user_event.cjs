const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf-8');
const target = `if (tr.isUserEvent('input') || tr.isUserEvent('delete')) {`;
const replacement = `const userEvent = tr.annotation(import("@codemirror/state").then(m => m.Transaction.userEvent) /* hack */);
        if (tr.isUserEvent('input') || tr.isUserEvent('delete') || tr.isUserEvent('keyboard') || (tr.annotation && tr.annotation(import('@codemirror/state').Transaction.userEvent))) {`;
// Actually, let's just use regular expressions to find the transactionFilter block and replace it.
