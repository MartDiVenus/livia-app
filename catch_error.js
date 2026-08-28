import fs from 'fs';
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('</head>', '<script>window.addEventListener("error", function(e) { fetch("/log-error?msg=" + encodeURIComponent(e.message)); })</script></head>');
fs.writeFileSync('index.html', html);
