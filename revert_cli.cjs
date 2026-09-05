const fs = require('fs');
let code = fs.readFileSync('src/components/Toolbar.tsx', 'utf-8');

// Remove Terminal icon import
code = code.replace(
  "  HelpCircle,\n  Terminal,",
  "  HelpCircle,"
);

// Remove State & handlers
const stateStart = code.indexOf("  const [cliOpen, setCliOpen] = useState(false);");
const stateEnd = code.indexOf("  const fileInputRef = useRef<HTMLInputElement>(null);");

if (stateStart !== -1 && stateEnd !== -1) {
  code = code.slice(0, stateStart) + code.slice(stateEnd);
}

// Remove CLI Button
const btnStart = code.indexOf("{/* CLI Button */}");
const btnEndStr = "</button>";
if (btnStart !== -1) {
  let btnEnd = code.indexOf(btnEndStr, btnStart);
  if (btnEnd !== -1) {
    code = code.slice(0, btnStart) + code.slice(btnEnd + btnEndStr.length);
  }
}

// Remove Modal UI
const modalStart = code.indexOf("{/* CLI Modal Overlay */}");
if (modalStart !== -1) {
  const modalEnd = code.lastIndexOf("</div>\n  );\n}\n");
  if (modalEnd !== -1 && modalEnd > modalStart) {
    code = code.slice(0, modalStart) + code.slice(modalEnd);
  }
}

fs.writeFileSync('src/components/Toolbar.tsx', code);
console.log("Reverted successfully");
