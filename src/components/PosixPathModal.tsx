import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  FolderPlus,
  FileCheck2,
  Terminal,
  ClipboardPaste,
  FileText,
  FilePlus2,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Clock,
  X,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  Cloud,
  Copy,
  LogIn,
} from 'lucide-react';
import {
  getPosixRootConfig,
  savePosixRootConfig,
  getSavedRootDirHandle,
  addMountedDirectoryHandle,
  getMountedDirectoriesMeta,
  removeMountedDirectory,
  getBoundPosixFilesMeta,
  removeBoundPosixFile,
  promptAndBindSinglePosixFile,
  getDetectedHomePrefix,
  setDetectedHomePrefix,
  detectAndSaveHomePrefix,
  clearPosixRootAuthorization,
  registerFallbackDirectoryFiles,
  hasFallbackFilesInMemory,
  getRecentPosixPaths,
  removeRecentPosixPath,
  normalizePosixPath,
  PosixRootConfig,
  MountedPosixDirectoryMeta,
  BoundPosixFileMeta,
  RecentPosixEntry,
} from '../utils/posixFileSystem';
import {
  extractDriveFileId,
  isDriveReferenceLike,
  getRecentDriveRefs,
  removeRecentDriveRef,
  RecentDriveEntry,
} from '../utils/googleDrive';

export type PosixActionType = 'open' | 'read' | 'tear';

interface PosixPathModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPath?: string;
  initialAction?: PosixActionType;
  activePosixPath?: string | null;
  activeDriveFileId?: string | null;
  driveUser?: { displayName: string | null; email: string | null } | null;
  onDriveSignIn?: () => Promise<void>;
  currentFilename?: string;
  lang: 'en' | 'it';
  onExecutePosixAction: (posixPathOrDriveRef: string, action: PosixActionType) => Promise<void>;
}

