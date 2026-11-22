import mammoth from 'mammoth';
import { convertGoogleDocsHtmlToMarkdown, sanitizeText } from './googleDocsHelper';
import { createDocxBlob } from './docxExport';
import { FileFormat } from '../types';

export interface PosixRootConfig {
  rootName: string;
  basePrefix: string; // e.g., "/home/user/projects/myrepo" or "~/Documents"
  mode: 'fs_api' | 'fallback' | 'none';
  indexedFileCount?: number;
}

export interface MountedPosixDirectoryMeta {
  id: string;
  name: string;
  basePrefix: string;
  mode: 'fs_api' | 'fallback';
  indexedFileCount?: number;
  addedAt: number;
}

export interface BoundPosixFileMeta {
  posixPath: string;
  filename: string;
  canWriteDisk: boolean;
  addedAt: number;
}

export interface RecentPosixEntry {
  posixPath: string;
  resolvedRelativePath: string;
  filename: string;
  lastOpened: number;
}

export interface PosixResolvedFile {
  filename: string;
  content: string;
  format: FileFormat;
  posixPath: string;
  relativePath: string;
  canWriteDisk: boolean;
  mountedDirName?: string;
}

export interface PosixTargetClassification {
  normPath: string;
  filename: string;
  parentDirPath: string;
  parentDirName: string;
  isDirectHomeRootFile: boolean;
  isSystemBlockedDirectoryMount: boolean;
}

const DB_NAME = 'livia_posix_fs_db';
const STORE_NAME = 'handles';
const ROOT_HANDLE_KEY = 'root_dir_handle';
const DIR_HANDLE_PREFIX = 'dir_mount:';
const FILE_HANDLE_PREFIX = 'file_bind:';
const FALLBACK_DIR_PREFIX = 'fallback_dir:';
const FALLBACK_DIR_INDEX_PREFIX = 'fallback_dir_idx:';
const FALLBACK_DIR_FILE_PREFIX = 'fallback_dir_file:';
const FALLBACK_FILE_PREFIX = 'fallback_file:';

const CONFIG_STORAGE_KEY = 'livia_posix_root_config';
const MOUNTS_META_STORAGE_KEY = 'livia_posix_dir_mounts_meta';
const BOUND_FILES_META_STORAGE_KEY = 'livia_posix_bound_files_meta';
const DETECTED_HOME_STORAGE_KEY = 'livia_posix_detected_home';
const RECENT_PATHS_STORAGE_KEY = 'livia_posix_recent_paths';

// Active file handles in memory mapped by normalized POSIX path and by filename
const activeHandlesByPath = new Map<string, any>();
const activeHandlesByFilename = new Map<string, { handle: any; posixPath: string; relativePath: string }>();

// Live permission state cache so resolveBestStartInSync ONLY passes actively-granted handles to Chrome
const cachedDirPermById = new Map<string, 'granted' | 'prompt' | 'denied'>();
const cachedFilePermByPath = new Map<string, 'granted' | 'prompt' | 'denied'>();

// Fallback in-memory files (only loaded lazily on demand — never preloaded wholesale into RAM!)
const fallbackSingleFilesByPath = new Map<string, File>();
const fallbackDirectoryFiles = new Map<string, File>();
const fallbackMountedDirs = new Map<string, Map<string, File>>();
const fallbackMountedIndexes = new Map<string, string[]>();

let cachedRootDirHandle: any = null;
const cachedDirHandlesById = new Map<string, any>();
let legacyMigrationPromise: Promise<void> | null = null;

// Binary/media extensions excluded when indexing fallback folders; all text/code/config/Markdown/DOCX files are included with NO size limit!
const EXCLUDED_BINARY_EXTENSIONS = new Set([
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'mpeg', 'mpg',
  'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus', 'midi', 'mid',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'tiff', 'tif', 'heic', 'heif', 'psd', 'raw', 'cr2', 'nef',
  'zip', 'tar', 'gz', 'tgz', 'bz2', 'xz', '7z', 'rar', 'zst', 'lz4', 'cab',
  'iso', 'img', 'dmg', 'vhd', 'vmdk', 'qcow2', 'bin', 'rom',
  'exe', 'dll', 'so', 'dylib', 'a', 'o', 'obj', 'class', 'jar', 'war', 'ear', 'pyc', 'pyo', 'wasm',
  'deb', 'rpm', 'apk', 'aab', 'appimage', 'flatpak', 'snap', 'msi', 'pkg',
  'pdf', 'epub', 'mobi', 'djvu', 'pptx', 'ppt', 'xlsx', 'xls', 'odt', 'ods', 'odp',
  'ttf', 'otf', 'woff', 'woff2', 'eot',
  'sqlite', 'sqlite3', 'db', 'mdb', 'parquet', 'avro', 'arrow', 'feather', 'pkl', 'pickle', 'pt', 'pth', 'onnx', 'safetensors', 'gguf', 'ckpt',
]);

/**
 * Determines whether a File should be indexed in LiViA's fallback directory index.
 * Includes ALL text, source code, Markdown, config/dotfiles, and DOCX files with NO size limit,
 * while excluding binary/media/archive/executable files to keep RAM & IndexedDB ultra-lean.
 */
export function isIndexableTextOrCodeFile(file: File): boolean {
  const name = (file.name || '').trim();
  if (!name) return false;
  const lower = name.toLowerCase();

  // Always allow .docx (supported natively via mammoth)
  if (lower.endsWith('.docx')) return true;

  // Exclude known binary/media MIME types explicitly
  const mime = (file.type || '').toLowerCase();
  if (
    mime.startsWith('video/') ||
    mime.startsWith('audio/') ||
    (mime.startsWith('image/') && !mime.includes('svg')) ||
    mime.startsWith('font/') ||
    mime === 'application/pdf' ||
    mime === 'application/zip' ||
    mime === 'application/gzip' ||
    mime === 'application/x-tar' ||
    mime === 'application/x-7z-compressed' ||
    mime === 'application/x-rar-compressed' ||
    mime === 'application/x-iso9660-image' ||
    mime === 'application/x-msdownload' ||
    mime === 'application/x-executable'
  ) {
    return false;
  }

  // Always allow explicit text/* or known text application MIME types
  if (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/xml' ||
    mime === 'application/javascript' ||
    mime === 'application/typescript' ||
    mime === 'application/x-sh' ||
    mime === 'application/x-shellscript' ||
    mime === 'image/svg+xml'
  ) {
    return true;
  }

  // Extract extension (handling dotfiles like .bashrc, .gitignore, Makefile, Dockerfile)
  const dotIdx = lower.lastIndexOf('.');
  if (dotIdx <= 0) {
    // Dotfile (e.g. .bashrc, .lvarc, .env) or extensionless text file (Makefile, README, LICENSE)
    return true;
  }

  const ext = lower.slice(dotIdx + 1);
  if (EXCLUDED_BINARY_EXTENSIONS.has(ext)) {
    return false;
  }

  return true;
}

function openPosixDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbPut(key: string, value: any): Promise<void> {
  const db = await openPosixDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key: string): Promise<any | null> {
  const db = await openPosixDB();
  return new Promise<any>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openPosixDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function sanitizeIdFragment(raw: string): string {
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'root'
  );
}

function makePickerId(scope: string): string {
  const clean = sanitizeIdFragment(scope);
  return `livia_${clean}`.slice(0, 32);
}

export function isRunningInCrossOriginIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.self === window.top) return false;
    // Accessing window.top.location.href throws SecurityError in cross-origin iframes
    const _topHref = window.top?.location?.href;
    return !_topHref;
  } catch {
    return true;
  }
}

/**
 * Automatically detects and persists the user's $HOME prefix (e.g. "/home/mario", "/Users/mario", "/storage/emulated/0")
 * from any full POSIX path typed by the user.
 */
export function detectAndSaveHomePrefix(posixPath: string): string {
  const norm = normalizePosixPath(posixPath);
  const patterns = [
    /^(\/home\/[^/]+)(?:\/|$)/,
    /^(\/Users\/[^/]+)(?:\/|$)/,
    /^(\/storage\/emulated\/0)(?:\/|$)/,
    /^(\/sdcard)(?:\/|$)/,
    /^([A-Za-z]:\/Users\/[^/]+)(?:\/|$)/,
  ];

  for (const regex of patterns) {
    const match = norm.match(regex);
    if (match && match[1]) {
      try {
        localStorage.setItem(DETECTED_HOME_STORAGE_KEY, match[1]);
      } catch {
        // ignore storage errors
      }
      return match[1];
    }
  }
  return getDetectedHomePrefix();
}

