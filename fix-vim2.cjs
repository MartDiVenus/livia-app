const fs = require('fs');
let code = fs.readFileSync('src/components/VimEditor.tsx', 'utf8');

// Revert showPreview to false
code = code.replace(/const \[showPreview, setShowPreview\] = useState<boolean>\(true\);/g, 'const [showPreview, setShowPreview] = useState<boolean>(false);');

fs.writeFileSync('src/components/VimEditor.tsx', code);
