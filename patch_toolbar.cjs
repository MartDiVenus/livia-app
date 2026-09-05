const fs = require('fs');
let code = fs.readFileSync('src/components/Toolbar.tsx', 'utf-8');

// Add props
code = code.replace(
  "  onOpenAiProfiles: () => void;",
  "  onOpenAiProfiles: () => void;\n  onOpenDrivePicker?: () => void;\n  onOpenDocsPicker?: () => void;"
);

code = code.replace(
  "  onOpenAiProfiles",
  "  onOpenAiProfiles,\n  onOpenDrivePicker,\n  onOpenDocsPicker"
);

// Replace "Apri File Locale" button
const targetBtn = `                  <button
                    type="button"
                    onClick={() => {
                      setImportMenuOpen(false);
                      setMobileMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg text-left text-gray-800 dark:text-zinc-200 cursor-pointer font-bold"
                  >
                    <FolderOpen size={16} className="text-amber-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">{lang === 'it' ? 'Apri File Locale' : 'Open Local File'}</span>
                      <span className="text-[11px] text-gray-400 dark:text-zinc-400 font-normal">{lang === 'it' ? 'Seleziona da dispositivo (.txt, .md, .docx...)' : 'Select from device'}</span>
                    </div>
                  </button>`;

const replacementBtn = `                  <button
                    type="button"
                    onClick={() => {
                      setImportMenuOpen(false);
                      setMobileMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg text-left text-gray-800 dark:text-zinc-200 cursor-pointer font-bold"
                  >
                    <FolderOpen size={16} className="text-amber-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">Import/tear from Local File</span>
                      <span className="text-[11px] text-gray-400 dark:text-zinc-400 font-normal">{lang === 'it' ? 'Seleziona da dispositivo' : 'Select from device'}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportMenuOpen(false);
                      setMobileMenuOpen(false);
                      if (onOpenDrivePicker) onOpenDrivePicker();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg text-left text-gray-800 dark:text-zinc-200 cursor-pointer font-bold"
                  >
                    <Cloud size={16} className="text-blue-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">Import/tear from Google Drive™</span>
                      <span className="text-[11px] text-gray-400 dark:text-zinc-400 font-normal">{lang === 'it' ? 'Esplora e seleziona file' : 'Browse and select file'}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportMenuOpen(false);
                      setMobileMenuOpen(false);
                      if (onOpenDocsPicker) onOpenDocsPicker();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg text-left text-gray-800 dark:text-zinc-200 cursor-pointer font-bold"
                  >
                    <FileText size={16} className="text-blue-600 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">Import/tear from Google Docs™</span>
                      <span className="text-[11px] text-gray-400 dark:text-zinc-400 font-normal">{lang === 'it' ? 'Seleziona documento' : 'Select document'}</span>
                    </div>
                  </button>`;

if (code.includes(targetBtn)) {
  code = code.replace(targetBtn, replacementBtn);
} else {
  console.log("targetBtn not found in Toolbar.tsx");
}

fs.writeFileSync('src/components/Toolbar.tsx', code);