export function getDetectedHomePrefix(): string {
  try {
    return localStorage.getItem(DETECTED_HOME_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setDetectedHomePrefix(prefix: string): void {
  const norm = prefix.trim() ? normalizePosixPath(prefix.trim()).replace(/\/+$/, '') : '';
  try {
    if (norm) {
      localStorage.setItem(DETECTED_HOME_STORAGE_KEY, norm);
    } else {
      localStorage.removeItem(DETECTED_HOME_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Given a normalized POSIX path, returns equivalent canonical paths
 * (e.g., expanding "~/file.txt" <-> "/home/user/file.txt").
 */
export function getEquivalentHomePaths(normPath: string): string[] {
  const results: string[] = [normPath];
  const homePrefix = detectAndSaveHomePrefix(normPath);

  if (homePrefix) {
    if (normPath.startsWith('~/')) {
      const expanded = `${homePrefix}/${normPath.slice(2)}`;
      if (!results.includes(expanded)) results.push(expanded);
    } else if (normPath === '~') {
      if (!results.includes(homePrefix)) results.push(homePrefix);
    } else if (normPath.startsWith(homePrefix + '/')) {
      const tildeForm = `~/${normPath.slice(homePrefix.length + 1)}`;
      if (!results.includes(tildeForm)) results.push(tildeForm);
    }
  }

  return results;
}

/**
 * Checks whether Chromium's `showDirectoryPicker` C++ `kBlockedPaths` blocks mounting `parentDirPath` directly
 * (specifically `$HOME` root and `$HOME/Scaricati` / `$HOME/Downloads` or system directories like `/etc`, `/usr`).
 * Note: Subfolders *inside* `Scaricati` (e.g. `~/Scaricati/mio_progetto`) ARE allowed by `showDirectoryPicker`,
 * while `~/Scaricati` itself requires `<input webkitdirectory>` (Universal Folder Mount) or multi-file picker!
 */
function checkIsSystemBlockedDirectoryMount(
  parentDirPath: string,
  parentDirName: string,
  isDirectHomeRootFile: boolean
): boolean {
  if (isDirectHomeRootFile) return true;
  if (isRunningInCrossOriginIframe()) return true;

  const lowerName = (parentDirName || '').toLowerCase();
  const homePrefix = getDetectedHomePrefix();

  // Chromium blocks mounting the top-level Downloads / Scaricati directory via showDirectoryPicker
  if (lowerName === 'scaricati' || lowerName === 'downloads' || lowerName === 'download') {
    if (
      parentDirPath === `~/${parentDirName}` ||
      (homePrefix && parentDirPath.toLowerCase() === `${homePrefix.toLowerCase()}/${lowerName}`) ||
      /^\/home\/[^/]+\/(scaricati|downloads?)$/i.test(parentDirPath) ||
      /^\/Users\/[^/]+\/(scaricati|downloads?)$/i.test(parentDirPath)
    ) {
      return true;
    }
  }

  // Linux system paths blocked by Chromium's kBlockedPaths
  if (/^\/(etc|usr|bin|sbin|lib|lib64|proc|sys|dev|boot)(\/|$)/i.test(parentDirPath)) {
    return true;
  }

  return false;
}

/**
 * Classifies a POSIX path into:
 * - A file directly in the root of $HOME (`isDirectHomeRootFile: true`)
 * - A file inside `$HOME/Scaricati` (`Downloads`) or system path (`isSystemBlockedDirectoryMount: true`)
 * - A file inside a standard subfolder (`isDirectHomeRootFile: false`, `isSystemBlockedDirectoryMount: false`)
 */
export function classifyPosixTargetPath(rawPath: string): PosixTargetClassification {
  const normPath = normalizePosixPath(rawPath);
  const homePrefix = detectAndSaveHomePrefix(normPath);

  let expandedPath = normPath;
  if (normPath.startsWith('~/') && homePrefix) {
    expandedPath = `${homePrefix}/${normPath.slice(2)}`;
  }

  const segments = expandedPath.split('/').filter(Boolean);
  const filename = segments[segments.length - 1] || 'file.txt';

  if (normPath.startsWith('~/')) {
    const relSegments = normPath.slice(2).split('/').filter(Boolean);
    if (relSegments.length <= 1) {
      const parentDirPath = homePrefix || '~';
      const parentDirName = homePrefix ? homePrefix.split('/').filter(Boolean).pop() || '$HOME' : '$HOME';
      return {
        normPath,
        filename,
        parentDirPath,
        parentDirName,
        isDirectHomeRootFile: true,
        isSystemBlockedDirectoryMount: true,
      };
    }
  }

  const homeMatch =
    expandedPath.match(/^(\/home\/[^/]+)\/([^/]+)$/) ||
    expandedPath.match(/^(\/Users\/[^/]+)\/([^/]+)$/) ||
    expandedPath.match(/^(\/storage\/emulated\/0)\/([^/]+)$/) ||
    expandedPath.match(/^(\/sdcard)\/([^/]+)$/);

  if (homeMatch) {
    const parentDirPath = homeMatch[1];
    const parentDirName = parentDirPath.split('/').filter(Boolean).pop() || '$HOME';
    return {
      normPath,
      filename,
      parentDirPath,
      parentDirName,
      isDirectHomeRootFile: true,
      isSystemBlockedDirectoryMount: true,
    };
  }

  if (segments.length >= 2) {
    const parentSegments = segments.slice(0, -1);
    const parentDirPath = expandedPath.startsWith('/')
      ? '/' + parentSegments.join('/')
      : normPath.startsWith('~/')
      ? '~/' + normPath.slice(2).split('/').filter(Boolean).slice(0, -1).join('/')
      : parentSegments.join('/');
    const parentDirName = parentSegments[parentSegments.length - 1];
    const isBlocked = checkIsSystemBlockedDirectoryMount(parentDirPath, parentDirName, false);
    return {
      normPath,
      filename,
      parentDirPath,
      parentDirName,
      isDirectHomeRootFile: false,
      isSystemBlockedDirectoryMount: isBlocked,
    };
  }

  const fallbackParentPath = homePrefix || '~';
  const fallbackParentName = homePrefix ? homePrefix.split('/').filter(Boolean).pop() || '$HOME' : '$HOME';
  return {
    normPath,
    filename,
    parentDirPath: fallbackParentPath,
    parentDirName: fallbackParentName,
    isDirectHomeRootFile: true,
    isSystemBlockedDirectoryMount: true,
  };
}

/**
 * Infers the exact full POSIX basePrefix for a newly mounted directory handle
 * given its folder name (`dirName`) and the target file's POSIX path.
 */
export function inferMountBasePrefix(
  dirName: string,
  customBasePrefix?: string,
  targetPosixPath?: string
): string {
  const cleanDirName = (dirName || '').trim();
  if (customBasePrefix && customBasePrefix.trim()) {
    const normCustom = normalizePosixPath(customBasePrefix.trim()).replace(/\/+$/, '');
    const homePrefix = getDetectedHomePrefix();
    if (normCustom.startsWith('~/') && homePrefix) {
      return `${homePrefix}/${normCustom.slice(2)}`;
    }
    return normCustom;
  }

  if (targetPosixPath && targetPosixPath.trim()) {
    const normTarget = normalizePosixPath(targetPosixPath.trim());
    const homePrefix = detectAndSaveHomePrefix(normTarget);
    const expandedTarget =
      normTarget.startsWith('~/') && homePrefix
        ? `${homePrefix}/${normTarget.slice(2)}`
        : normTarget;

    const segments = expandedTarget.split('/').filter(Boolean);
    const isAbs = expandedTarget.startsWith('/');
    const isTilde = normTarget.startsWith('~/') && !homePrefix;

    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].toLowerCase() === cleanDirName.toLowerCase()) {
        if (isAbs) {
          return '/' + segments.slice(0, i + 1).join('/');
        }
        if (isTilde) {
          const tildeSegs = normTarget.slice(2).split('/').filter(Boolean);
          const idx = tildeSegs.findIndex((s) => s.toLowerCase() === cleanDirName.toLowerCase());
          if (idx !== -1) {
            return '~/' + tildeSegs.slice(0, idx + 1).join('/');
          }
        }
        return segments.slice(0, i + 1).join('/');
      }
    }

    if (segments.length >= 2 && isAbs) {
      const parentPrefix = '/' + segments.slice(0, -1).join('/');
      const home = getDetectedHomePrefix();
      if (!home || parentPrefix !== home) {
        return parentPrefix;
      }
    }
  }

  // If the folder is a known top-level XDG folder in $HOME (like Scaricati, Documenti, Scrivania), infer $HOME/<dirName>
  const home = getDetectedHomePrefix();
  if (
    home &&
    /^(scaricati|downloads?|documenti|documents?|scrivania|desktop|immagini|pictures|musica|music|video|videos)$/i.test(
      cleanDirName
    )
  ) {
    return `${home}/${cleanDirName}`;
  }

  return '';
}

// --- Multi-Directory Mounts Management & Pre-warming ---

export async function ensureLegacyMountMigrated(): Promise<void> {
  if (legacyMigrationPromise) {
    return legacyMigrationPromise;
  }

  legacyMigrationPromise = (async () => {
    try {
      const legacyCfg = getPosixRootConfig();
      const rawMeta = localStorage.getItem(MOUNTS_META_STORAGE_KEY);
      let currentList: MountedPosixDirectoryMeta[] = [];
      if (rawMeta) {
        try {
          const parsed = JSON.parse(rawMeta);
          if (Array.isArray(parsed)) currentList = parsed;
        } catch {
          currentList = [];
        }
      }

      const legacyHandle = await idbGet(ROOT_HANDLE_KEY).catch(() => null);
      if (legacyHandle) {
        const handleName = legacyHandle.name || legacyCfg.rootName || 'folder';
        const matchingExisting = currentList.find(
          (m) => m.id === 'legacy_root' || m.name.toLowerCase() === handleName.toLowerCase()
        );

        const basePrefix = matchingExisting?.basePrefix || legacyCfg.basePrefix || '';
        const dedicatedId = `mount_${sanitizeIdFragment(basePrefix || handleName)}`;

        const existingDedicated = await idbGet(`${DIR_HANDLE_PREFIX}${dedicatedId}`).catch(() => null);
        if (!existingDedicated) {
          await idbPut(`${DIR_HANDLE_PREFIX}${dedicatedId}`, legacyHandle).catch(() => {});
        }
        cachedDirHandlesById.set(dedicatedId, legacyHandle);

        if (!currentList.some((m) => m.id === dedicatedId)) {
          const filtered = currentList.filter((m) => m.id !== 'legacy_root');
          const migratedMeta: MountedPosixDirectoryMeta = {
            id: dedicatedId,
            name: handleName,
            basePrefix,
            mode: 'fs_api',
            addedAt: matchingExisting?.addedAt || Date.now() - 1000,
          };
          saveMountedDirectoriesMeta([...filtered, migratedMeta]);
        } else if (currentList.some((m) => m.id === 'legacy_root')) {
          saveMountedDirectoriesMeta(currentList.filter((m) => m.id !== 'legacy_root'));
        }
      } else if (currentList.length === 0 && legacyCfg.mode !== 'none' && legacyCfg.rootName) {
        const dedicatedId = `mount_${sanitizeIdFragment(legacyCfg.basePrefix || legacyCfg.rootName)}`;
        saveMountedDirectoriesMeta([
          {
            id: dedicatedId,
            name: legacyCfg.rootName,
            basePrefix: legacyCfg.basePrefix || '',
            mode: legacyCfg.mode,
            indexedFileCount: legacyCfg.indexedFileCount,
            addedAt: Date.now(),
          },
        ]);
      }
    } catch {
      // ignore migration errors
    }
  })();

  return legacyMigrationPromise;
}

/**
 * Pre-warms ONLY lightweight FS API directory/file handles and their live permission states (`granted`/`prompt`)
 * so `resolveBestStartInSync` runs 100% synchronously and NEVER passes an expired handle to Chrome's picker.
 * Fallback directory File blobs are NEVER preloaded into RAM (they are loaded lazily on demand from IndexedDB!).
 */
export async function warmUpPosixHandlesCache(): Promise<void> {
  await ensureLegacyMountMigrated();
  const mounts = getMountedDirectoriesMeta();
  for (const m of mounts) {
    if (m.mode === 'fs_api') {
      const h = await getDirectoryHandleForMount(m).catch(() => null);
      if (h) {
        const perm = await queryHandlePermissionFast(h, 'read');
        cachedDirPermById.set(m.id, perm);
      }
    } else if (m.mode === 'fallback') {
      // Load ONLY the tiny string[] path index (never File blobs!)
      if (!fallbackMountedIndexes.has(m.id)) {
        const idx = await idbGet(`${FALLBACK_DIR_INDEX_PREFIX}${m.id}`).catch(() => null);
        if (Array.isArray(idx)) {
          fallbackMountedIndexes.set(m.id, idx);
        }
      }
    }
  }
  const bound = getBoundPosixFilesMeta();
  for (const bf of bound.slice(0, 30)) {
    const fh = await getSavedBoundFileHandle(bf.posixPath).catch(() => null);
    if (fh) {
      const perm = await queryHandlePermissionFast(fh, 'read');
      for (const eq of getEquivalentHomePaths(normalizePosixPath(bf.posixPath))) {
        cachedFilePermByPath.set(eq, perm);
      }
    }
  }
}

export function getMountedDirectoryPermissionState(mountId: string): 'granted' | 'prompt' | 'denied' | 'unknown' {
  return cachedDirPermById.get(mountId) || 'unknown';
}

/**
 * Synchronously requests read permission on an already-mounted FS API directory handle.
 * Shows ONLY Chrome's tiny inline permission bar (NO file browser / NO "Recenti" window!).
 */
export async function reauthorizeMountedDirectory(mountId: string): Promise<boolean> {
  let handle = cachedDirHandlesById.get(mountId);
  if (!handle) {
    const meta = getMountedDirectoriesMeta().find((m) => m.id === mountId);
    if (meta) {
      handle = await getDirectoryHandleForMount(meta);
    }
  }
  if (!handle) return false;
  const granted = await ensureHandlePermission(handle, 'read');
  cachedDirPermById.set(mountId, granted ? 'granted' : 'denied');
  return granted;
}

export function getMountedDirectoriesMeta(): MountedPosixDirectoryMeta[] {
  try {
    const raw = localStorage.getItem(MOUNTS_META_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw) as MountedPosixDirectoryMeta[];
      if (Array.isArray(list) && list.length > 0) {
        const legacy = getPosixRootConfig();
        if (
          legacy.mode !== 'none' &&
          legacy.rootName &&
          !list.some((m) => m.name.toLowerCase() === legacy.rootName.toLowerCase())
        ) {
          return [
            ...list,
            {
              id: `mount_${sanitizeIdFragment(legacy.basePrefix || legacy.rootName)}`,
              name: legacy.rootName,
              basePrefix: legacy.basePrefix || '',
              mode: legacy.mode,
              indexedFileCount: legacy.indexedFileCount,
              addedAt: Date.now() - 5000,
            },
          ];
        }
        return list;
      }
    }
  } catch {
    // ignore
  }

  const legacy = getPosixRootConfig();
  if (legacy.mode !== 'none' && legacy.rootName) {
    return [
      {
        id: 'legacy_root',
        name: legacy.rootName,
        basePrefix: legacy.basePrefix || '',
        mode: legacy.mode,
        indexedFileCount: legacy.indexedFileCount,
        addedAt: Date.now(),
      },
    ];
  }
  return [];
}

function saveMountedDirectoriesMeta(list: MountedPosixDirectoryMeta[]): void {
  try {
    localStorage.setItem(MOUNTS_META_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export async function addMountedDirectoryHandle(
  handle: any,
  customBasePrefix?: string,
  targetPosixPath?: string
): Promise<MountedPosixDirectoryMeta> {
  await ensureLegacyMountMigrated();

  const dirName = handle.name || 'folder';
  const inferredPrefix = inferMountBasePrefix(dirName, customBasePrefix, targetPosixPath);
  const id = `mount_${sanitizeIdFragment(inferredPrefix || dirName)}`;

  cachedDirHandlesById.set(id, handle);
  cachedDirPermById.set(id, 'granted');
  if (!cachedRootDirHandle) {
    cachedRootDirHandle = handle;
  }

  try {
    await idbPut(`${DIR_HANDLE_PREFIX}${id}`, handle);
    const existingRoot = await idbGet(ROOT_HANDLE_KEY).catch(() => null);
    if (!existingRoot) {
      await idbPut(ROOT_HANDLE_KEY, handle);
    }
  } catch (err) {
    console.warn('Could not persist DirectoryHandle to IndexedDB:', err);
  }

  const currentList = getMountedDirectoriesMeta().filter((m) => {
    if (m.id === id) return false;
    if (m.id === 'legacy_root' && m.name.toLowerCase() === dirName.toLowerCase()) return false;
    if (
      m.name.toLowerCase() === dirName.toLowerCase() &&
      (!m.basePrefix || !inferredPrefix || m.basePrefix.toLowerCase() === inferredPrefix.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const previousSameFolder = getMountedDirectoriesMeta().find(
    (m) => m.name.toLowerCase() === dirName.toLowerCase() && m.basePrefix
  );
  const finalPrefix = inferredPrefix || previousSameFolder?.basePrefix || '';

  const newMeta: MountedPosixDirectoryMeta = {
    id,
    name: dirName,
    basePrefix: finalPrefix,
    mode: 'fs_api',
    addedAt: Date.now(),
  };
  const updatedList = [newMeta, ...currentList];
  saveMountedDirectoriesMeta(updatedList);

  const prevRootCfg = getPosixRootConfig();
  if (prevRootCfg.mode === 'none' || !prevRootCfg.rootName) {
    savePosixRootConfig({
      rootName: dirName,
      basePrefix: finalPrefix,
      mode: 'fs_api',
    });
  }

  return newMeta;
}

export async function removeMountedDirectory(id: string): Promise<void> {
  cachedDirHandlesById.delete(id);
  cachedDirPermById.delete(id);
  fallbackMountedDirs.delete(id);
  const existingIdx = fallbackMountedIndexes.get(id);
  fallbackMountedIndexes.delete(id);
  try {
    await idbDelete(`${DIR_HANDLE_PREFIX}${id}`);
    await idbDelete(`${FALLBACK_DIR_PREFIX}${id}`);
    await idbDelete(`${FALLBACK_DIR_INDEX_PREFIX}${id}`);
    if (Array.isArray(existingIdx)) {
      for (const relKey of existingIdx) {
        await idbDelete(`${FALLBACK_DIR_FILE_PREFIX}${id}:${relKey}`).catch(() => {});
      }
    }
  } catch {
    // ignore
  }
  const remaining = getMountedDirectoriesMeta().filter((m) => m.id !== id);
  saveMountedDirectoriesMeta(remaining);

  if (remaining.length === 0) {
    await clearPosixRootAuthorization();
  } else {
    const first = remaining[0];
    savePosixRootConfig({
      rootName: first.name,
      basePrefix: first.basePrefix,
      mode: first.mode,
      indexedFileCount: first.indexedFileCount,
    });
  }
}

export async function getDirectoryHandleForMount(meta: MountedPosixDirectoryMeta): Promise<any | null> {
  if (cachedDirHandlesById.has(meta.id)) {
    return cachedDirHandlesById.get(meta.id);
  }
  try {
    const handle = await idbGet(`${DIR_HANDLE_PREFIX}${meta.id}`);
    if (handle) {
      cachedDirHandlesById.set(meta.id, handle);
      return handle;
    }
    const byNameId = `mount_${sanitizeIdFragment(meta.name)}`;
    if (byNameId !== meta.id) {
      const handleByName = await idbGet(`${DIR_HANDLE_PREFIX}${byNameId}`);
      if (handleByName) {
        cachedDirHandlesById.set(meta.id, handleByName);
        return handleByName;
      }
    }
    const rootHandle = await idbGet(ROOT_HANDLE_KEY);
    if (
      rootHandle &&
      (meta.id === 'legacy_root' ||
        (rootHandle.name && rootHandle.name.toLowerCase() === meta.name.toLowerCase()))
    ) {
      cachedDirHandlesById.set(meta.id, rootHandle);
      await idbPut(`${DIR_HANDLE_PREFIX}${meta.id}`, rootHandle).catch(() => {});
      return rootHandle;
    }
  } catch {
    // ignore
  }
  return null;
}

// --- Direct Single-File & Multi-File Handle Binding ($HOME & Arbitrary Files) ---

export function getBoundPosixFilesMeta(): BoundPosixFileMeta[] {
  try {
    const raw = localStorage.getItem(BOUND_FILES_META_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BoundPosixFileMeta[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveBoundPosixFilesMeta(list: BoundPosixFileMeta[]): void {
  try {
    localStorage.setItem(BOUND_FILES_META_STORAGE_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {
    // ignore
  }
}

export async function registerBoundFileHandle(
  rawPosixPath: string,
  fileHandle: any,
  filenameOverride?: string
): Promise<BoundPosixFileMeta> {
  const normPath = normalizePosixPath(rawPosixPath);
  const eqPaths = getEquivalentHomePaths(normPath);
  const filename = filenameOverride || fileHandle?.name || normPath.split('/').pop() || 'file.txt';

  for (const p of eqPaths) {
    activeHandlesByPath.set(p, fileHandle);
    cachedFilePermByPath.set(p, 'granted');
    try {
      await idbPut(`${FILE_HANDLE_PREFIX}${p}`, fileHandle);
    } catch {
      // ignore
    }
  }

  activeHandlesByFilename.set(filename, {
    handle: fileHandle,
    posixPath: normPath,
    relativePath: filename,
  });

  const existing = getBoundPosixFilesMeta().filter(
    (item) => !eqPaths.includes(item.posixPath)
  );
  const meta: BoundPosixFileMeta = {
    posixPath: normPath,
    filename,
    canWriteDisk: Boolean(fileHandle && typeof fileHandle.createWritable === 'function'),
    addedAt: Date.now(),
  };
  saveBoundPosixFilesMeta([meta, ...existing]);
  return meta;
}

export async function removeBoundPosixFile(posixPath: string): Promise<void> {
  const normPath = normalizePosixPath(posixPath);
  const eqPaths = getEquivalentHomePaths(normPath);

  for (const p of eqPaths) {
    activeHandlesByPath.delete(p);
    fallbackSingleFilesByPath.delete(p);
    try {
      await idbDelete(`${FILE_HANDLE_PREFIX}${p}`);
      await idbDelete(`${FALLBACK_FILE_PREFIX}${p}`);
    } catch {
      // ignore
    }
  }

  const remaining = getBoundPosixFilesMeta().filter(
    (item) => !eqPaths.includes(item.posixPath)
  );
  saveBoundPosixFilesMeta(remaining);
}

async function getSavedBoundFileHandle(normPath: string): Promise<any | null> {
  const eqPaths = getEquivalentHomePaths(normPath);
  for (const p of eqPaths) {
    if (activeHandlesByPath.has(p)) {
      return activeHandlesByPath.get(p);
    }
  }
  for (const p of eqPaths) {
    try {
      const handle = await idbGet(`${FILE_HANDLE_PREFIX}${p}`);
      if (handle) {
        activeHandlesByPath.set(p, handle);
        return handle;
      }
    } catch {
      // ignore
    }
  }

  const targetSegments = normPath.split('/').filter(Boolean);
  const targetFilename = targetSegments[targetSegments.length - 1] || '';
  const boundMeta = getBoundPosixFilesMeta();
  for (const meta of boundMeta) {
    if (meta.posixPath.toLowerCase() === normPath.toLowerCase()) {
      try {
        const handle = await idbGet(`${FILE_HANDLE_PREFIX}${meta.posixPath}`);
        if (handle) {
          activeHandlesByPath.set(normPath, handle);
          return handle;
        }
      } catch {
        // ignore
      }
    }
    if (targetFilename && meta.filename.toLowerCase() === targetFilename.toLowerCase()) {
      const metaEquiv = getEquivalentHomePaths(meta.posixPath);
      if (metaEquiv.some((mp) => mp.toLowerCase() === normPath.toLowerCase())) {
        try {
          const handle = await idbGet(`${FILE_HANDLE_PREFIX}${meta.posixPath}`);
          if (handle) {
            activeHandlesByPath.set(normPath, handle);
            return handle;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  return null;
}

/**
 * 100% SYNCHRONOUS calculation of `startIn` from verified actively-granted handles and XDG folder names.
 * NEVER passes a stale/prompt handle from a prior session (which makes Linux Chrome GTK fall back to "Recenti"),
 * and always resolves to a real directory inside $HOME ('documents', 'downloads', 'desktop', etc.).
 */
export function resolveBestStartInSync(rawTargetPath?: string): any {
  const normTarget = rawTargetPath ? normalizePosixPath(rawTargetPath) : '';
  const homePrefix = normTarget ? detectAndSaveHomePrefix(normTarget) : getDetectedHomePrefix();
  const expandedTarget =
    normTarget.startsWith('~/') && homePrefix
      ? `${homePrefix}/${normTarget.slice(2)}`
      : normTarget;

  const classification = expandedTarget ? classifyPosixTargetPath(expandedTarget) : null;
  const targetParentDir = classification?.parentDirPath || homePrefix || '';

  // 1. Check actively-GRANTED bound file handles in the exact same parent directory
  const boundMeta = getBoundPosixFilesMeta();
  if (targetParentDir) {
    const parentEquivs = getEquivalentHomePaths(targetParentDir);
    for (const bf of boundMeta) {
      const bfClass = classifyPosixTargetPath(bf.posixPath);
      const bfParents = getEquivalentHomePaths(bfClass.parentDirPath);
      if (bfParents.some((p) => parentEquivs.includes(p))) {
        const eqs = getEquivalentHomePaths(bf.posixPath);
        for (const eq of eqs) {
          if (activeHandlesByPath.has(eq) && cachedFilePermByPath.get(eq) === 'granted') {
            return activeHandlesByPath.get(eq);
          }
        }
      }
    }
  }

  // 2. Check actively-GRANTED mounted directory handles that are ancestors of targetParentDir
  const mounts = getMountedDirectoriesMeta();
  let bestAncestorHandle: any = null;
  let bestAncestorLen = -1;

  for (const m of mounts) {
    if (m.mode !== 'fs_api') continue;
    if (cachedDirPermById.get(m.id) !== 'granted') continue;
    const h = cachedDirHandlesById.get(m.id);
    if (!h) continue;
    if (m.basePrefix && expandedTarget) {
      const mountPrefixes = getEquivalentHomePaths(m.basePrefix);
      for (const mp of mountPrefixes) {
        if (expandedTarget.startsWith(mp + '/') || targetParentDir === mp) {
          if (mp.length > bestAncestorLen) {
            bestAncestorLen = mp.length;
            bestAncestorHandle = h;
          }
        }
      }
    }
  }
  if (bestAncestorHandle) {
    return bestAncestorHandle;
  }

  // 3. Match well-known XDG folder names (guaranteed real directories on Linux/macOS/Windows, never "Recenti"!)
  if (expandedTarget) {
    const lowerSegments = expandedTarget.split('/').map((s) => s.toLowerCase());
    const wellKnownMap: Record<string, string> = {
      scaricati: 'downloads',
      downloads: 'downloads',
      download: 'downloads',
      documenti: 'documents',
      documents: 'documents',
      docs: 'documents',
      scrivania: 'desktop',
      desktop: 'desktop',
      immagini: 'pictures',
      pictures: 'pictures',
      foto: 'pictures',
      photos: 'pictures',
      musica: 'music',
      music: 'music',
      video: 'videos',
      videos: 'videos',
      filmati: 'videos',
    };
    for (const seg of lowerSegments) {
      if (wellKnownMap[seg]) {
        return wellKnownMap[seg];
      }
    }
  }

  // 4. Check any actively-GRANTED bound file handle in $HOME root (opens picker directly in /home/<user>!)
  for (const bf of boundMeta) {
    const bfClass = classifyPosixTargetPath(bf.posixPath);
    if (bfClass.isDirectHomeRootFile) {
      const eqs = getEquivalentHomePaths(bf.posixPath);
      for (const eq of eqs) {
        if (activeHandlesByPath.has(eq) && cachedFilePermByPath.get(eq) === 'granted') {
          return activeHandlesByPath.get(eq);
        }
      }
    }
  }

  // 5. Check any actively-GRANTED directory handle from this session
  for (const [id, h] of cachedDirHandlesById.entries()) {
    if (h && cachedDirPermById.get(id) === 'granted') return h;
  }

  // 6. Fallback to 'documents' (a guaranteed real directory inside $HOME) so Linux GTK never opens on virtual "Recenti"
  return 'documents';
}

/**
 * Synchronously opens the Universal Directory Selector (`<input type="file" webkitdirectory multiple>`)
 * which has NO Chromium block on `$HOME/Scaricati` (`Downloads`) or on folders with lower/read-only permissions,
 * persists all indexed files in IndexedDB, and immediately resolves the requested POSIX file!
 */
export function promptUniversalDirectoryMount(
  rawTargetPath?: string
): Promise<PosixResolvedFile | null> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('DOM non disponibile.'));
  }

  const normTarget = rawTargetPath ? normalizePosixPath(rawTargetPath) : '';
  if (normTarget) {
    detectAndSaveHomePrefix(normTarget);
  }
  const classification = normTarget ? classifyPosixTargetPath(normTarget) : null;

  return new Promise<PosixResolvedFile | null>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.multiple = true;
    input.style.display = 'none';
    let settled = false;

    input.onchange = async () => {
      settled = true;
      const files = input.files;
      if (input.parentNode) input.parentNode.removeChild(input);
      if (!files || files.length === 0) {
        const abortErr = new Error('Selezione cartella annullata.');
        (abortErr as any).name = 'AbortError';
        reject(abortErr);
        return;
      }

      try {
        const updatedCfg = registerFallbackDirectoryFiles(files, undefined, normTarget || undefined);

        if (!normTarget) {
          resolve(null);
          return;
        }

        // Now resolve the requested file from the newly mounted folder!
        const candidates = computeRelativeCandidates(
          normTarget,
          updatedCfg.rootName,
          updatedCfg.basePrefix,
          false
        );
        if (classification?.filename && !candidates.includes(classification.filename)) {
          candidates.push(classification.filename);
        }

        const mountId = `fallback_${sanitizeIdFragment(updatedCfg.basePrefix || updatedCfg.rootName)}`;
        const dirMap = fallbackMountedDirs.get(mountId) || fallbackDirectoryFiles;

        for (const candidate of candidates) {
          const candLower = candidate.toLowerCase();
          for (const [relKey, fileObj] of dirMap.entries()) {
            if (
              relKey === candidate ||
              relKey.toLowerCase() === candLower ||
              fileObj.name.toLowerCase() === (classification?.filename || '').toLowerCase()
            ) {
              const { content, format } = await decodeFileObject(fileObj);
              activeHandlesByFilename.set(fileObj.name, {
                handle: null,
                posixPath: normTarget,
                relativePath: relKey,
              });
              addRecentPosixPath({
                posixPath: normTarget,
                resolvedRelativePath: relKey,
                filename: fileObj.name,
              });
              resolve({
                filename: fileObj.name,
                content,
                format,
                posixPath: normTarget,
                relativePath: relKey,
                canWriteDisk: false,
                mountedDirName: updatedCfg.rootName,
              });
              return;
            }
          }
        }

        reject(
          new Error(
            `Cartella "${updatedCfg.rootName}" (${updatedCfg.indexedFileCount} file) montata con successo, ma il file "${classification?.filename || normTarget}" non è stato trovato al suo interno.`
          )
        );
      } catch (err) {
        reject(err);
      }
    };

    document.body.appendChild(input);
    try {
      input.click();
    } catch (clickErr) {
      if (input.parentNode) input.parentNode.removeChild(input);
      if (!settled) reject(clickErr);
    }
  });
}

/**
 * Mounts the parent directory of a target POSIX path:
 * - If the target folder is `$HOME/Scaricati` (`Downloads`) or in a cross-origin iframe where Chromium blocks
 *   `showDirectoryPicker`, it synchronously opens the Universal Directory Selector (`webkitdirectory`) with zero error!
 * - Otherwise, it calls `showDirectoryPicker` synchronously with `mode: 'read'` (so folders with lower/read-only
 *   permissions are accepted just like in the original version!) and `startIn` computed synchronously.
 */
export async function promptAndMountDirectoryForPosixFile(
  rawTargetPath: string
): Promise<PosixResolvedFile> {
  const normTarget = normalizePosixPath(rawTargetPath);
  detectAndSaveHomePrefix(normTarget);
  const classification = classifyPosixTargetPath(normTarget);

  // If the folder is $HOME/Scaricati (Downloads) or inside a cross-origin iframe, use Universal Directory Mount
  // synchronously on the click so Chromium never blocks it!
  if (classification.isSystemBlockedDirectoryMount) {
    const universalResolved = await promptUniversalDirectoryMount(normTarget);
    if (universalResolved) {
      return universalResolved;
    }
  }

  const startIn = resolveBestStartInSync(normTarget);
  const win = typeof window !== 'undefined' ? (window as any) : null;

  if (win && typeof win.showDirectoryPicker === 'function') {
    let dirHandle: any = null;
    try {
      // Omit recycled `id` so Chrome ALWAYS honors `startIn` (never falls back to poisoned/Recenti history)
      dirHandle = await win.showDirectoryPicker({
        mode: 'read',
        startIn,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw err;
      }
      if (err instanceof TypeError) {
        dirHandle = await win.showDirectoryPicker({
          mode: 'read',
          startIn: 'documents',
        });
      } else {
        (err as any).code = 'DIRECTORY_PICKER_BLOCKED';
        throw err;
      }
    }

    if (!dirHandle) {
      const abortErr = new Error('Selezione cartella annullata.');
      (abortErr as any).name = 'AbortError';
      throw abortErr;
    }

    await ensureHandlePermission(dirHandle, 'read').catch(() => {});

    const mountMeta = await addMountedDirectoryHandle(dirHandle, undefined, normTarget);
    const eqPaths = getEquivalentHomePaths(normTarget);

    const candidates = computeRelativeCandidates(
      normTarget,
      dirHandle.name || mountMeta.name,
      mountMeta.basePrefix,
      false
    );
    if (classification.filename && !candidates.includes(classification.filename)) {
      candidates.push(classification.filename);
    }

    for (const candidate of candidates) {
      const fileHandle = await traverseDirectoryForFile(dirHandle, candidate, false);
      if (fileHandle) {
        const file: File = await fileHandle.getFile();
        const { content, format } = await decodeFileObject(file);
        for (const p of eqPaths) {
          activeHandlesByPath.set(p, fileHandle);
        }
        activeHandlesByFilename.set(file.name, {
          handle: fileHandle,
          posixPath: normTarget,
          relativePath: candidate,
        });
        addRecentPosixPath({
          posixPath: normTarget,
          resolvedRelativePath: candidate,
          filename: file.name,
        });
        return {
          filename: file.name,
          content,
          format,
          posixPath: normTarget,
          relativePath: candidate,
          canWriteDisk: true,
          mountedDirName: mountMeta.name,
        };
      }
    }

    throw new Error(
      `Cartella "${mountMeta.name}" montata con successo, ma il file "${classification.filename}" non è stato trovato al suo interno.`
    );
  }

  // Fallback to Universal Directory Mount if showDirectoryPicker is not supported by browser
  const fallbackRes = await promptUniversalDirectoryMount(normTarget);
  if (fallbackRes) return fallbackRes;

  const err = new Error('NO_ROOT_AUTHORIZED');
  (err as any).code = 'NO_ROOT_AUTHORIZED';
  throw err;
}

/**
 * Opens the browser's file selector (`showOpenFilePicker` or `<input type="file">`)
 * with `multiple: true` by default so the user can bind one or multiple files in `$HOME` at once,
 * computing `startIn` synchronously so it starts in the file's parent directory (never "Recenti").
 */
export async function promptAndBindSinglePosixFile(
  rawTargetPath?: string,
  options?: { multiple?: boolean }
): Promise<PosixResolvedFile> {
  const normTarget = rawTargetPath ? normalizePosixPath(rawTargetPath) : '';
  if (normTarget) {
    detectAndSaveHomePrefix(normTarget);
  }
  const classification = normTarget ? classifyPosixTargetPath(normTarget) : null;
  const expectedFilename = classification?.filename || '';
  const allowMultiple = options?.multiple !== false;

  const startIn = resolveBestStartInSync(normTarget || getDetectedHomePrefix() || '~');

  const win = typeof window !== 'undefined' ? (window as any) : null;

  if (win && typeof win.showOpenFilePicker === 'function' && !isRunningInCrossOriginIframe()) {
    try {
      // Omit recycled `id` so Chrome ALWAYS honors `startIn` (e.g. 'downloads' or 'documents') instead of "Recenti"
      const pickerOptions: any = {
        multiple: allowMultiple,
        excludeAcceptAllOption: false,
        startIn,
      };

      let fileHandles: any[] = [];
      try {
        fileHandles = await win.showOpenFilePicker(pickerOptions);
      } catch (err: any) {
        if (err?.name === 'AbortError') throw err;
        if (err instanceof TypeError) {
          fileHandles = await win.showOpenFilePicker({
            multiple: allowMultiple,
            excludeAcceptAllOption: false,
            startIn: 'documents',
          });
        } else {
          throw err;
        }
      }

      if (!fileHandles || fileHandles.length === 0) {
        const abortErr = new Error('Selezione file annullata.');
        (abortErr as any).name = 'AbortError';
        throw abortErr;
      }

      const homePrefix = getDetectedHomePrefix() || '/home/user';
      const parentDir =
        classification && !classification.isDirectHomeRootFile && classification.parentDirPath
          ? classification.parentDirPath
          : homePrefix;

      let primaryResolved: PosixResolvedFile | null = null;

      for (const fh of fileHandles) {
        await ensureHandlePermission(fh, 'read').catch(() => {});
        const file: File = await fh.getFile();

        const isTargetMatch =
          expectedFilename && file.name.toLowerCase() === expectedFilename.toLowerCase();
        const filePosixPath =
          isTargetMatch && normTarget
            ? normTarget
            : fileHandles.length === 1 && normTarget
            ? normTarget
            : `${parentDir.replace(/\/+$/, '')}/${file.name}`;

        await registerBoundFileHandle(filePosixPath, fh, file.name);

        if (isTargetMatch || !primaryResolved) {
          const { content, format } = await decodeFileObject(file);
          addRecentPosixPath({
            posixPath: filePosixPath,
            resolvedRelativePath: file.name,
            filename: file.name,
          });
          primaryResolved = {
            filename: file.name,
            content,
            format,
            posixPath: filePosixPath,
            relativePath: file.name,
            canWriteDisk: true,
          };
        }
      }

      if (primaryResolved) {
        return primaryResolved;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw err;
      }
    }
  }

  // Fallback via temporary <input type="file" multiple> (works in $HOME on all browsers/iframes)
  if (typeof document !== 'undefined') {
    return new Promise<PosixResolvedFile>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = allowMultiple;
      input.style.display = 'none';
      let settled = false;

      input.onchange = async () => {
        settled = true;
        const files = input.files ? Array.from(input.files) : [];
        if (input.parentNode) input.parentNode.removeChild(input);
        if (files.length === 0) {
          const abortErr = new Error('Selezione file annullata.');
          (abortErr as any).name = 'AbortError';
          reject(abortErr);
          return;
        }
        try {
          const homePrefix = getDetectedHomePrefix() || '/home/user';
          const parentDir =
            classification && !classification.isDirectHomeRootFile && classification.parentDirPath
              ? classification.parentDirPath
              : homePrefix;

          let primaryResolved: PosixResolvedFile | null = null;
          let currentMeta = getBoundPosixFilesMeta();

          for (const file of files) {
            const isTargetMatch =
              expectedFilename && file.name.toLowerCase() === expectedFilename.toLowerCase();
            const effectivePosixPath =
              isTargetMatch && normTarget
                ? normTarget
                : files.length === 1 && normTarget
                ? normTarget
                : `${parentDir.replace(/\/+$/, '')}/${file.name}`;

            const eqPaths = getEquivalentHomePaths(effectivePosixPath);
            for (const p of eqPaths) {
              fallbackSingleFilesByPath.set(p, file);
              await idbPut(`${FALLBACK_FILE_PREFIX}${p}`, file).catch(() => {});
            }
            activeHandlesByFilename.set(file.name, {
              handle: null,
              posixPath: effectivePosixPath,
              relativePath: file.name,
            });

            currentMeta = [
              {
                posixPath: effectivePosixPath,
                filename: file.name,
                canWriteDisk: false,
                addedAt: Date.now(),
              },
              ...currentMeta.filter((m) => !eqPaths.includes(m.posixPath)),
            ];

            if (isTargetMatch || !primaryResolved) {
              const { content, format } = await decodeFileObject(file);
              addRecentPosixPath({
                posixPath: effectivePosixPath,
                resolvedRelativePath: file.name,
                filename: file.name,
              });
              primaryResolved = {
                filename: file.name,
                content,
                format,
                posixPath: effectivePosixPath,
                relativePath: file.name,
                canWriteDisk: false,
              };
            }
          }

          saveBoundPosixFilesMeta(currentMeta);
          if (primaryResolved) {
            resolve(primaryResolved);
          } else {
            reject(new Error('Nessun file valido selezionato.'));
          }
        } catch (decodeErr) {
          reject(decodeErr);
        }
      };

      document.body.appendChild(input);
      try {
        input.click();
      } catch (clickErr) {
        if (input.parentNode) input.parentNode.removeChild(input);
        if (!settled) reject(clickErr);
      }
    });
  }

  const err = new Error('NO_ROOT_AUTHORIZED');
  (err as any).code = 'NO_ROOT_AUTHORIZED';
  throw err;
}

// --- Legacy & Primary Root Directory Handle Functions ---

export async function saveRootDirHandle(
  handle: any,
  customBasePrefix?: string,
  targetPosixPath?: string
): Promise<void> {
  await addMountedDirectoryHandle(handle, customBasePrefix, targetPosixPath);
}

export async function getSavedRootDirHandle(): Promise<any | null> {
  await ensureLegacyMountMigrated();
  if (cachedRootDirHandle) return cachedRootDirHandle;
  const mounts = getMountedDirectoriesMeta();
  for (const m of mounts) {
    if (m.mode === 'fs_api') {
      const h = await getDirectoryHandleForMount(m);
      if (h) {
        cachedRootDirHandle = h;
        return h;
      }
    }
  }
  try {
    const handle = await idbGet(ROOT_HANDLE_KEY);
    if (handle) {
      cachedRootDirHandle = handle;
      return handle;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function clearPosixRootAuthorization(): Promise<void> {
  const mounts = getMountedDirectoriesMeta();
  const bound = getBoundPosixFilesMeta();
  cachedRootDirHandle = null;
  cachedDirHandlesById.clear();
  cachedDirPermById.clear();
  cachedFilePermByPath.clear();
  fallbackDirectoryFiles.clear();
  fallbackMountedDirs.clear();
  fallbackMountedIndexes.clear();
  fallbackSingleFilesByPath.clear();
  activeHandlesByPath.clear();
  activeHandlesByFilename.clear();
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  localStorage.removeItem(MOUNTS_META_STORAGE_KEY);
  localStorage.removeItem(BOUND_FILES_META_STORAGE_KEY);
  try {
    await idbDelete(ROOT_HANDLE_KEY);
    for (const m of mounts) {
      await idbDelete(`${DIR_HANDLE_PREFIX}${m.id}`);
      await idbDelete(`${FALLBACK_DIR_PREFIX}${m.id}`);
      const idx = await idbGet(`${FALLBACK_DIR_INDEX_PREFIX}${m.id}`).catch(() => null);
      await idbDelete(`${FALLBACK_DIR_INDEX_PREFIX}${m.id}`);
      if (Array.isArray(idx)) {
        for (const relKey of idx) {
          await idbDelete(`${FALLBACK_DIR_FILE_PREFIX}${m.id}:${relKey}`).catch(() => {});
        }
      }
    }
    for (const bf of bound) {
      const eq = getEquivalentHomePaths(bf.posixPath);
      for (const p of eq) {
        await idbDelete(`${FILE_HANDLE_PREFIX}${p}`);
        await idbDelete(`${FALLBACK_FILE_PREFIX}${p}`);
      }
    }
  } catch {
    // ignore
  }
}

export function getPosixRootConfig(): PosixRootConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PosixRootConfig;
      return parsed;
    }
  } catch {
    // ignore
  }
  return { rootName: '', basePrefix: '', mode: 'none' };
}

export function savePosixRootConfig(config: PosixRootConfig): void {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function getRecentPosixPaths(): RecentPosixEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_PATHS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as RecentPosixEntry[];
    }
  } catch {
    // ignore
  }
  return [];
}

export function addRecentPosixPath(entry: Omit<RecentPosixEntry, 'lastOpened'>): void {
  const list = getRecentPosixPaths().filter((item) => item.posixPath !== entry.posixPath);
  list.unshift({ ...entry, lastOpened: Date.now() });
  localStorage.setItem(RECENT_PATHS_STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
}

export function removeRecentPosixPath(posixPath: string): void {
  const list = getRecentPosixPaths().filter((item) => item.posixPath !== posixPath);
  localStorage.setItem(RECENT_PATHS_STORAGE_KEY, JSON.stringify(list));
}

export function registerFallbackDirectoryFiles(
  fileList: FileList | File[],
  customBasePrefix?: string,
  targetPosixPath?: string
): PosixRootConfig {
  let detectedRootName = '';
  const files = Array.from(fileList);
  const dirMap = new Map<string, File>();
  const indexKeys: string[] = [];

  for (const file of files) {
    const rel = (file as any).webkitRelativePath || file.name;
    const parts = rel.split('/').filter(Boolean);
    if (!detectedRootName && parts.length > 1) {
      detectedRootName = parts[0];
    }
    // Index ONLY text, source code, Markdown, config/dotfiles, and DOCX files (NO size limit!)
    // Binary/media/archive files are skipped to prevent RAM & IndexedDB bloat.
    if (!isIndexableTextOrCodeFile(file)) {
      continue;
    }
    const innerRel = parts.length > 1 ? parts.slice(1).join('/') : parts.join('/');
    fallbackDirectoryFiles.set(innerRel, file);
    dirMap.set(innerRel, file);
    indexKeys.push(innerRel);
  }

  const prev = getPosixRootConfig();
  const classification = targetPosixPath ? classifyPosixTargetPath(targetPosixPath) : null;
  const rootName = detectedRootName || classification?.parentDirName || prev.rootName || 'root';
  const basePrefix = inferMountBasePrefix(rootName, customBasePrefix, targetPosixPath);

  const mountId = `fallback_${sanitizeIdFragment(basePrefix || rootName)}`;
  fallbackMountedDirs.set(mountId, dirMap);
  fallbackMountedIndexes.set(mountId, indexKeys);

  // Store lightweight string[] index + per-file lazy IDB records (never a single monolithic blob array!)
  (async () => {
    try {
      await idbDelete(`${FALLBACK_DIR_PREFIX}${mountId}`).catch(() => {});
      await idbPut(`${FALLBACK_DIR_INDEX_PREFIX}${mountId}`, indexKeys);
      for (const [innerRel, f] of dirMap.entries()) {
        await idbPut(`${FALLBACK_DIR_FILE_PREFIX}${mountId}:${innerRel}`, f).catch(() => {});
      }
    } catch {
      // ignore storage errors
    }
  })();

  const existingMounts = getMountedDirectoriesMeta().filter(
    (m) =>
      m.id !== mountId &&
      !(
        m.name.toLowerCase() === rootName.toLowerCase() &&
        (!m.basePrefix || !basePrefix || m.basePrefix.toLowerCase() === basePrefix.toLowerCase())
      )
  );
  saveMountedDirectoriesMeta([
    {
      id: mountId,
      name: rootName,
      basePrefix,
      mode: 'fallback',
      indexedFileCount: dirMap.size,
      addedAt: Date.now(),
    },
    ...existingMounts,
  ]);

  const config: PosixRootConfig = {
    rootName,
    basePrefix,
    mode: 'fallback',
    indexedFileCount: dirMap.size,
  };
  savePosixRootConfig(config);
  return config;
}

export function hasFallbackFilesInMemory(): boolean {
  return (
    fallbackDirectoryFiles.size > 0 ||
    fallbackMountedDirs.size > 0 ||
    fallbackMountedIndexes.size > 0 ||
    fallbackSingleFilesByPath.size > 0
  );
}

export function hasAnyPosixAuthorization(): boolean {
  const cfg = getPosixRootConfig();
  const mounts = getMountedDirectoriesMeta();
  const bound = getBoundPosixFilesMeta();
  return (
    cfg.mode === 'fs_api' ||
    mounts.length > 0 ||
    bound.length > 0 ||
    hasFallbackFilesInMemory()
  );
}

export function normalizePosixPath(raw: string): string {
  let cleaned = (raw || '').trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  if (cleaned.startsWith('file://')) {
    try {
      cleaned = decodeURIComponent(cleaned.replace(/^file:\/\/(localhost)?/, ''));
    } catch {
      cleaned = cleaned.replace(/^file:\/\/(localhost)?/, '');
    }
  }
  cleaned = cleaned.replace(/\\ /g, ' ');
  cleaned = cleaned.replace(/\\/g, '/');
  cleaned = cleaned.replace(/^\$\{?HOME\}?(?=\/|$)/, '~');

  const isHome = cleaned.startsWith('~/') || cleaned === '~';
  const isAbs = cleaned.startsWith('/');
  const rawSegments = cleaned.replace(/^~\//, '').split('/');
  const resolved: string[] = [];

  for (const seg of rawSegments) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      resolved.pop();
    } else {
      resolved.push(seg);
    }
  }

  if (isHome) {
    return '~/' + resolved.join('/');
  }
  if (isAbs) {
    return '/' + resolved.join('/');
  }
  return resolved.join('/');
}

export function detectFileFormatFromName(filename: string): FileFormat {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const formatMap: Record<string, FileFormat> = {
    txt: 'txt',
    md: 'md',
    markdown: 'md',
    docx: 'docx',
    json: 'json',
    xml: 'xml',
    svg: 'svg',
    py: 'py',
    kt: 'kt',
    js: 'js',
    jsx: 'js',
    ts: 'ts',
    tsx: 'ts',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    bashrc: 'bash',
    zshrc: 'bash',
    profile: 'bash',
    tex: 'tex',
    java: 'java',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    hpp: 'cpp',
    cc: 'cpp',
    ly: 'ly',
    lilypond: 'ly',
    html: 'html',
    htm: 'html',
    css: 'css',
    sql: 'sql',
    rs: 'rs',
    go: 'go',
  };
  return formatMap[ext] || 'txt';
}

async function decodeFileObject(file: File): Promise<{ content: string; format: FileFormat }> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const markdown = convertGoogleDocsHtmlToMarkdown(result.value);
    return { content: sanitizeText(markdown), format: 'docx' };
  }
  const text = await file.text();
  return { content: sanitizeText(text), format: detectFileFormatFromName(file.name) };
}

const XDG_FOLDER_ALIASES: Record<string, string[]> = {
  scaricati: ['scaricati', 'downloads', 'download'],
  downloads: ['scaricati', 'downloads', 'download'],
  download: ['scaricati', 'downloads', 'download'],
  documenti: ['documenti', 'documents', 'docs'],
  documents: ['documenti', 'documents', 'docs'],
  scrivania: ['scrivania', 'desktop'],
  desktop: ['scrivania', 'desktop'],
  immagini: ['immagini', 'pictures', 'photos', 'foto'],
  pictures: ['immagini', 'pictures', 'photos', 'foto'],
  musica: ['musica', 'music'],
  music: ['musica', 'music'],
  video: ['video', 'videos', 'filmati'],
  videos: ['video', 'videos', 'filmati'],
};

function folderNamesMatch(a: string, b: string): boolean {
  const la = (a || '').trim().toLowerCase();
  const lb = (b || '').trim().toLowerCase();
  if (!la || !lb) return false;
  if (la === lb) return true;
  const aliases = XDG_FOLDER_ALIASES[la];
  return Boolean(aliases && aliases.includes(lb));
}

export function computeRelativeCandidates(
  posixPath: string,
  rootName: string,
  basePrefix: string,
  strictMountMatch = false
): string[] {
  const norm = normalizePosixPath(posixPath);
  detectAndSaveHomePrefix(norm);

  const candidates: string[] = [];
  const addCandidate = (c: string) => {
    const trimmed = c.replace(/^\/+/, '').replace(/\/+$/, '');
    if (trimmed && !candidates.includes(trimmed)) {
      candidates.push(trimmed);
    }
  };

  const equivPaths = getEquivalentHomePaths(norm);

  if (basePrefix.trim()) {
    const normBases = getEquivalentHomePaths(normalizePosixPath(basePrefix).replace(/\/+$/, ''));
    for (const p of equivPaths) {
      for (const nb of normBases) {
        if (nb && p.startsWith(nb + '/')) {
          addCandidate(p.slice(nb.length + 1));
        } else if (nb && p.toLowerCase().startsWith(nb.toLowerCase() + '/')) {
          addCandidate(p.slice(nb.length + 1));
        }
      }
    }
  }

  for (const p of equivPaths) {
    const segments = p.split('/').filter(Boolean);
    if (rootName) {
      for (let i = 0; i < segments.length - 1; i++) {
        if (folderNamesMatch(segments[i], rootName)) {
          addCandidate(segments.slice(i + 1).join('/'));

          if (p.startsWith('/')) {
            const learnedPrefix = '/' + segments.slice(0, i + 1).join('/');
            autoUpdateMountBasePrefix(rootName, learnedPrefix);
          }
        }
      }
    }
  }

  if (strictMountMatch) {
    return candidates;
  }

  if (!norm.startsWith('/') && !norm.startsWith('~/')) {
    addCandidate(norm);
  }

  // Non-strict pass: also check trailing subpath and filename so mounted parent/ancestor folders always resolve
  const normSegments = norm.split('/').filter(Boolean);
  if (normSegments.length >= 2) {
    addCandidate(normSegments.slice(-2).join('/'));
  }
  if (normSegments.length >= 1) {
    addCandidate(normSegments[normSegments.length - 1]);
  }

  return candidates;
}

export function getPosixPathCoverageInfo(rawPath: string): {
  isCovered: boolean;
  coveredByMount?: MountedPosixDirectoryMeta;
  coveredByBoundFile?: BoundPosixFileMeta;
  classification: PosixTargetClassification;
} {
  const classification = classifyPosixTargetPath(rawPath);
  const { normPath } = classification;
  const eqPaths = getEquivalentHomePaths(normPath);

  const boundList = getBoundPosixFilesMeta();
  for (const bf of boundList) {
    const bfEq = getEquivalentHomePaths(bf.posixPath);
    if (bfEq.some((p) => eqPaths.some((ep) => ep.toLowerCase() === p.toLowerCase()))) {
      return { isCovered: true, coveredByBoundFile: bf, classification };
    }
  }

  const mounts = getMountedDirectoriesMeta();
  for (const m of mounts) {
    const strictCandidates = computeRelativeCandidates(normPath, m.name, m.basePrefix, true);
    if (strictCandidates.length > 0) {
      return { isCovered: true, coveredByMount: m, classification };
    }
    if (folderNamesMatch(m.name, classification.parentDirName)) {
      return { isCovered: true, coveredByMount: m, classification };
    }
  }

  return { isCovered: false, classification };
}

function autoUpdateMountBasePrefix(dirName: string, learnedPrefix: string): void {
  try {
    const raw = localStorage.getItem(MOUNTS_META_STORAGE_KEY);
    if (!raw) return;
    const mounts = JSON.parse(raw) as MountedPosixDirectoryMeta[];
    if (!Array.isArray(mounts)) return;
    let updated = false;
    const nextMounts = mounts.map((m) => {
      if (folderNamesMatch(m.name, dirName) && !m.basePrefix) {
        updated = true;
        return { ...m, basePrefix: learnedPrefix };
      }
      return m;
    });
    if (updated) {
      saveMountedDirectoriesMeta(nextMounts);
    }
  } catch {
    // ignore
  }
}

async function queryHandlePermissionFast(
  handle: any,
  mode: 'read' | 'readwrite' = 'read'
): Promise<'granted' | 'prompt' | 'denied'> {
  if (!handle) return 'denied';
  try {
    if (typeof handle.queryPermission === 'function') {
      return await handle.queryPermission({ mode });
    }
    return 'granted';
  } catch {
    return 'denied';
  }
}

export async function ensureHandlePermission(
  handle: any,
  mode: 'read' | 'readwrite' = 'read'
): Promise<boolean> {
  if (!handle) return false;
  try {
    if (typeof handle.queryPermission === 'function') {
      const perm = await handle.queryPermission({ mode });
      if (perm === 'granted') return true;
    }
    if (typeof handle.requestPermission === 'function') {
      const perm = await handle.requestPermission({ mode });
      return perm === 'granted';
    }
    return true;
  } catch {
    return false;
  }
}

async function traverseDirectoryForFile(
  rootHandle: any,
  relativePath: string,
  createIfMissing = false
): Promise<any | null> {
  const parts = relativePath.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  let currentDir = rootHandle;
  for (let i = 0; i < parts.length - 1; i++) {
    try {
      currentDir = await currentDir.getDirectoryHandle(parts[i], { create: createIfMissing });
    } catch {
      return null;
    }
  }

  const fileName = parts[parts.length - 1];
  try {
    return await currentDir.getFileHandle(fileName, { create: createIfMissing });
  } catch {
    return null;
  }
}

/**
 * Lazily retrieves a single requested File from a fallback mount (in-memory or on-demand from IndexedDB)
 * without ever loading the entire folder's File blobs into RAM!
 */
async function getLazyFallbackFileForMount(
  meta: MountedPosixDirectoryMeta,
  candidates: string[]
): Promise<{ relKey: string; fileObj: File } | null> {
  // 1. Check in-memory session map first (O(1) / fast)
  const memMap = fallbackMountedDirs.get(meta.id);
  if (memMap) {
    for (const candidate of candidates) {
      if (memMap.has(candidate)) {
        return { relKey: candidate, fileObj: memMap.get(candidate)! };
      }
      const candLower = candidate.toLowerCase();
      for (const [relKey, fileObj] of memMap.entries()) {
        if (relKey.toLowerCase() === candLower) {
          return { relKey, fileObj };
        }
      }
    }
  }

  // 2. Check lightweight string[] path index and load ONLY the single matching File from IndexedDB
  let indexKeys = fallbackMountedIndexes.get(meta.id);
  if (!indexKeys) {
    const storedIdx = await idbGet(`${FALLBACK_DIR_INDEX_PREFIX}${meta.id}`).catch(() => null);
    if (Array.isArray(storedIdx)) {
      indexKeys = storedIdx;
      fallbackMountedIndexes.set(meta.id, indexKeys);
    }
  }

  if (indexKeys && indexKeys.length > 0) {
    for (const candidate of candidates) {
      const candLower = candidate.toLowerCase();
      const matchedKey = indexKeys.find((k) => k === candidate || k.toLowerCase() === candLower);
      if (matchedKey) {
        const fileObj = (await idbGet(`${FALLBACK_DIR_FILE_PREFIX}${meta.id}:${matchedKey}`).catch(() => null)) as File | null;
        if (fileObj) {
          return { relKey: matchedKey, fileObj };
        }
      }
    }
  }

  // 3. Backward-compatibility fallback for legacy monolithic `fallback_dir:<id>` records
  //    (migrates on read to lazy index and deletes monolithic blob array!)
  try {
    const legacyEntries = await idbGet(`${FALLBACK_DIR_PREFIX}${meta.id}`);
    if (Array.isArray(legacyEntries) && legacyEntries.length > 0) {
      const filteredKeys: string[] = [];
      let matched: { relKey: string; fileObj: File } | null = null;
      for (const [relKey, fileObj] of legacyEntries as Array<[string, File]>) {
        if (!fileObj || !isIndexableTextOrCodeFile(fileObj)) continue;
        filteredKeys.push(relKey);
        if (!matched) {
          const rkLower = relKey.toLowerCase();
          if (candidates.some((c) => c === relKey || c.toLowerCase() === rkLower)) {
            matched = { relKey, fileObj };
          }
        }
      }
      fallbackMountedIndexes.set(meta.id, filteredKeys);
      // Migrate asynchronously in background so RAM stays clean next reload
      (async () => {
        try {
          await idbPut(`${FALLBACK_DIR_INDEX_PREFIX}${meta.id}`, filteredKeys);
          for (const [relKey, fileObj] of legacyEntries as Array<[string, File]>) {
            if (fileObj && isIndexableTextOrCodeFile(fileObj)) {
              await idbPut(`${FALLBACK_DIR_FILE_PREFIX}${meta.id}:${relKey}`, fileObj).catch(() => {});
            }
          }
          await idbDelete(`${FALLBACK_DIR_PREFIX}${meta.id}`).catch(() => {});
        } catch {}
      })();
      if (matched) return matched;
    }
  } catch {
    // ignore
  }

  return null;
}

export async function resolveAndReadPosixFile(
  rawPath: string,
  _options?: { autoPromptFilePicker?: boolean }
): Promise<PosixResolvedFile> {
  const normPath = normalizePosixPath(rawPath);
  if (!normPath) {
    throw new Error('Percorso POSIX vuoto o non valido.');
  }

  await ensureLegacyMountMigrated();
  detectAndSaveHomePrefix(normPath);
  const eqPaths = getEquivalentHomePaths(normPath);

  // 1. Check bound single/multi-file handles in memory or IndexedDB
  const boundHandle = await getSavedBoundFileHandle(normPath);
  if (boundHandle) {
    const hasPerm = await ensureHandlePermission(boundHandle, 'read');
    if (hasPerm) {
      for (const eq of eqPaths) {
        cachedFilePermByPath.set(eq, 'granted');
      }
      const file: File = await boundHandle.getFile();
      const { content, format } = await decodeFileObject(file);
      activeHandlesByFilename.set(file.name, {
        handle: boundHandle,
        posixPath: normPath,
        relativePath: file.name,
      });
      addRecentPosixPath({
        posixPath: normPath,
        resolvedRelativePath: file.name,
        filename: file.name,
      });
      return {
        filename: file.name,
        content,
        format,
        posixPath: normPath,
        relativePath: file.name,
        canWriteDisk: true,
      };
    }
  }

  // Check fallback bound single files in memory or IndexedDB
  for (const p of eqPaths) {
    let fallbackFile = fallbackSingleFilesByPath.get(p);
    if (!fallbackFile) {
      fallbackFile = (await idbGet(`${FALLBACK_FILE_PREFIX}${p}`).catch(() => null)) || undefined;
      if (fallbackFile) fallbackSingleFilesByPath.set(p, fallbackFile);
    }
    if (fallbackFile) {
      const { content, format } = await decodeFileObject(fallbackFile);
      activeHandlesByFilename.set(fallbackFile.name, {
        handle: null,
        posixPath: normPath,
        relativePath: fallbackFile.name,
      });
      addRecentPosixPath({
        posixPath: normPath,
        resolvedRelativePath: fallbackFile.name,
        filename: fallbackFile.name,
      });
      return {
        filename: fallbackFile.name,
        content,
        format,
        posixPath: normPath,
        relativePath: fallbackFile.name,
        canWriteDisk: false,
      };
    }
  }

  // 2. Search across ALL mounted directories (FS API)
  const mounts = getMountedDirectoriesMeta();
  const fsMounts: Array<{
    meta: MountedPosixDirectoryMeta;
    handle: any;
    name: string;
    basePrefix: string;
    permState: 'granted' | 'prompt' | 'denied';
  }> = [];

  for (const m of mounts) {
    if (m.mode === 'fs_api') {
      const h = await getDirectoryHandleForMount(m);
      if (h) {
        const permState = await queryHandlePermissionFast(h, 'read');
        cachedDirPermById.set(m.id, permState);
        fsMounts.push({
          meta: m,
          handle: h,
          name: h.name || m.name,
          basePrefix: m.basePrefix || '',
          permState,
        });
      }
    }
  }

  let mountNeedingReauth: { id: string; name: string } | null = null;

  for (const strictPass of [true, false]) {
    const orderedMounts = [...fsMounts].sort((a, b) => {
      if (a.permState === 'granted' && b.permState !== 'granted') return -1;
      if (a.permState !== 'granted' && b.permState === 'granted') return 1;
      return 0;
    });

    for (const mount of orderedMounts) {
      const candidates = computeRelativeCandidates(
        normPath,
        mount.name,
        mount.basePrefix,
        strictPass
      );
      if (candidates.length === 0) continue;

      if (mount.permState !== 'granted') {
        const granted = await ensureHandlePermission(mount.handle, 'read');
        if (!granted) {
          if (strictPass && !mountNeedingReauth) {
            mountNeedingReauth = { id: mount.meta.id, name: mount.name };
          }
          continue;
        }
        mount.permState = 'granted';
        cachedDirPermById.set(mount.meta.id, 'granted');
      }

      for (const candidate of candidates) {
        const fileHandle = await traverseDirectoryForFile(mount.handle, candidate, false);
        if (fileHandle) {
          const file: File = await fileHandle.getFile();
          const { content, format } = await decodeFileObject(file);
          for (const p of eqPaths) {
            activeHandlesByPath.set(p, fileHandle);
            cachedFilePermByPath.set(p, 'granted');
          }
          activeHandlesByFilename.set(file.name, {
            handle: fileHandle,
            posixPath: normPath,
            relativePath: candidate,
          });
          addRecentPosixPath({
            posixPath: normPath,
            resolvedRelativePath: candidate,
            filename: file.name,
          });
          return {
            filename: file.name,
            content,
            format,
            posixPath: normPath,
            relativePath: candidate,
            canWriteDisk: true,
            mountedDirName: mount.name,
          };
        }
      }
    }
  }

  // 3. Try Universal/Fallback Mounted Directories LAZILY (zero bulk RAM loading!)
  for (const strictPass of [true, false]) {
    for (const m of mounts) {
      if (m.mode === 'fallback') {
        const candidates = computeRelativeCandidates(normPath, m.name, m.basePrefix, strictPass);
        if (candidates.length === 0) continue;
        const found = await getLazyFallbackFileForMount(m, candidates);
        if (found) {
          const { relKey, fileObj } = found;
          const { content, format } = await decodeFileObject(fileObj);
          activeHandlesByFilename.set(fileObj.name, {
            handle: null,
            posixPath: normPath,
            relativePath: relKey,
          });
          addRecentPosixPath({
            posixPath: normPath,
            resolvedRelativePath: relKey,
            filename: fileObj.name,
          });
          return {
            filename: fileObj.name,
            content,
            format,
            posixPath: normPath,
            relativePath: relKey,
            canWriteDisk: false,
            mountedDirName: m.name,
          };
        }
      }
    }
  }

  // Also check in-memory fallbackDirectoryFiles if populated in current session
  if (fallbackDirectoryFiles.size > 0) {
    const classification = classifyPosixTargetPath(normPath);
    const targetNameLower = classification.filename.toLowerCase();
    for (const [relKey, fileObj] of fallbackDirectoryFiles.entries()) {
      if (
        relKey.toLowerCase() === normPath.toLowerCase() ||
        fileObj.name.toLowerCase() === targetNameLower
      ) {
        const { content, format } = await decodeFileObject(fileObj);
        activeHandlesByFilename.set(fileObj.name, {
          handle: null,
          posixPath: normPath,
          relativePath: relKey,
        });
        addRecentPosixPath({
          posixPath: normPath,
          resolvedRelativePath: relKey,
          filename: fileObj.name,
        });
        return {
          filename: fileObj.name,
          content,
          format,
          posixPath: normPath,
          relativePath: relKey,
          canWriteDisk: false,
        };
      }
    }
  }

  // 4. If a matching mounted folder needs 1-click permission re-activation after reload,
  //    report PERMISSION_REAUTH_NEEDED so PosixPathModal offers a 1-click inline reauth button (ZERO "Recenti"!)
  if (mountNeedingReauth) {
    const err = new Error(
      `La cartella "${mountNeedingReauth.name}" è già montata ma richiede 1 clic per riattivare il permesso di lettura in questa sessione.`
    );
    (err as any).code = 'PERMISSION_REAUTH_NEEDED';
    (err as any).mountId = mountNeedingReauth.id;
    (err as any).mountName = mountNeedingReauth.name;
    (err as any).posixPath = normPath;
    throw err;
  }

  // Never auto-open the browser's directory picker from resolveAndReadPosixFile!
  const cov = getPosixPathCoverageInfo(normPath);
  if (cov.isCovered && cov.coveredByMount) {
    throw new Error(
      `Il file "${cov.classification.filename}" non è stato trovato all'interno della cartella montata "${cov.coveredByMount.name}".`
    );
  }

  const err = new Error('NO_ROOT_AUTHORIZED');
  (err as any).code = 'NO_ROOT_AUTHORIZED';
  (err as any).posixPath = normPath;
  throw err;
}

export async function writePosixFile(
  targetPathOrFilename: string,
  content: string
): Promise<{ writtenToDisk: boolean; posixPath: string; filename: string }> {
  await ensureLegacyMountMigrated();
  const normTarget = normalizePosixPath(targetPathOrFilename);

  let fileHandle = await getSavedBoundFileHandle(normTarget);
  let resolvedPosixPath = normTarget;
  let resolvedFilename = normTarget.split('/').filter(Boolean).pop() || targetPathOrFilename;

  if (!fileHandle && activeHandlesByFilename.has(targetPathOrFilename)) {
    const info = activeHandlesByFilename.get(targetPathOrFilename)!;
    fileHandle = info.handle || (await getSavedBoundFileHandle(info.posixPath));
    resolvedPosixPath = info.posixPath;
    resolvedFilename = targetPathOrFilename;
  }

  if (!fileHandle) {
    const mounts = getMountedDirectoriesMeta();
    const fsMounts: Array<{ handle: any; name: string; basePrefix: string }> = [];
    for (const m of mounts) {
      if (m.mode === 'fs_api') {
        const h = await getDirectoryHandleForMount(m);
        if (h) fsMounts.push({ handle: h, name: h.name || m.name, basePrefix: m.basePrefix || '' });
      }
    }

    for (const strictPass of [true, false]) {
      for (const mount of fsMounts) {
        const candidates = computeRelativeCandidates(
          resolvedPosixPath,
          mount.name,
          mount.basePrefix,
          strictPass
        );
        if (candidates.length === 0) continue;

        const hasWrite = await ensureHandlePermission(mount.handle, 'readwrite');
        if (!hasWrite) continue;

        for (const candidate of candidates) {
          const existing = await traverseDirectoryForFile(mount.handle, candidate, false);
          if (existing) {
            fileHandle = existing;
            break;
          }
        }
        if (fileHandle) break;
      }
      if (fileHandle) break;
    }

    if (!fileHandle && fsMounts.length > 0) {
      for (const mount of fsMounts) {
        const candidates = computeRelativeCandidates(
          resolvedPosixPath,
          mount.name,
          mount.basePrefix,
          true
        );
        if (candidates.length > 0) {
          const hasWrite = await ensureHandlePermission(mount.handle, 'readwrite');
          if (hasWrite) {
            fileHandle = await traverseDirectoryForFile(mount.handle, candidates[0], true);
            if (fileHandle) break;
          }
        }
      }
    }
  }

  if (fileHandle && typeof fileHandle.createWritable === 'function') {
    const hasWritePerm = await ensureHandlePermission(fileHandle, 'readwrite');
    if (hasWritePerm) {
      const writable = await fileHandle.createWritable();
      if (resolvedFilename.toLowerCase().endsWith('.docx')) {
        const docxBlob = await createDocxBlob(content);
        await writable.write(docxBlob);
      } else {
        await writable.write(content);
      }
      await writable.close();

      await registerBoundFileHandle(resolvedPosixPath, fileHandle, resolvedFilename);

      return {
        writtenToDisk: true,
        posixPath: resolvedPosixPath,
        filename: resolvedFilename,
      };
    }
  }

  return {
    writtenToDisk: false,
    posixPath: resolvedPosixPath,
    filename: resolvedFilename,
  };
}

export function getActivePosixInfoForFilename(filename: string): { posixPath: string; canWriteDisk: boolean } | null {
  const entry = activeHandlesByFilename.get(filename);
  if (!entry) return null;
  return {
    posixPath: entry.posixPath,
    canWriteDisk: Boolean(entry.handle && typeof entry.handle.createWritable === 'function'),
  };
}