export const PosixPathModal: React.FC<PosixPathModalProps> = ({
  isOpen,
  onClose,
  initialPath = '',
  initialAction = 'open',
  activePosixPath,
  activeDriveFileId,
  driveUser,
  onDriveSignIn,
  currentFilename,
  lang,
  onExecutePosixAction,
}) => {
  const [posixInput, setPosixInput] = useState(initialPath);
  const [action, setAction] = useState<PosixActionType>(initialAction);
  const [config, setConfig] = useState<PosixRootConfig>(() => getPosixRootConfig());
  const [mountedDirs, setMountedDirs] = useState<MountedPosixDirectoryMeta[]>(() => getMountedDirectoriesMeta());
  const [boundFiles, setBoundFiles] = useState<BoundPosixFileMeta[]>(() => getBoundPosixFilesMeta());
  const [detectedHome, setDetectedHome] = useState<string>(() => getDetectedHomePrefix());
  const [hasFsHandle, setHasFsHandle] = useState(false);
  const [recentPaths, setRecentPaths] = useState<RecentPosixEntry[]>([]);
  const [recentDriveRefs, setRecentDriveRefs] = useState<RecentDriveEntry[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fallbackDirInputRef = useRef<HTMLInputElement>(null);

  const refreshMetadataState = () => {
    const currentCfg = getPosixRootConfig();
    setConfig(currentCfg);
    setMountedDirs(getMountedDirectoriesMeta());
    setBoundFiles(getBoundPosixFilesMeta());
    setDetectedHome(getDetectedHomePrefix());
    setRecentPaths(getRecentPosixPaths());
    setRecentDriveRefs(getRecentDriveRefs());
  };

  useEffect(() => {
    if (isOpen) {
      if (initialPath) {
        setPosixInput(initialPath);
        detectAndSaveHomePrefix(initialPath);
      }
      refreshMetadataState();
      setStatusMessage(null);
      setAction(initialAction);

      getSavedRootDirHandle().then((handle) => {
        setHasFsHandle(Boolean(handle));
      });

      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 60);
    }
  }, [isOpen, initialPath, initialAction]);

  if (!isOpen) return null;

  const isIt = lang === 'it';
  const detectedDriveId = extractDriveFileId(posixInput);
  const isDriveInput = Boolean(detectedDriveId);

  const handleInputChange = (val: string) => {
    setPosixInput(val);
    if (val.trim() && !isDriveReferenceLike(val)) {
      const home = detectAndSaveHomePrefix(val);
      if (home && home !== detectedHome) {
        setDetectedHome(home);
      }
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const trimmed = text.trim();
        handleInputChange(trimmed);
        setStatusMessage({
          type: 'info',
          text: isIt
            ? 'Percorso / URL / ID incollato dagli appunti.'
            : 'Path / URL / ID pasted from clipboard.',
        });
        inputRef.current?.focus();
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: isIt
          ? 'Impossibile leggere gli appunti automaticamente. Usa Ctrl+V / Incolla nel campo testo.'
          : 'Cannot read clipboard automatically. Use Ctrl+V / Paste in the input field.',
      });
      inputRef.current?.focus();
    }
  };

  const handleAuthorizeNativeDirectory = async () => {
    setStatusMessage(null);
    const win = window as any;
    if (typeof win.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await win.showDirectoryPicker({ mode: 'readwrite' });
        const meta = await addMountedDirectoryHandle(dirHandle);
        refreshMetadataState();
        setHasFsHandle(true);
        setStatusMessage({
          type: 'success',
          text: isIt
            ? `Cartella "${meta.name}" aggiunta a $HOME virtuale (${meta.basePrefix || meta.name}) con lettura e scrittura :w diretta.`
            : `Folder "${meta.name}" added to virtual $HOME (${meta.basePrefix || meta.name}) with direct :w read/write.`,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        const msg = String(err?.message || '');
        if (
          err?.name === 'SecurityError' ||
          err?.name === 'NotAllowedError' ||
          msg.toLowerCase().includes('system') ||
          msg.toLowerCase().includes('restricted')
        ) {
          setStatusMessage({
            type: 'info',
            text: isIt
              ? 'Il browser blocca la selezione dell\'intera $HOME come cartella unica (per proteggere .ssh/.gnupg), ma permette di aprire QUALSIASI file singolo nella $HOME! Clicca su "Aggancia File Singolo ($HOME)" oppure aggiungi le singole sottocartelle (Documenti, Scrivania, Scaricati...).'
              : 'The browser blocks selecting the entire $HOME root as a folder, but allows opening ANY single file in $HOME! Click "Bind Single File ($HOME)" or add individual subfolders (Documents, Desktop, Downloads...).',
          });
          return;
        }
        fallbackDirInputRef.current?.click();
      }
    } else {
      fallbackDirInputRef.current?.click();
    }
  };

  const handleBindSingleFile = async () => {
    setStatusMessage(null);
    setIsLoading(true);
    try {
      const targetPath = !isDriveInput && posixInput.trim() ? normalizePosixPath(posixInput.trim()) : undefined;
      const resolved = await promptAndBindSinglePosixFile(targetPath);
      refreshMetadataState();
      setPosixInput(resolved.posixPath);
      await onExecutePosixAction(resolved.posixPath, action);
      onClose();
    } catch (err: any) {
      if (err?.name === 'AbortError' || String(err?.message || '').includes('annullata')) {
        return;
      }
      setStatusMessage({
        type: 'error',
        text:
          err?.message ||
          (isIt
            ? 'Impossibile agganciare il file selezionato.'
            : 'Could not bind the selected file.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFallbackDirectorySelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const updated = registerFallbackDirectoryFiles(files);
    refreshMetadataState();
    setStatusMessage({
      type: 'success',
      text: isIt
        ? `Cartella "${updated.rootName}" indicizzata (${updated.indexedFileCount} file pronti per apertura POSIX).`
        : `Folder "${updated.rootName}" indexed (${updated.indexedFileCount} files ready for POSIX open).`,
    });
    e.target.value = '';
  };

  const handleDisconnectAllRoots = async () => {
    await clearPosixRootAuthorization();
    refreshMetadataState();
    setHasFsHandle(false);
    setStatusMessage({
      type: 'info',
      text: isIt ? 'Tutte le cartelle autorizzate sono state scollegate.' : 'All authorized folders disconnected.',
    });
  };

  const executePath = async (targetPath: string, targetAction: PosixActionType) => {
    const rawTrimmed = (targetPath || '').trim();
    const isDriveTarget = isDriveReferenceLike(rawTrimmed);
    const cleaned = isDriveTarget ? rawTrimmed : normalizePosixPath(rawTrimmed);

    if (!cleaned) {
      setStatusMessage({
        type: 'error',
        text: isIt
          ? 'Inserisci un percorso POSIX valido oppure un URL / ID di Google Drive.'
          : 'Please enter a valid POSIX path or Google Drive URL / ID.',
      });
      return;
    }

    if (!isDriveTarget) {
      detectAndSaveHomePrefix(cleaned);
    }

    setIsLoading(true);
    setStatusMessage(null);
    try {
      await onExecutePosixAction(cleaned, targetAction);
      refreshMetadataState();
      onClose();
    } catch (err: any) {
      if (err?.code === 'NO_ROOT_AUTHORIZED') {
        setStatusMessage({
          type: 'info',
          text: isIt
            ? 'Percorso non ancora autorizzato: clicca su "Aggancia File Singolo ($HOME)" per selezionare direttamente il file e memorizzarne il permesso, oppure aggiungi la sua sottocartella.'
            : 'Path not yet authorized: click "Bind Single File ($HOME)" to select the file directly and remember permission, or add its subfolder.',
        });
      } else if (err?.code === 'NO_DRIVE_AUTH') {
        setStatusMessage({
          type: 'error',
          text: isIt
            ? 'Per aprire un URL o ID di Google Drive, accedi prima al tuo account Google Drive usando il pulsante "Accedi con Google Drive" qui sotto.'
            : 'To open a Google Drive URL or ID, please sign in to Google Drive first using the button below.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text:
            err?.message ||
            (isIt
              ? 'Errore durante la lettura del percorso POSIX o URL/ID Google Drive.'
              : 'Error reading POSIX path or Google Drive URL/ID.'),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isRootReady =
    mountedDirs.length > 0 ||
    boundFiles.length > 0 ||
    (config.mode === 'fs_api' && hasFsHandle) ||
    (config.mode === 'fallback' && hasFallbackFilesInMemory());

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Terminal size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2 flex-wrap">
                {isIt
                  ? 'Apri / Importa da Percorso POSIX ($HOME) o URL/ID Google Drive'
                  : 'Open / Import via POSIX Path ($HOME) or Google Drive URL/ID'}
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                  :e &bull; :r &bull; :tear &bull; :w
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                {isIt
                  ? 'Supporta file diretti in $HOME (~/file, /home/user/file), multi-cartella e URL/ID Google Drive.'
                  : 'Supports direct files in $HOME (~/file, /home/user/file), multi-folder mounts, and Google Drive URL/ID.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            title={isIt ? 'Chiudi (Esc)' : 'Close (Esc)'}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Active File POSIX or Google Drive Status Banners */}
          {activePosixPath && (
            <div className="px-3.5 py-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span className="text-zinc-300 truncate">
                  {isIt ? 'File corrente collegato a POSIX:' : 'Current file linked to POSIX:'}{' '}
                  <code className="text-emerald-300 font-mono">{activePosixPath}</code>
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 shrink-0">
                {currentFilename} (:w attivo)
              </span>
            </div>
          )}

          {activeDriveFileId && (
            <div className="px-3.5 py-2.5 rounded-lg bg-blue-950/30 border border-blue-800/50 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Cloud size={15} className="text-blue-400 shrink-0" />
                <span className="text-zinc-300 truncate">
                  {isIt ? 'File corrente collegato a Drive ID:' : 'Current file linked to Drive ID:'}{' '}
                  <code className="text-blue-300 font-mono">{activeDriveFileId}</code>
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`gdrive:${activeDriveFileId}`).catch(() => {});
                    setStatusMessage({
                      type: 'info',
                      text: isIt ? `Copiato gdrive:${activeDriveFileId}` : `Copied gdrive:${activeDriveFileId}`,
                    });
                  }}
                  className="px-2 py-0.5 rounded bg-blue-900/50 hover:bg-blue-800/60 text-blue-200 border border-blue-700/50 flex items-center gap-1 text-[11px] font-mono"
                  title={isIt ? 'Copia riferimento gdrive:ID' : 'Copy gdrive:ID reference'}
                >
                  <Copy size={11} />
                  gdrive:ID
                </button>
                <span className="text-[11px] font-mono text-blue-400">
                  :w sovrascrive Drive
                </span>
              </div>
            </div>
          )}

          {/* Section 1: POSIX Path or Drive URL/ID Input & Action */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {isIt
                  ? '1. Percorso POSIX (/home/user/file, ~/file), URL Google Drive o ID'
                  : '1. POSIX Path (/home/user/file, ~/file), Google Drive URL or ID'}
              </label>
              {posixInput.trim() && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border flex items-center gap-1.5 ${
                    isDriveInput
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                      : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {isDriveInput ? (
                    <>
                      <Cloud size={12} />
                      Drive ID: {detectedDriveId?.slice(0, 18)}
                      {(detectedDriveId?.length || 0) > 18 ? '…' : ''}
                    </>
                  ) : (
                    <>
                      <HardDrive size={12} />
                      {isIt ? 'Percorso POSIX Locale' : 'Local POSIX Path'}
                    </>
                  )}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={posixInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      executePath(posixInput, action);
                    } else if (e.key === 'Escape') {
                      onClose();
                    }
                  }}
                  placeholder={
                    isIt
                      ? '/home/user/miofile.md  o  ~/nota.txt  o  https://drive.google.com/file/d/...'
                      : '/home/user/myfile.md  or  ~/note.txt  or  https://drive.google.com/file/d/...'
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-500 rounded-lg px-3.5 py-2.5 text-zinc-100 font-mono text-xs sm:text-sm outline-none transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 flex items-center gap-1.5 text-xs font-medium shrink-0 transition-colors"
                title={isIt ? 'Incolla dagli Appunti' : 'Paste from Clipboard'}
              >
                <ClipboardPaste size={15} className="text-emerald-400" />
                <span className="hidden sm:inline">{isIt ? 'Incolla' : 'Paste'}</span>
              </button>
            </div>

            {/* Action Mode Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAction('open')}
                className={`px-3 py-2 rounded-lg border text-left transition-all flex items-center gap-2 ${
                  action === 'open'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <FileText size={15} className={action === 'open' ? 'text-emerald-400' : 'text-zinc-500'} />
                <div>
                  <div className="text-xs font-semibold">{isIt ? 'Apri Editor (:e)' : 'Open Editor (:e)'}</div>
                  <div className="text-[10px] opacity-75">
                    {isIt ? 'Sostituisce il documento attivo' : 'Replaces active document'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAction('read')}
                className={`px-3 py-2 rounded-lg border text-left transition-all flex items-center gap-2 ${
                  action === 'read'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <FilePlus2 size={15} className={action === 'read' ? 'text-blue-400' : 'text-zinc-500'} />
                <div>
                  <div className="text-xs font-semibold">{isIt ? 'Inserisci al Cursore (:r)' : 'Insert at Cursor (:r)'}</div>
                  <div className="text-[10px] opacity-75">
                    {isIt ? 'Incolla sotto la riga corrente' : 'Inserts below current line'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAction('tear')}
                className={`px-3 py-2 rounded-lg border text-left transition-all flex items-center gap-2 ${
                  action === 'tear'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <Scissors size={15} className={action === 'tear' ? 'text-amber-400' : 'text-zinc-500'} />
                <div>
                  <div className="text-xs font-semibold">{isIt ? 'Copia Appunti (:tear)' : 'Copy Clipboard (:tear)'}</div>
                  <div className="text-[10px] opacity-75">
                    {isIt ? 'Estrae testo negli appunti' : 'Copies file text to clipboard'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Status / Error Feedback */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs ${
                statusMessage.type === 'error'
                  ? 'bg-red-950/40 border-red-800/70 text-red-200'
                  : statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-200'
                  : 'bg-zinc-800/70 border-zinc-700 text-zinc-200'
              }`}
            >
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Section 2A: Google Drive Direct URL/ID Status */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <Cloud size={16} className={driveUser ? 'text-blue-400 shrink-0' : 'text-zinc-500 shrink-0'} />
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <span>{isIt ? 'Google Drive™ (URL / gdrive:ID / ID Puro)' : 'Google Drive™ (URL / gdrive:ID / Raw ID)'}</span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  {driveUser
                    ? isIt
                      ? `Connesso come ${driveUser.displayName || driveUser.email || 'Utente Google'} — :w sovrascrive direttamente su Drive`
                      : `Connected as ${driveUser.displayName || driveUser.email || 'Google User'} — :w directly overwrites on Drive`
                    : isIt
                    ? 'Accedi a Google Drive per aprire o salvare file tramite link o ID.'
                    : 'Sign in to Google Drive to open or save files via link or ID.'}
                </p>
              </div>
            </div>

            {driveUser ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/30 shrink-0">
                <ShieldCheck size={13} />
                {isIt ? 'Drive Attivo (:e / :r / :w)' : 'Drive Active (:e / :r / :w)'}
              </span>
            ) : (
              onDriveSignIn && (
                <button
                  type="button"
                  onClick={() => onDriveSignIn()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <LogIn size={13} />
                  {isIt ? 'Accedi con Google Drive' : 'Sign in with Google Drive'}
                </button>
              )
            )}
          </div>

          {/* Section 2B: Multi-Folder Virtual $HOME & Single-File Binding */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <HardDrive size={16} className={isRootReady ? 'text-emerald-400' : 'text-amber-400'} />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  {isIt
                    ? '2. Accesso POSIX $HOME: Multi-Cartella e File Singoli'
                    : '2. POSIX $HOME Access: Multi-Folder & Single Files'}
                </span>
              </div>

              {detectedHome && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck size={13} />
                  $HOME = {detectedHome} (~)
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {isIt
                ? 'Se inserisci un percorso nella $HOME (es. ~/file.txt o /home/utente/file.txt) non ancora coperto dalle cartelle montate, premendo Invio si aprirà automaticamente il selettore file prefiltrato e il permesso verrà memorizzato in modo permanente per :e e :w. Puoi anche montare più sottocartelle della $HOME contemporaneamente.'
                : 'If you enter a $HOME path not yet covered by mounted folders, pressing Enter automatically opens the pre-filtered file selector and permanently saves permission for :e and :w. You can also mount multiple $HOME subfolders simultaneously.'}
            </p>

            {/* Hidden fallback input for webkitdirectory */}
            <input
              ref={fallbackDirInputRef}
              type="file"
              {...({ webkitdirectory: '', directory: '' } as any)}
              multiple
              className="hidden"
              onChange={handleFallbackDirectorySelected}
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBindSingleFile}
                className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 rounded-lg border border-emerald-500/40 flex items-center gap-2 text-xs font-semibold transition-colors"
                title={
                  isIt
                    ? 'Seleziona e aggancia qualsiasi file singolo anche direttamente nella radice $HOME (nessuna limitazione del browser)'
                    : 'Select and bind any single file directly inside $HOME root (no browser restriction)'
                }
              >
                <FileCheck2 size={15} className="text-emerald-400" />
                {isIt
                  ? 'Aggancia File Singolo ($HOME)...'
                  : 'Bind Single File ($HOME)...'}
              </button>

              <button
                type="button"
                onClick={handleAuthorizeNativeDirectory}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg border border-zinc-700 flex items-center gap-2 text-xs font-medium transition-colors"
              >
                <FolderPlus size={15} className="text-emerald-400" />
                {isIt
                  ? '+ Aggiungi Sottocartella (Documenti, Scrivania...)'
                  : '+ Add Subfolder (Documents, Desktop...)'}
              </button>

              <button
                type="button"
                onClick={() => fallbackDirInputRef.current?.click()}
                className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 flex items-center gap-1.5 text-xs transition-colors"
                title={
                  isIt
                    ? 'Usa selezione cartella compatibile con tutti i browser mobile e iframe'
                    : 'Use universal folder indexing compatible with mobile browsers and iframes'
                }
              >
                <RefreshCw size={13} className="text-zinc-400" />
                {isIt ? 'Indicizza Cartella (Mobile)' : 'Index Folder (Mobile)'}
              </button>

              {(mountedDirs.length > 0 || boundFiles.length > 0) && (
                <button
                  type="button"
                  onClick={handleDisconnectAllRoots}
                  className="px-2.5 py-2 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg text-xs transition-colors ml-auto"
                >
                  {isIt ? 'Scollega Tutto' : 'Disconnect All'}
                </button>
              )}
            </div>

            {/* Mounted Subdirectories List */}
            {mountedDirs.length > 0 && (
              <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <FolderOpen size={12} className="text-emerald-400" />
                  {isIt
                    ? `Sottocartelle Montate (${mountedDirs.length}):`
                    : `Mounted Subfolders (${mountedDirs.length}):`}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {mountedDirs.map((dir) => (
                    <div
                      key={dir.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-200"
                    >
                      <span className="text-emerald-400 font-semibold">{dir.name}</span>
                      {dir.basePrefix && (
                        <span className="text-[10px] text-zinc-500">({dir.basePrefix})</span>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          await removeMountedDirectory(dir.id);
                          refreshMetadataState();
                        }}
                        className="text-zinc-500 hover:text-red-400 ml-1"
                        title={isIt ? 'Rimuovi cartella' : 'Remove folder'}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bound Single Files in $HOME List */}
            {boundFiles.length > 0 && (
              <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <FileCheck2 size={12} className="text-emerald-400" />
                  {isIt
                    ? `File Singoli Agganciati in $HOME / Disco (${boundFiles.length}):`
                    : `Bound Single Files in $HOME / Disk (${boundFiles.length}):`}
                </div>
                <div className="max-h-28 overflow-y-auto divide-y divide-zinc-800/50 border border-zinc-800 rounded-lg bg-zinc-900/50">
                  {boundFiles.map((bf) => (
                    <div
                      key={bf.posixPath}
                      className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs hover:bg-zinc-900"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setPosixInput(bf.posixPath);
                          executePath(bf.posixPath, action);
                        }}
                        className="flex-1 text-left font-mono text-emerald-300 hover:underline truncate"
                      >
                        {bf.posixPath}
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {bf.canWriteDisk && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            :w
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            await removeBoundPosixFile(bf.posixPath);
                            refreshMetadataState();
                          }}
                          className="p-0.5 text-zinc-500 hover:text-red-400"
                          title={isIt ? 'Rimuovi permesso file' : 'Remove file permission'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detected $HOME Prefix Display/Override */}
            <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-[11px] text-zinc-400 shrink-0">
                {isIt ? 'Percorso $HOME rilevato automaticamente (~):' : 'Auto-detected $HOME path (~):'}
              </label>
              <div className="flex gap-1.5 flex-1">
                <input
                  type="text"
                  value={detectedHome}
                  onChange={(e) => {
                    setDetectedHome(e.target.value);
                    setDetectedHomePrefix(e.target.value);
                  }}
                  placeholder="/home/user"
                  className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded px-2.5 py-1 text-xs font-mono text-zinc-200 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3A: Recent Google Drive URLs / IDs */}
          {recentDriveRefs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Cloud size={13} />
                  {isIt ? 'File Google Drive Recenti (URL / ID)' : 'Recent Google Drive Files (URL / ID)'}
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto divide-y divide-zinc-800/60 border border-zinc-800 rounded-lg bg-zinc-950/50">
                {recentDriveRefs.map((item) => (
                  <div
                    key={item.fileId}
                    className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-zinc-900/80 transition-colors group"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setPosixInput(`gdrive:${item.fileId}`);
                        executePath(`gdrive:${item.fileId}`, action);
                      }}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="font-mono text-xs text-blue-400 truncate group-hover:underline">
                        {item.filename}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono truncate">
                        gdrive:{item.fileId}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => executePath(`gdrive:${item.fileId}`, 'open')}
                        className="px-2 py-1 text-[11px] font-mono bg-zinc-800 hover:bg-emerald-600 text-zinc-200 hover:text-white rounded transition-colors"
                        title={isIt ? 'Apri (:e)' : 'Open (:e)'}
                      >
                        :e
                      </button>
                      <button
                        type="button"
                        onClick={() => executePath(`gdrive:${item.fileId}`, 'read')}
                        className="px-2 py-1 text-[11px] font-mono bg-zinc-800 hover:bg-blue-600 text-zinc-200 hover:text-white rounded transition-colors"
                        title={isIt ? 'Inserisci al cursore (:r)' : 'Insert at cursor (:r)'}
                      >
                        :r
                      </button>
                      <button
                        type="button"
                        onClick={() => executePath(`gdrive:${item.fileId}`, 'tear')}
                        className="px-2 py-1 text-[11px] font-mono bg-zinc-800 hover:bg-amber-600 text-zinc-200 hover:text-white rounded transition-colors"
                        title={isIt ? 'Copia negli appunti (:tear)' : 'Copy to clipboard (:tear)'}
                      >
                        :tear
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeRecentDriveRef(item.fileId);
                          setRecentDriveRefs(getRecentDriveRefs());
                        }}
                        className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors"
                        title={isIt ? 'Rimuovi dalla cronologia' : 'Remove from history'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3B: Recent POSIX Paths */}
          {recentPaths.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Clock size={13} />
                  {isIt ? 'Percorsi POSIX Recenti' : 'Recent POSIX Paths'}
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-zinc-800/60 border border-zinc-800 rounded-lg bg-zinc-950/50">
                {recentPaths.map((item) => (
                  <div
                    key={item.posixPath}
                    className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-zinc-900/80 transition-colors group"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setPosixInput(item.posixPath);
                        executePath(item.posixPath, action);
                      }}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="font-mono text-xs text-emerald-400 truncate group-hover:underline">
                        {item.posixPath}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate">
                        {item.filename}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => executePath(item.posixPath, 'open')}
                        className="px-2 py-1 text-[11px] font-mono bg-zinc-800 hover:bg-emerald-600 text-zinc-200 hover:text-white rounded transition-colors"
                        title={isIt ? 'Apri (:e)' : 'Open (:e)'}
                      >
                        :e
                      </button>
                      <button
                        type="button"
                        onClick={() => executePath(item.posixPath, 'read')}
                        className="px-2 py-1 text-[11px] font-mono bg-zinc-800 hover:bg-blue-600 text-zinc-200 hover:text-white rounded transition-colors"
                        title={isIt ? 'Inserisci al cursore (:r)' : 'Insert at cursor (:r)'}
                      >
                        :r
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeRecentPosixPath(item.posixPath);
                          setRecentPaths(getRecentPosixPaths());
                        }}
                        className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors"
                        title={isIt ? 'Rimuovi dalla cronologia' : 'Remove from history'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-500 font-mono hidden sm:block">
            {isIt
              ? 'Vim: :e ~/file  o  :e /home/user/file  o  :e gdrive:<ID>'
              : 'Vim: :e ~/file  or  :e /home/user/file  or  :e gdrive:<ID>'}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
            >
              {isIt ? 'Annulla' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={isLoading || !posixInput.trim()}
              onClick={() => executePath(posixInput, action)}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-950/50"
            >
              {isDriveInput ? <Cloud size={14} /> : <Terminal size={14} />}
              {action === 'open'
                ? isIt
                  ? isDriveInput
                    ? 'Apri da Drive (:e)'
                    : 'Apri Percorso (:e)'
                  : isDriveInput
                  ? 'Open from Drive (:e)'
                  : 'Open Path (:e)'
                : action === 'read'
                ? isIt
                  ? 'Inserisci al Cursore (:r)'
                  : 'Insert at Cursor (:r)'
                : isIt
                ? 'Copia negli Appunti (:tear)'
                : 'Copy to Clipboard (:tear)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
