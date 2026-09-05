const fs = require('fs');
let code = fs.readFileSync('src/components/Toolbar.tsx', 'utf-8');

// 1. Import Terminal (if not already there)
if (!code.includes('Terminal,')) {
    code = code.replace(
      "  HelpCircle,",
      "  HelpCircle,\n  Terminal,"
    );
}

// 2. Add state and handlers
const stateInsertion = `  const [cliOpen, setCliOpen] = useState(false);
  const [cliInput, setCliInput] = useState('');
  const cliInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cliOpen) {
      setTimeout(() => cliInputRef.current?.focus(), 50);
    }
  }, [cliOpen]);

  const handleCliSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = cliInput.trim().toLowerCase();
    setCliOpen(false);
    setCliInput('');

    if (cmd === ':tear local') {
      fileInputRef.current?.click();
    } else if (cmd === ':tear drive') {
      if (onOpenDrivePicker) onOpenDrivePicker();
    } else if (cmd === ':tear docs') {
      if (onOpenDocsPicker) onOpenDocsPicker();
    } else if (cmd === ':w') {
      onSaveFile();
    } else if (cmd !== '' && cmd !== ':q') {
      alert(lang === 'it' ? \`Comando non riconosciuto: \${cmd}\` : \`Unrecognized command: \${cmd}\`);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);`;

if (!code.includes('const [cliOpen, setCliOpen]')) {
    code = code.replace("  const fileInputRef = useRef<HTMLInputElement>(null);", stateInsertion);
}

// 3. Insert Terminal button
const terminalBtn = `            {/* CLI Button */}
            <button
              onClick={() => setCliOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#2D2D2D] bg-gray-50 dark:bg-[#16181D] text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-[#2C313C] transition-all cursor-pointer font-bold text-xs"
              title="LiViA CLI"
            >
              <Terminal size={15} />
              <span className="hidden sm:inline font-mono text-[10px]">{'>_'}</span>
            </button>

            {onOpenGuide && (`

if (!code.includes('setCliOpen(true)')) {
    code = code.replace("            {onOpenGuide && (", terminalBtn);
}

// 4. Insert CLI Modal UI at the end of component
const cliModalUI = `      {/* CLI Modal Overlay */}
      {cliOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
          <div className="bg-white dark:bg-[#16181D] w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 dark:border-[#2D2D2D] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="p-3 bg-gray-50/50 dark:bg-[#0D0F12]/50 border-b border-gray-100 dark:border-[#2D2D2D] flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700 dark:text-zinc-300">
                <Terminal size={16} />
                <span className="font-bold text-sm">LiViA CLI</span>
              </div>
              <button onClick={() => setCliOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCliSubmit} className="p-4 flex items-center gap-2 border-b border-gray-100 dark:border-[#2D2D2D]">
              <span className="text-blue-500 font-bold font-mono text-lg">{'>'}</span>
              <input
                ref={cliInputRef}
                type="text"
                value={cliInput}
                onChange={(e) => setCliInput(e.target.value)}
                placeholder={lang === 'it' ? 'Es. :tear local, :tear drive, :w' : 'e.g., :tear local, :tear drive, :w'}
                className="flex-1 bg-transparent border-none outline-none text-gray-800 dark:text-zinc-100 font-mono text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                autoComplete="off"
                spellCheck="false"
              />
            </form>
            <div className="px-4 py-3 text-xs text-gray-500 dark:text-zinc-400 flex flex-col gap-1.5 font-mono bg-gray-50/30 dark:bg-[#0D0F12]/30">
              <span className="font-bold text-gray-700 dark:text-zinc-300 mb-1">{lang === 'it' ? 'Comandi Disponibili:' : 'Available Commands:'}</span>
              <span className="hover:text-gray-800 dark:hover:text-zinc-200 transition-colors cursor-pointer" onClick={() => setCliInput(':tear local')}>- :tear local</span>
              <span className="hover:text-gray-800 dark:hover:text-zinc-200 transition-colors cursor-pointer" onClick={() => setCliInput(':tear drive')}>- :tear drive</span>
              <span className="hover:text-gray-800 dark:hover:text-zinc-200 transition-colors cursor-pointer" onClick={() => setCliInput(':tear docs')}>- :tear docs</span>
              <span className="hover:text-gray-800 dark:hover:text-zinc-200 transition-colors cursor-pointer" onClick={() => setCliInput(':w')}>- :w (salva/save)</span>
              <span className="hover:text-gray-800 dark:hover:text-zinc-200 transition-colors cursor-pointer" onClick={() => {setCliInput(':q'); setCliOpen(false);}}>- :q (esci/quit)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

if (!code.includes('CLI Modal Overlay')) {
    code = code.replace("    </div>\n  );\n}\n", cliModalUI);
}

fs.writeFileSync('src/components/Toolbar.tsx', code);
console.log("Patched successfully");
