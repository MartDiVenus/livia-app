const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetModalHeader = `            <div className="flex items-center gap-2">
              <Cloud size={20} className="text-blue-500" />
              <h2 className="text-base font-bold text-gray-800 dark:text-zinc-100">
                {lang === 'it' ? 'Esplora Google Drive™ (Schermo Intero)' : 'Explore Google Drive™ (Full Screen)'}
              </h2>
            </div>`;

const replacementModalHeader = `            <div className="flex items-center gap-2">
              {drivePickerFilter === 'docs' ? <FileText size={20} className="text-blue-600" /> : <Cloud size={20} className="text-blue-500" />}
              <h2 className="text-base font-bold text-gray-800 dark:text-zinc-100">
                {drivePickerFilter === 'docs' 
                  ? (lang === 'it' ? 'Esplora Google Docs™' : 'Explore Google Docs™')
                  : (lang === 'it' ? 'Esplora Google Drive™' : 'Explore Google Drive™')}
              </h2>
            </div>`;

code = code.replace(targetModalHeader, replacementModalHeader);

const targetModalContent = `          {/* Search bar & Refresh */}
          <div className="flex items-center gap-3 mb-4">`;

const replacementModalContent = `          {!driveUser ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Cloud size={48} className="text-blue-500 mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-100 mb-2">
                {lang === 'it' ? 'Autenticazione Richiesta' : 'Authentication Required'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 text-center max-w-md mb-6">
                {lang === 'it'
                  ? 'Devi accedere con il tuo account Google per esplorare e importare file da Google Drive o Google Docs.'
                  : 'You must sign in with your Google account to browse and import files from Google Drive or Google Docs.'}
              </p>
              <button
                onClick={handleDriveSignIn}
                className="border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl py-3 px-6 transition-all cursor-pointer flex items-center justify-center gap-3"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0" style={{ display: 'block' }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span className="text-gray-700 dark:text-zinc-200 font-bold">{lang === 'it' ? 'Accedi con Google' : 'Sign in with Google'}</span>
              </button>
            </div>
          ) : (
            <>
          {/* Search bar & Refresh */}
          <div className="flex items-center gap-3 mb-4">`;

code = code.replace(targetModalContent, replacementModalContent);

const targetModalClose = `          </div>
        </div>
      )}`;

const replacementModalClose = `          </div>
          </>
          )}
        </div>
      )}`;

const splitCode = code.split('        </div>\n      )}\n\n      {/* Pending Action Modal (Import / Tear) */}');
if (splitCode.length === 2) {
  code = splitCode[0] + '          </>\n          )}\n        </div>\n      )}\n\n      {/* Pending Action Modal (Import / Tear) */}' + splitCode[1];
}

fs.writeFileSync('src/App.tsx', code);
