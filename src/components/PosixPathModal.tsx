import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
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
  saveRootDirHandle,
  clearPosixRootAuthorization,
  registerFallbackDirectoryFiles,
  hasFallbackFilesInMemory,
  getRecentPosixPaths,
  removeRecentPosixPath,
  normalizePosixPath,
  PosixRootConfig,
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
  const [basePrefixInput, setBasePrefixInput] = useState(() => getPosixRootConfig().basePrefix);
  const [hasFsHandle, setHasFsHandle] = useState(false);
  const [recentPaths, setRecentPaths] = useState<RecentPosixEntry[]>([]);
  const [recentDriveRefs, setRecentDriveRefs] = useState<RecentDriveEntry[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fallbackDirInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const currentCfg = getPosixRootConfig();
      setConfig(currentCfg);
      setBasePrefixInput(currentCfg.basePrefix || '');
      setRecentPaths(getRecentPosixPaths());
      setRecentDriveRefs(getRecentDriveRefs());
      setStatusMessage(null);
      if (initialPath) {
        setPosixInput(initialPath);
      }
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

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPosixInput(text.trim());
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
        await saveRootDirHandle(dirHandle);
        const updatedConfig: PosixRootConfig = {
          rootName: dirHandle.name,
          basePrefix: basePrefixInput.trim(),
          mode: 'fs_api',
        };
        savePosixRootConfig(updatedConfig);
        setConfig(updatedConfig);
        setHasFsHandle(true);
        setStatusMessage({
          type: 'success',
          text: isIt
            ? `Cartella radice "${dirHandle.name}" autorizzata con successo (Lettura + Scrittura :w diretta).`
            : `Root folder "${dirHandle.name}" authorized (Read + Direct :w Write).`,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        fallbackDirInputRef.current?.click();
      }
    } else {
      fallbackDirInputRef.current?.click();
    }
  };

  const handleFallbackDirectorySelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const updated = registerFallbackDirectoryFiles(files, basePrefixInput.trim());
    setConfig(updated);
    setHasFsHandle(false);
    setStatusMessage({
      type: 'success',
      text: isIt
        ? `Cartella "${updated.rootName}" indicizzata (${updated.indexedFileCount} file pronti per apertura POSIX).`
        : `Folder "${updated.rootName}" indexed (${updated.indexedFileCount} files ready for POSIX open).`,
    });
    e.target.value = '';
  };

  const handleSaveBasePrefix = () => {
    const updated: PosixRootConfig = {
      ...config,
      basePrefix: basePrefixInput.trim(),
    };
    savePosixRootConfig(updated);
    setConfig(updated);
    setStatusMessage({
      type: 'info',
      text: isIt ? 'Prefisso POSIX base aggiornato.' : 'Base POSIX prefix updated.',
    });
  };

  const handleDisconnectRoot = async () => {
    await clearPosixRootAuthorization();
    setConfig({ rootName: '', basePrefix: '', mode: 'none' });
    setBasePrefixInput('');
    setHasFsHandle(false);
    setStatusMessage({
      type: 'info',
      text: isIt ? 'Autorizzazione cartella radice rimossa.' : 'Root folder authorization cleared.',
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

    if (!isDriveTarget && basePrefixInput.trim() !== config.basePrefix) {
      const updated = { ...config, basePrefix: basePrefixInput.trim() };
      savePosixRootConfig(updated);
      setConfig(updated);
    }

    setIsLoading(true);
    setStatusMessage(null);
    try {
      await onExecutePosixAction(cleaned, targetAction);
      setRecentPaths(getRecentPosixPaths());
      setRecentDriveRefs(getRecentDriveRefs());
      onClose();
    } catch (err: any) {
      if (err?.code === 'NO_ROOT_AUTHORIZED') {
        setStatusMessage({
          type: 'error',
          text: isIt
            ? 'Prima di aprire un percorso POSIX locale, autorizza la tua cartella di lavoro (es. Documenti, Progetti o Home) usando il pulsante "Autorizza Cartella Radice" qui sotto.'
            : 'Before opening a local POSIX path, please authorize your root folder using the "Authorize Root Folder" button below.',
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
                  ? 'Apri / Importa da Percorso POSIX o URL/ID Google Drive'
                  : 'Open / Import via POSIX Path or Google Drive URL/ID'}
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                  :e &bull; :r &bull; :tear &bull; :w
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                {isIt
                  ? 'Incolla un percorso POSIX locale (/path/file) oppure un URL, gdrive:<ID> o File ID di Google Drive / Docs.'
                  : 'Paste a local POSIX path (/path/file) or a Google Drive / Docs URL, gdrive:<ID>, or File ID.'}
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
                  ? '1. Percorso POSIX, URL Google Drive/Docs o File ID'
                  : '1. POSIX Path, Google Drive/Docs URL or File ID'}
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
                  onChange={(e) => setPosixInput(e.target.value)}
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
                      ? '/home/user/file.js  oppure  https://drive.google.com/file/d/...  o  gdrive:1BxiMVs...'
                      : '/home/user/file.js  or  https://drive.google.com/file/d/...  or  gdrive:1BxiMVs...'
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

          {/* Section 2B: Root Directory Authorization (One-Time Setup) */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <HardDrive size={16} className={isRootReady ? 'text-emerald-400' : 'text-amber-400'} />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  {isIt ? '2. Cartella Radice Locale Autorizzata (POSIX)' : '2. Authorized Local Root Folder (POSIX)'}
                </span>
              </div>

              {isRootReady ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck size={13} />
                  {config.mode === 'fs_api'
                    ? isIt
                      ? `Attiva: "${config.rootName}" (Lettura/Scrittura :w)`
                      : `Active: "${config.rootName}" (Read/Write :w)`
                    : isIt
                    ? `Attiva: "${config.rootName}" (${config.indexedFileCount || 0} file indicizzati)`
                    : `Active: "${config.rootName}" (${config.indexedFileCount || 0} indexed files)`}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {isIt ? 'Nessuna cartella radice collegata' : 'No root folder linked'}
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {isIt
                ? 'Per i percorsi POSIX locali, autorizza una sola volta la tua cartella radice (es. la tua home, Documenti o workspace). Da quel momento potrai aprire qualsiasi file locale con :e /percorso/file.ext.'
                : 'For local POSIX paths, authorize your root workspace folder once. After that, you can open any local file instantly with :e /path/to/file.ext.'}
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
                onClick={handleAuthorizeNativeDirectory}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg border border-zinc-700 flex items-center gap-2 text-xs font-medium transition-colors"
              >
                <FolderOpen size={15} className="text-emerald-400" />
                {isRootReady
                  ? isIt
                    ? 'Cambia / Riautorizza Cartella Radice'
                    : 'Change / Re-authorize Root Folder'
                  : isIt
                  ? 'Autorizza Cartella Radice...'
                  : 'Authorize Root Folder...'}
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
                {isIt ? 'Indicizza Cartella (Fallback Mobile/iFrame)' : 'Index Folder (Mobile/iFrame Fallback)'}
              </button>

              {isRootReady && (
                <button
                  type="button"
                  onClick={handleDisconnectRoot}
                  className="px-2.5 py-2 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg text-xs transition-colors ml-auto"
                >
                  {isIt ? 'Scollega' : 'Disconnect'}
                </button>
              )}
            </div>

            {/* Optional Base POSIX Prefix mapping */}
            <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-[11px] text-zinc-400 shrink-0">
                {isIt ? 'Prefisso POSIX della Cartella Radice (opzionale):' : 'Root Folder POSIX Prefix (optional):'}
              </label>
              <div className="flex gap-1.5 flex-1">
                <input
                  type="text"
                  value={basePrefixInput}
                  onChange={(e) => setBasePrefixInput(e.target.value)}
                  onBlur={handleSaveBasePrefix}
                  placeholder={
                    config.rootName
                      ? `/home/user/${config.rootName}  o  /storage/emulated/0/${config.rootName}`
                      : '/home/user/workspace'
                  }
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
              ? 'Vim: :e /path/file  oppure  :e gdrive:<ID>  oppure  :e <URL_Drive>'
              : 'Vim: :e /path/file  or  :e gdrive:<ID>  or  :e <Drive_URL>'}
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

