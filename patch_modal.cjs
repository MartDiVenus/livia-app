const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add state for pending file action
const targetState = `  const [isDriveFullScreen, setIsDriveFullScreen] = useState<boolean>(false);`;
const replacementState = `  const [isDriveFullScreen, setIsDriveFullScreen] = useState<boolean>(false);
  const [drivePickerFilter, setDrivePickerFilter] = useState<'all' | 'docs'>('all');
  const [pendingFileAction, setPendingFileAction] = useState<{
    source: 'local' | 'drive';
    name: string;
    localContent?: string;
    localFormat?: any;
    driveFile?: any;
  } | null>(null);`;
code = code.replace(targetState, replacementState);

// 2. Modify Toolbar onImportFileAction
const targetToolbar = `        onLoadContent={handleLoadContent}`;
const replacementToolbar = `        onLoadContent={handleLoadContent}
        onImportFileAction={(content, name, format) => setPendingFileAction({ source: 'local', name, localContent: content, localFormat: format })}
        onOpenDrivePicker={() => { setDrivePickerFilter('all'); setIsDriveFullScreen(true); }}
        onOpenDocsPicker={() => { setDrivePickerFilter('docs'); setIsDriveFullScreen(true); }}`;
code = code.replace(targetToolbar, replacementToolbar);

// 3. Modify handleOpenDriveFile in the full screen modal
// We only want to intercept it if they are using the full screen modal (which is now our generic picker)
const targetDriveClick = `                      } else {
                        handleOpenDriveFile(file);
                        setIsDriveFullScreen(false);
                      }`;
const replacementDriveClick = `                      } else {
                        setPendingFileAction({ source: 'drive', name: file.name, driveFile: file });
                        setIsDriveFullScreen(false);
                      }`;
code = code.replace(targetDriveClick, replacementDriveClick);

// 4. Also we need to filter the drive modal if 'docs' is selected
const targetDriveFilter = `            {driveFiles
              .filter(f => f.name.toLowerCase().includes(driveSearch.toLowerCase()))
              .map((file, idx) => {`;
const replacementDriveFilter = `            {driveFiles
              .filter(f => f.name.toLowerCase().includes(driveSearch.toLowerCase()))
              .filter(f => drivePickerFilter === 'all' || f.mimeType === 'application/vnd.google-apps.folder' || f.mimeType === 'application/vnd.google-apps.document')
              .map((file, idx) => {`;
code = code.replace(targetDriveFilter, replacementDriveFilter);

// 5. Add the pendingFileAction Modal UI
const targetModalUI = `      {/* Google Docs Modal */}`;
const replacementModalUI = `      {/* Pending Action Modal (Import / Tear) */}
      {pendingFileAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white dark:bg-[#16181D] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2D2D2D] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-[#2D2D2D] flex items-center justify-between bg-gray-50/50 dark:bg-[#0D0F12]/50">
              <h3 className="font-bold text-gray-800 dark:text-zinc-100 flex items-center gap-2">
                <Sparkles size={16} className="text-blue-500" />
                {lang === 'it' ? 'Azione Richiesta' : 'Action Required'}
              </h3>
              <button 
                onClick={() => setPendingFileAction(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              <p className="text-sm text-gray-600 dark:text-zinc-400 text-center">
                {lang === 'it' ? \`Cosa vuoi fare con il file "\${pendingFileAction.name}"?\` : \`What do you want to do with "\${pendingFileAction.name}"?\`}
              </p>
              
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={async () => {
                    const action = pendingFileAction;
                    setPendingFileAction(null);
                    if (action.source === 'local' && action.localContent) {
                      handleLoadContent(action.localContent, action.name, action.localFormat);
                    } else if (action.source === 'drive' && action.driveFile) {
                      handleOpenDriveFile(action.driveFile);
                    }
                  }}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <FileText size={16} />
                  {lang === 'it' ? 'Apri nell\\'Editor' : 'Open in Editor'}
                </button>
                
                <button
                  onClick={async () => {
                    const action = pendingFileAction;
                    setPendingFileAction(null);
                    
                    if (action.source === 'local' && action.localContent !== undefined) {
                      const success = await copyToClipboard(action.localContent);
                      if (success) showToast(lang === 'it' ? \`Contenuto di "\${action.name}" strappato!\` : \`Content of "\${action.name}" torn!\`, 'success');
                      else showToast(lang === 'it' ? 'Errore durante la copia.' : 'Error copying.', 'error');
                    } else if (action.source === 'drive' && action.driveFile) {
                      if (!driveToken) return;
                      setIsLoadingDrive(true);
                      try {
                        const fileContent = await readFromDrive(driveToken, action.driveFile.id, action.driveFile.mimeType);
                        const success = await copyToClipboard(fileContent);
                        if (success) showToast(lang === 'it' ? \`Contenuto di "\${action.name}" strappato!\` : \`Content of "\${action.name}" torn!\`, 'success');
                        else showToast(lang === 'it' ? 'Errore durante la copia.' : 'Error copying.', 'error');
                      } catch (err) {
                        showToast(lang === 'it' ? 'Errore di download da Drive.' : 'Error downloading from Drive.', 'error');
                      } finally {
                        setIsLoadingDrive(false);
                      }
                    }
                  }}
                  className="w-full py-3 px-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  {lang === 'it' ? 'Strappa (Copia negli appunti)' : 'Tear (Copy to clipboard)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Docs Modal */}`;
code = code.replace(targetModalUI, replacementModalUI);

fs.writeFileSync('src/App.tsx', code);
