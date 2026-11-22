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
  getSavedRootDirHandle,
  warmUpPosixHandlesCache,
  isRunningInCrossOriginIframe,
  addMountedDirectoryHandle,
  getMountedDirectoriesMeta,
  getMountedDirectoryPermissionState,
  reauthorizeMountedDirectory,
  removeMountedDirectory,
  getBoundPosixFilesMeta,
  removeBoundPosixFile,
  promptAndBindSinglePosixFile,
  resolveBestStartInSync,
  getPosixPathCoverageInfo,
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
  const [needsUniversalFolderUnlock, setNeedsUniversalFolderUnlock] = useState(false);
  const [reauthMount, setReauthMount] = useState<{ id: string; name: string } | null>(null);
  const [staleFallbackMount, setStaleFallbackMount] = useState<{ id: string; name: string } | null>(null);
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
        if (!isDriveReferenceLike(initialPath)) {
          detectAndSaveHomePrefix(initialPath);
        }
      }
      setStatusMessage(null);
      setNeedsUniversalFolderUnlock(false);
      setReauthMount(null);
      setStaleFallbackMount(null);
      setAction(initialAction);

      warmUpPosixHandlesCache().then(() => {
        refreshMetadataState();
        if (initialPath && !isDriveReferenceLike(initialPath)) {
          const cov = getPosixPathCoverageInfo(initialPath.trim());
          if (
            cov.coveredByMount &&
            cov.coveredByMount.mode === 'fs_api' &&
            getMountedDirectoryPermissionState(cov.coveredByMount.id) === 'prompt'
          ) {
            setReauthMount({ id: cov.coveredByMount.id, name: cov.coveredByMount.name });
            setStatusMessage({
              type: 'info',
              text:
                lang === 'it'
                  ? `La cartella "${cov.coveredByMount.name}" è già montata: clicca qui sotto per riattivare l'accesso in 1 clic (senza aprire il file browser) e aprire subito il file.`
                  : `Folder "${cov.coveredByMount.name}" is already mounted: click below to re-enable access in 1 click (no file browser) and open the file immediately.`,
            });
          } else if (cov.coveredByMount && cov.coveredByMount.mode === 'fallback') {
            setStaleFallbackMount({ id: cov.coveredByMount.id, name: cov.coveredByMount.name });
            setStatusMessage({
              type: 'info',
              text:
                lang === 'it'
                  ? `La cartella "${cov.coveredByMount.name}" è attualmente montata come snapshot statico e non include questo file. Clicca qui sotto per montarla in modalità Live (o aggiornare lo snapshot) e accedere subito a tutti i file presenti.`
                  : `Folder "${cov.coveredByMount.name}" is currently mounted as a static snapshot and does not include this file. Click below to mount it Live (or refresh the snapshot) to access all existing and new files.`,
            });
          }
        }
        getSavedRootDirHandle().then((handle) => {
          setHasFsHandle(Boolean(handle));
        });
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

  const coverageInfo =
    posixInput.trim() && !isDriveInput ? getPosixPathCoverageInfo(posixInput.trim()) : null;

  const handleInputChange = (val: string) => {
    setPosixInput(val);
    setNeedsUniversalFolderUnlock(false);
    setReauthMount(null);
    setStaleFallbackMount(null);
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
    setNeedsUniversalFolderUnlock(false);
    setReauthMount(null);
    setStaleFallbackMount(null);
    const win = window as any;
    const targetForInference = !isDriveInput && posixInput.trim() ? posixInput.trim() : undefined;

    // 1. For $HOME/Scaricati (Downloads), Chromium blocks showDirectoryPicker.
    // Use showOpenFilePicker({ startIn: 'downloads', multiple: true }) when available.
    if (
      !isRunningInCrossOriginIframe() &&
      coverageInfo &&
      !coverageInfo.classification.isDirectHomeRootFile &&
      coverageInfo.classification.isSystemBlockedDirectoryMount &&
      typeof win.showOpenFilePicker === 'function'
    ) {
      await handleBindMultipleHomeFiles();
      return;
    }

    if (typeof win.showDirectoryPicker === 'function') {
      try {
        const startIn = resolveBestStartInSync(targetForInference || detectedHome || '~');
        let dirHandle: any = null;
        try {
          dirHandle = await win.showDirectoryPicker({
            mode: 'read',
            startIn,
          });
        } catch (innerErr: any) {
          if (innerErr?.name === 'AbortError') return;
          if (innerErr instanceof TypeError) {
            dirHandle = await win.showDirectoryPicker({
              mode: 'read',
              startIn: 'documents',
            });
          } else {
            throw innerErr;
          }
        }

        if (!dirHandle) return;

        const meta = await addMountedDirectoryHandle(dirHandle, undefined, targetForInference);
        refreshMetadataState();
        setHasFsHandle(true);
        setStatusMessage({
          type: 'success',
          text: isIt
            ? `Cartella "${meta.name}" (${meta.basePrefix || meta.name}) montata Live! Tutti i file al suo interno sono ora sbloccati per :e, :r, :tear e :w.`
            : `Folder "${meta.name}" (${meta.basePrefix || meta.name}) mounted Live! All files inside are now unlocked for :e, :r, :tear, and :w.`,
        });

        if (targetForInference) {
          await executePath(targetForInference, action);
        }
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        const isIframeBlocked =
          isRunningInCrossOriginIframe() ||
          err?.name === 'SecurityError' ||
          String(err?.message || '').toLowerCase().includes('cross origin');
        if (isIframeBlocked) {
          setStatusMessage({
            type: 'error',
            text: isIt
              ? 'Chrome blocca l\'accesso live alle cartelle locali dentro un iframe embedded. Apri LiViA in una scheda autonoma (o come app PWA installata) per usare :e direttamente su cartelle locali.'
              : 'Chrome blocks live local folder access inside an embedded iframe. Open LiViA in a standalone tab (or installed PWA) to use :e directly on local folders.',
          });
          return;
        }
        setNeedsUniversalFolderUnlock(true);
        setStatusMessage({
          type: 'info',
          text: isIt
            ? 'Chromium limita il montaggio diretto su questa cartella di sistema (es. $HOME/Scaricati): usa il pulsante "Seleziona File" qui sotto per agganciare i file direttamente.'
            : 'Chromium restricts direct folder mounting on this system folder (e.g. $HOME/Downloads): use "Select Files" below to bind files directly.',
        });
      }
    } else {
      setStatusMessage({
        type: 'error',
        text: isIt
          ? 'Questo browser non supporta l\'accesso live alle cartelle (showDirectoryPicker). Usa Chrome/Edge in una scheda autonoma.'
          : 'This browser does not support live folder access (showDirectoryPicker). Use Chrome/Edge in a standalone tab.',
      });
    }
  };

  const handleReauthorizeMount = async (mountId: string, retryCurrentPath = false) => {
    setStatusMessage(null);
    setIsLoading(true);
    try {
      const granted = await reauthorizeMountedDirectory(mountId);
      refreshMetadataState();
      if (granted) {
        setReauthMount(null);
        setStatusMessage({
          type: 'success',
          text: isIt
            ? 'Permesso cartella riattivato istantaneamente!'
            : 'Folder permission reauthorized instantly!',
        });
        if (retryCurrentPath && posixInput.trim()) {
          await executePath(posixInput, action);
        }
      } else {
        setStatusMessage({
          type: 'error',
          text: isIt
            ? 'Permesso non concesso dal browser. Riprova o rimonta la cartella.'
            : 'Permission not granted by the browser. Try again or remount the folder.',
        });
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setStatusMessage({
          type: 'error',
          text: err?.message || (isIt ? 'Impossibile riattivare il permesso.' : 'Could not reauthorize permission.'),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBindMultipleHomeFiles = async () => {
    setStatusMessage(null);
    setNeedsUniversalFolderUnlock(false);
    setIsLoading(true);
    try {
      const targetPath = !isDriveInput && posixInput.trim() ? normalizePosixPath(posixInput.trim()) : undefined;
      const resolved = await promptAndBindSinglePosixFile(targetPath, { multiple: true });
      refreshMetadataState();
      setPosixInput(resolved.posixPath);
      await onExecutePosixAction(resolved.posixPath, action);
      onClose();
    } catch (err: any) {
      if (err?.name === 'AbortError' || String(err?.message || '').includes('annullat')) {
        return;
      }
      setStatusMessage({
        type: 'error',
        text:
          err?.message ||
          (isIt
            ? 'Impossibile agganciare i file selezionati.'
            : 'Could not bind the selected files.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFallbackDirectorySelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setNeedsUniversalFolderUnlock(false);
    const targetForInference = !isDriveInput && posixInput.trim() ? posixInput.trim() : undefined;
    const updated = registerFallbackDirectoryFiles(files, undefined, targetForInference);
    refreshMetadataState();
    setStatusMessage({
      type: 'success',
      text: isIt
        ? `Cartella "${updated.rootName}" (${updated.basePrefix || updated.rootName}) montata e salvata in IndexedDB (${updated.indexedFileCount} file sbloccati)!`
        : `Folder "${updated.rootName}" (${updated.basePrefix || updated.rootName}) mounted and saved in IndexedDB (${updated.indexedFileCount} files unlocked)!`,
    });
    e.target.value = '';

    if (targetForInference) {
      await executePath(targetForInference, action);
    }
  };

  const handleDisconnectAllRoots = async () => {
    await clearPosixRootAuthorization();
    refreshMetadataState();
    setHasFsHandle(false);
    setNeedsUniversalFolderUnlock(false);
    setStatusMessage({
      type: 'info',
      text: isIt ? 'Tutte le cartelle e i file autorizzati sono stati scollegati.' : 'All authorized folders and files disconnected.',
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
    setNeedsUniversalFolderUnlock(false);
    setReauthMount(null);
    setStaleFallbackMount(null);
    try {
      await onExecutePosixAction(cleaned, targetAction);
      refreshMetadataState();
      onClose();
    } catch (err: any) {
      if (err?.name === 'AbortError' || String(err?.message || '').includes('annullat')) {
        setStatusMessage({
          type: 'info',
          text: isIt
            ? 'Selezione cartella o file annullata.'
            : 'Folder or file selection cancelled.',
        });
      } else if (err?.code === 'PERMISSION_REAUTH_NEEDED' && err?.mountId) {
        setReauthMount({ id: err.mountId, name: err.mountName || 'cartella' });
        setStatusMessage({
          type: 'info',
          text: isIt
            ? `La cartella "${err.mountName || ''}" è già montata, ma dopo il ricaricamento della pagina Chrome richiede 1 clic di conferma (senza aprire il file browser).`
            : `Folder "${err.mountName || ''}" is already mounted, but after page reload Chrome requires 1 click to re-enable access (no file browser opened).`,
        });
      } else if (err?.code === 'FALLBACK_STALE_OR_MISSING' && err?.mountId) {
        setStaleFallbackMount({ id: err.mountId, name: err.mountName || 'cartella' });
        setStatusMessage({
          type: 'info',
          text: isIt
            ? `La cartella "${err.mountName || ''}" era montata come snapshot statico e non include ancora questo file. Montala in modalità Live per aprire subito qualsiasi file al suo interno (inclusi nuovi file e :w).`
            : `Folder "${err.mountName || ''}" was mounted as a static snapshot and does not include this file yet. Mount it Live to open any existing or new file inside it (with :w).`,
        });
      } else if (
        err?.code === 'DIRECTORY_PICKER_BLOCKED' ||
        err?.code === 'NO_ROOT_AUTHORIZED' ||
        err?.name === 'SecurityError' ||
        err?.name === 'NotAllowedError'
      ) {
        const cov = getPosixPathCoverageInfo(cleaned);
        if (!cov.classification.isDirectHomeRootFile) {
          setNeedsUniversalFolderUnlock(true);
        }
        setStatusMessage({
          type: 'info',
          text: cov.classification.isDirectHomeRootFile
            ? isIt
              ? 'Questo file si trova direttamente nella radice $HOME: clicca su "Seleziona File in $HOME (Multiplo)" qui sotto per sbloccarlo.'
              : 'This file is directly in $HOME root: click "Select Files in $HOME (Multiple)" below to unlock it.'
            : isIt
            ? `Per sbloccare i file in "${cov.classification.parentDirName}", scegli qui sotto: selezione file diretta (apre direttamente la cartella senza "Recenti", con :w) oppure montaggio completo (indicizza solo file testo/codice).`
            : `To unlock files in "${cov.classification.parentDirName}", choose below: direct multi-file selection (opens the folder directly without "Recent", with :w) or full folder mount (indexes text/code files only).`,
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
                  ? 'Monta la cartella madre (inclusa $HOME/Scaricati) per sbloccare tutti i suoi file, o usa selezione multipla in $HOME.'
                  : 'Mounts parent folder (including $HOME/Downloads) to unlock all its files, or uses multi-select in $HOME.'}
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
                  ? '1. Percorso POSIX (/home/user/Scaricati/file, ~/file), URL Google Drive o ID'
                  : '1. POSIX Path (/home/user/Downloads/file, ~/file), Google Drive URL or ID'}
              </label>
              {posixInput.trim() && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border flex items-center gap-1.5 ${
                    isDriveInput
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                      : coverageInfo?.isCovered
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  }`}
                >
                  {isDriveInput ? (
                    <>
                      <Cloud size={12} />
                      Drive ID: {detectedDriveId?.slice(0, 18)}
                      {(detectedDriveId?.length || 0) > 18 ? '…' : ''}
                    </>
                  ) : coverageInfo?.isCovered ? (
                    <>
                      <CheckCircle2 size={12} />
                      {coverageInfo.coveredByMount
                        ? isIt
                          ? `Coperto da cartella "${coverageInfo.coveredByMount.name}" (Istantaneo)`
                          : `Covered by folder "${coverageInfo.coveredByMount.name}" (Instant)`
                        : isIt
                        ? 'File già autorizzato in $HOME (Istantaneo)'
                        : 'File already authorized in $HOME (Instant)'}
                    </>
                  ) : coverageInfo?.classification.isDirectHomeRootFile ? (
                    <>
                      <FileCheck2 size={12} />
                      {isIt
                        ? 'File in radice $HOME (Selettore Multiplo)'
                        : 'File in $HOME root (Multi-File Selector)'}
                    </>
                  ) : (
                    <>
                      <FolderPlus size={12} />
                      {isIt
                        ? `Monterà cartella madre "${coverageInfo?.classification.parentDirName}"`
                        : `Will mount parent folder "${coverageInfo?.classification.parentDirName}"`}
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
                      ? '/home/user/Scaricati/miofile.md  o  ~/nota.txt  o  https://drive.google.com/file/d/...'
                      : '/home/user/Downloads/myfile.md  or  ~/note.txt  or  https://drive.google.com/file/d/...'
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

          {/* Status / Error Feedback + 1-Click Universal Folder Unlock when Scaricati/System folder is selected */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-lg border flex flex-col gap-2.5 text-xs ${
                statusMessage.type === 'error'
                  ? 'bg-red-950/40 border-red-800/70 text-red-200'
                  : statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-200'
                  : 'bg-emerald-950/30 border-emerald-700/60 text-zinc-100'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-emerald-400" />
                <span>{statusMessage.text}</span>
              </div>
              {reauthMount && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleReauthorizeMount(reauthMount.id, true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-colors cursor-pointer"
                  >
                    <ShieldCheck size={15} />
                    {isIt
                      ? `Riattiva accesso a "${reauthMount.name}" (1 clic, senza file browser)`
                      : `Re-enable access to "${reauthMount.name}" (1 click, no file browser)`}
                  </button>
                </div>
              )}
              {staleFallbackMount && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAuthorizeNativeDirectory}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-colors cursor-pointer"
                  >
                    <FolderPlus size={15} />
                    {isIt
                      ? `Monta "${staleFallbackMount.name}" in modalità Live (tutti i file + :w)`
                      : `Mount "${staleFallbackMount.name}" Live (all files + :w)`}
                  </button>
                  <button
                    type="button"
                    onClick={() => fallbackDirInputRef.current?.click()}
                    className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={14} />
                    {isIt ? 'Aggiorna Snapshot' : 'Refresh Snapshot'}
                  </button>
                </div>
              )}
              {needsUniversalFolderUnlock && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleBindMultipleHomeFiles}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-colors cursor-pointer"
                  >
                    <FileCheck2 size={15} />
                    {coverageInfo && !coverageInfo.classification.isDirectHomeRootFile
                      ? isIt
                        ? `Seleziona File in "${coverageInfo.classification.parentDirName}" (Apre la cartella, :w attivo)`
                        : `Select Files in "${coverageInfo.classification.parentDirName}" (Opens folder directly, :w active)`
                      : isIt
                      ? 'Seleziona File in Scaricati / $HOME (Apre cartella, :w attivo)'
                      : 'Select Files in Downloads / $HOME (Opens folder directly, :w active)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => fallbackDirInputRef.current?.click()}
                    className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FolderPlus size={14} />
                    {isIt
                      ? 'Monta Intera Cartella (Solo file testo/codice)'
                      : 'Mount Whole Folder (Text/code files only)'}
                  </button>
                </div>
              )}
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

          {/* Section 2B: Multi-Folder Virtual $HOME & Multi-File Binding */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <HardDrive size={16} className={isRootReady ? 'text-emerald-400' : 'text-amber-400'} />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  {isIt
                    ? '2. Cartelle Madri Montate & File in Radice $HOME'
                    : '2. Mounted Parent Folders & $HOME Root Files'}
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
                ? 'Quando apri un file dentro una sottocartella (inclusa $HOME/Scaricati), LiViA monta la sua cartella madre sbloccando tutti gli altri file al suo interno. Per montare direttamente $HOME/Scaricati o cartelle di sistema senza limitazioni del browser, puoi anche cliccare su "Monta Cartella ($HOME/Scaricati & Universale)".'
                : 'When you open a file inside a subfolder (including $HOME/Downloads), LiViA mounts its parent folder unlocking all other files inside it. To directly mount $HOME/Downloads or system folders without browser restrictions, you can also click "Mount Folder ($HOME/Downloads & Universal)".'}
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
                className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 rounded-lg border border-emerald-500/40 flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer"
                title={
                  isIt
                    ? 'Monta una cartella madre (es. Documenti, Progetti, Scaricati o qualsiasi sottocartella) sbloccando tutti i file al suo interno'
                    : 'Mount a parent folder (e.g. Documents, Projects, Downloads, or any subfolder) unlocking all files inside it'
                }
              >
                <FolderPlus size={15} className="text-emerald-400" />
                {coverageInfo && !coverageInfo.isCovered && !coverageInfo.classification.isDirectHomeRootFile
                  ? isIt
                    ? `+ Monta Cartella Madre (${coverageInfo.classification.parentDirName})`
                    : `+ Mount Parent Folder (${coverageInfo.classification.parentDirName})`
                  : isIt
                  ? '+ Monta Cartella Madre / Sottocartella...'
                  : '+ Mount Parent Folder / Subfolder...'}
              </button>

              <button
                type="button"
                onClick={() => fallbackDirInputRef.current?.click()}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-emerald-300 rounded-lg border border-emerald-500/30 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
                title={
                  isIt
                    ? 'Sblocca e monta qualsiasi cartella (inclusa $HOME/Scaricati e cartelle con permessi di sola lettura) salvandola in IndexedDB'
                    : 'Unlock and mount any folder (including $HOME/Downloads and read-only folders) saving it in IndexedDB'
                }
              >
                <RefreshCw size={13} className="text-emerald-400" />
                {isIt ? 'Monta $HOME/Scaricati / Universale' : 'Mount $HOME/Downloads / Universal'}
              </button>

              <button
                type="button"
                onClick={handleBindMultipleHomeFiles}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg border border-zinc-700 flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer"
                title={
                  isIt
                    ? 'Seleziona uno o più file contemporaneamente (Ctrl/Shift) direttamente nella radice di $HOME'
                    : 'Select one or multiple files at once (Ctrl/Shift) directly inside $HOME root'
                }
              >
                <FileCheck2 size={15} className="text-emerald-400" />
                {isIt
                  ? 'Seleziona File in $HOME (Multiplo)...'
                  : 'Select Files in $HOME (Multiple)...'}
              </button>

              {(mountedDirs.length > 0 || boundFiles.length > 0) && (
                <button
                  type="button"
                  onClick={handleDisconnectAllRoots}
                  className="px-2.5 py-2 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg text-xs transition-colors ml-auto cursor-pointer"
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
                    ? `Cartelle Madri Montate (${mountedDirs.length}) — Tutti i file interni sono sbloccati:`
                    : `Mounted Parent Folders (${mountedDirs.length}) — All internal files unlocked:`}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {mountedDirs.map((dir) => {
                    const needsReauth = dir.mode === 'fs_api' && getMountedDirectoryPermissionState(dir.id) === 'prompt';
                    const isSnapshot = dir.mode === 'fallback';
                    return (
                      <div
                        key={dir.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-200"
                      >
                        <span className="text-emerald-400 font-semibold">{dir.name}</span>
                        {dir.basePrefix && (
                          <span className="text-[10px] text-zinc-400">({dir.basePrefix})</span>
                        )}
                        <span
                          className={`text-[9px] font-sans px-1.5 py-0.5 rounded border ${
                            isSnapshot
                              ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {isSnapshot ? 'Snapshot' : 'Live'}
                        </span>
                        {needsReauth && (
                          <button
                            type="button"
                            onClick={() => handleReauthorizeMount(dir.id, false)}
                            className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-sans font-semibold cursor-pointer"
                            title={isIt ? 'Riattiva permesso con 1 clic (senza aprire il file browser)' : 'Re-enable permission with 1 click (no file browser)'}
                          >
                            {isIt ? 'Riattiva' : 'Re-enable'}
                          </button>
                        )}
                        {isSnapshot && (
                          <button
                            type="button"
                            onClick={handleAuthorizeNativeDirectory}
                            className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-[10px] font-sans font-semibold cursor-pointer"
                            title={isIt ? 'Aggiorna a montaggio Live per vedere tutti i file nuovi' : 'Upgrade to Live mount to see all new files'}
                          >
                            {isIt ? 'Aggiorna Live' : 'Upgrade Live'}
                          </button>
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
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bound Single/Multi Files in $HOME List */}
            {boundFiles.length > 0 && (
              <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <FileCheck2 size={12} className="text-emerald-400" />
                  {isIt
                    ? `File Agganciati in $HOME / Disco (${boundFiles.length}):`
                    : `Bound Files in $HOME / Disk (${boundFiles.length}):`}
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
              ? 'Vim: :e ~/Scaricati/file  o  :e /home/user/file  o  :e gdrive:<ID>'
              : 'Vim: :e ~/Downloads/file  or  :e /home/user/file  or  :e gdrive:<ID>'}
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              {isDriveInput ? <Cloud size={14} /> : <Terminal size={14} />}
              {action === 'open'
                ? isIt
                  ? isDriveInput
                    ? 'Apri da Drive (:e)'
                    : coverageInfo && !coverageInfo.isCovered && !coverageInfo.classification.isDirectHomeRootFile
                    ? `Monta "${coverageInfo.classification.parentDirName}" e Apri (:e)`
                    : 'Apri Percorso (:e)'
                  : isDriveInput
                  ? 'Open from Drive (:e)'
                  : coverageInfo && !coverageInfo.isCovered && !coverageInfo.classification.isDirectHomeRootFile
                  ? `Mount "${coverageInfo.classification.parentDirName}" & Open (:e)`
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
