const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  "// Omit Content-Length to force chunked encoding and bypass the 32MB Cloud Run payload limit",
  "// Explicitly set chunked encoding to bypass the 32MB Cloud Run payload limit\n        res.setHeader('Transfer-Encoding', 'chunked');"
);
fs.writeFileSync('server.ts', content);
