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
}

const DB_NAME = 'livia_posix_fs_db';
const STORE_NAME = 'handles';
const ROOT_HANDLE_KEY = 'root_dir_handle';
const DIR_HANDLE_PREFIX = 'dir_mount:';
const FILE_HANDLE_PREFIX = 'file_bind:';

const CONFIG_STORAGE_KEY = 'livia_posix_root_config';
const MOUNTS_META_STORAGE_KEY = 'livia_posix_dir_mounts_meta';
const BOUND_FILES_META_STORAGE_KEY = 'livia_posix_bound_files_meta';
const DETECTED_HOME_STORAGE_KEY = 'livia_posix_detected_home';
const RECENT_PATHS_STORAGE_KEY = 'livia_posix_recent_paths';

// Active file handles in memory mapped by normalized POSIX path and by filename
const activeHandlesByPath = new Map<string, any>();
const activeHandlesByFilename = new Map<string, { handle: any; posixPath: string; relativePath: string }>();

// Fallback in-memory files for single-file or directory inputs when File System Access API is unavailable
const fallbackSingleFilesByPath = new Map<string, File>();
const fallbackDirectoryFiles = new Map<string, File>();
const fallbackMountedDirs = new Map<string, Map<string, File>>();

let cachedRootDirHandle: any = null;
const cachedDirHandlesById = new Map<string, any>();

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

// --- Multi-Directory Mounts Management ---

export function getMountedDirectoriesMeta(): MountedPosixDirectoryMeta[] {
  try {
    const raw = localStorage.getItem(MOUNTS_META_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw) as MountedPosixDirectoryMeta[];
      if (Array.isArray(list)) return list;
    }
  } catch {
    // ignore
  }

  // Backward-compatible migration from legacy single PosixRootConfig
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
  customBasePrefix?: string
): Promise<MountedPosixDirectoryMeta> {
  const dirName = handle.name || 'folder';
  const homePrefix = getDetectedHomePrefix();
  const inferredPrefix =
    customBasePrefix?.trim() ||
    (homePrefix ? `${homePrefix}/${dirName}` : '');

  const id = `mount_${dirName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
  cachedDirHandlesById.set(id, handle);
  cachedRootDirHandle = handle;

  try {
    await idbPut(`${DIR_HANDLE_PREFIX}${id}`, handle);
    await idbPut(ROOT_HANDLE_KEY, handle);
  } catch (err) {
    console.warn('Could not persist DirectoryHandle to IndexedDB:', err);
  }

  const currentList = getMountedDirectoriesMeta().filter(
    (m) => m.id !== id && m.name.toLowerCase() !== dirName.toLowerCase()
  );
  const newMeta: MountedPosixDirectoryMeta = {
    id,
    name: dirName,
    basePrefix: inferredPrefix,
    mode: 'fs_api',
    addedAt: Date.now(),
  };
  const updatedList = [newMeta, ...currentList];
  saveMountedDirectoriesMeta(updatedList);

  // Sync primary legacy config as well
  savePosixRootConfig({
    rootName: dirName,
    basePrefix: inferredPrefix,
    mode: 'fs_api',
  });

  return newMeta;
}

export async function removeMountedDirectory(id: string): Promise<void> {
  cachedDirHandlesById.delete(id);
  fallbackMountedDirs.delete(id);
  try {
    await idbDelete(`${DIR_HANDLE_PREFIX}${id}`);
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
    if (meta.id === 'legacy_root') {
      return await getSavedRootDirHandle();
    }
  } catch {
    // ignore
  }
  return null;
}

// --- Direct Single-File Handle Binding ($HOME & Arbitrary Files) ---

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
    localStorage.setItem(BOUND_FILES_META_STORAGE_KEY, JSON.stringify(list.slice(0, 100)));
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

  // Also check if filename matches a bound file in $HOME when user types ~/filename or /home/user/filename
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
    // If both are top-level in $HOME (e.g. ~/note.md and /home/mario/note.md)
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
 * Opens the browser's single-file selector (`showOpenFilePicker` or `<input type="file">`),
 * which has NO browser restriction on `$HOME` (`/home/user`), binds the selected file
 * permanently to the target POSIX path in IndexedDB, and returns the decoded file.
 */
export async function promptAndBindSinglePosixFile(
  rawTargetPath?: string
): Promise<PosixResolvedFile> {
  const normTarget = rawTargetPath ? normalizePosixPath(rawTargetPath) : '';
  if (normTarget) {
    detectAndSaveHomePrefix(normTarget);
  }
  const expectedFilename = normTarget ? normTarget.split('/').filter(Boolean).pop() || '' : '';
  const ext = expectedFilename.includes('.')
    ? expectedFilename.split('.').pop()?.toLowerCase() || ''
    : '';

  const win = typeof window !== 'undefined' ? (window as any) : null;

  if (win && typeof win.showOpenFilePicker === 'function') {
    try {
      const pickerOptions: any = {
        multiple: false,
        excludeAcceptAllOption: false,
      };
      if (ext && /^[a-z0-9]{1,10}$/i.test(ext)) {
        pickerOptions.types = [
          {
            description: expectedFilename ? `File (${expectedFilename})` : `File .${ext}`,
            accept: {
              'text/plain': [`.${ext}`],
            },
          },
        ];
      }

      const [fileHandle] = await win.showOpenFilePicker(pickerOptions);
      if (!fileHandle) {
        const abortErr = new Error('Selezione file annullata.');
        (abortErr as any).name = 'AbortError';
        throw abortErr;
      }

      // Request readwrite permission immediately while user activation is active so :w works seamlessly
      await ensureHandlePermission(fileHandle, 'readwrite').catch(() => {});

      const file: File = await fileHandle.getFile();
      const homePrefix = getDetectedHomePrefix() || '/home/user';
      const effectivePosixPath =
        normTarget || `${homePrefix}/${file.name}`;

      await registerBoundFileHandle(effectivePosixPath, fileHandle, file.name);
      const { content, format } = await decodeFileObject(file);

      addRecentPosixPath({
        posixPath: effectivePosixPath,
        resolvedRelativePath: file.name,
        filename: file.name,
      });

      return {
        filename: file.name,
        content,
        format,
        posixPath: effectivePosixPath,
        relativePath: file.name,
        canWriteDisk: true,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw err;
      }
      // If showOpenFilePicker failed due to lack of user gesture or iframe restriction, fall through to <input type="file">
    }
  }

  // Fallback via temporary <input type="file"> (works in $HOME on all browsers/OS)
  if (typeof document !== 'undefined') {
    return new Promise<PosixResolvedFile>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';
      if (ext && /^[a-z0-9]{1,10}$/i.test(ext)) {
        input.accept = `.${ext},text/*,*/*`;
      }
      let settled = false;

      input.onchange = async () => {
        settled = true;
        const file = input.files?.[0];
        if (input.parentNode) input.parentNode.removeChild(input);
        if (!file) {
          const abortErr = new Error('Selezione file annullata.');
          (abortErr as any).name = 'AbortError';
          reject(abortErr);
          return;
        }
        try {
          const homePrefix = getDetectedHomePrefix() || '/home/user';
          const effectivePosixPath = normTarget || `${homePrefix}/${file.name}`;
          const eqPaths = getEquivalentHomePaths(effectivePosixPath);
          for (const p of eqPaths) {
            fallbackSingleFilesByPath.set(p, file);
          }
          activeHandlesByFilename.set(file.name, {
            handle: null,
            posixPath: effectivePosixPath,
            relativePath: file.name,
          });

          const existingMeta = getBoundPosixFilesMeta().filter(
            (m) => !eqPaths.includes(m.posixPath)
          );
          saveBoundPosixFilesMeta([
            {
              posixPath: effectivePosixPath,
              filename: file.name,
              canWriteDisk: false,
              addedAt: Date.now(),
            },
            ...existingMeta,
          ]);

          const { content, format } = await decodeFileObject(file);
          addRecentPosixPath({
            posixPath: effectivePosixPath,
            resolvedRelativePath: file.name,
            filename: file.name,
          });

          resolve({
            filename: file.name,
            content,
            format,
            posixPath: effectivePosixPath,
            relativePath: file.name,
            canWriteDisk: false,
          });
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

export async function saveRootDirHandle(handle: any, customBasePrefix?: string): Promise<void> {
  await addMountedDirectoryHandle(handle, customBasePrefix);
}

export async function getSavedRootDirHandle(): Promise<any | null> {
  if (cachedRootDirHandle) return cachedRootDirHandle;
  try {
    const handle = await idbGet(ROOT_HANDLE_KEY);
    if (handle) {
      cachedRootDirHandle = handle;
      return handle;
    }
  } catch {
    // ignore
  }
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
  return null;
}

export async function clearPosixRootAuthorization(): Promise<void> {
  const mounts = getMountedDirectoriesMeta();
  cachedRootDirHandle = null;
  cachedDirHandlesById.clear();
  fallbackDirectoryFiles.clear();
  fallbackMountedDirs.clear();
  fallbackSingleFilesByPath.clear();
  activeHandlesByPath.clear();
  activeHandlesByFilename.clear();
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  localStorage.removeItem(MOUNTS_META_STORAGE_KEY);
  try {
    await idbDelete(ROOT_HANDLE_KEY);
    for (const m of mounts) {
      await idbDelete(`${DIR_HANDLE_PREFIX}${m.id}`);
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
      if (parsed.mode === 'fallback' && fallbackDirectoryFiles.size === 0 && fallbackMountedDirs.size === 0) {
        return { ...parsed, indexedFileCount: 0 };
      }
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

export function registerFallbackDirectoryFiles(fileList: FileList | File[], customBasePrefix?: string): PosixRootConfig {
  let detectedRootName = '';
  const files = Array.from(fileList);
  const dirMap = new Map<string, File>();

  for (const file of files) {
    const rel = (file as any).webkitRelativePath || file.name;
    const parts = rel.split('/').filter(Boolean);
    if (!detectedRootName && parts.length > 1) {
      detectedRootName = parts[0];
    }
    const innerRel = parts.length > 1 ? parts.slice(1).join('/') : parts.join('/');
    fallbackDirectoryFiles.set(innerRel, file);
    dirMap.set(innerRel, file);
  }

  const prev = getPosixRootConfig();
  const rootName = detectedRootName || prev.rootName || 'root';
  const homePrefix = getDetectedHomePrefix();
  const basePrefix =
    customBasePrefix !== undefined && customBasePrefix.trim()
      ? customBasePrefix.trim()
      : prev.basePrefix || (homePrefix ? `${homePrefix}/${rootName}` : '');

  const mountId = `fallback_${rootName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
  fallbackMountedDirs.set(mountId, dirMap);

  const existingMounts = getMountedDirectoriesMeta().filter(
    (m) => m.id !== mountId && m.name.toLowerCase() !== rootName.toLowerCase()
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
    indexedFileCount: fallbackDirectoryFiles.size,
  };
  savePosixRootConfig(config);
  return config;
}

export function hasFallbackFilesInMemory(): boolean {
  return (
    fallbackDirectoryFiles.size > 0 ||
    fallbackMountedDirs.size > 0 ||
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

  // Support $HOME/... or ${HOME}/... shell syntax
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

/**
 * Generates candidate relative paths inside a mounted directory from a full or partial POSIX path.
 * Also learns the directory's basePrefix when the directory name is found inside the POSIX path.
 */
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

  // 1. Strip explicit basePrefix if configured
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

  // 2. Match by root folder name segment anywhere in the POSIX path
  const segments = norm.split('/').filter(Boolean);
  if (rootName) {
    const rootLower = rootName.toLowerCase();
    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i].toLowerCase() === rootLower) {
        addCandidate(segments.slice(i + 1).join('/'));

        // Automatically learn the basePrefix of this mounted directory if it was empty
        if (!basePrefix.trim() && norm.startsWith('/')) {
          const learnedPrefix = '/' + segments.slice(0, i + 1).join('/');
          autoUpdateMountBasePrefix(rootName, learnedPrefix);
        }
      }
    }
  }

  if (strictMountMatch) {
    return candidates;
  }

  // 3. Common OS/Mobile prefixes (e.g., ~/Documents/..., /home/user/...)
  if (norm.startsWith('~/')) {
    addCandidate(norm.slice(2));
  }
  const homePrefix = getDetectedHomePrefix();
  if (homePrefix && norm.startsWith(homePrefix + '/')) {
    addCandidate(norm.slice(homePrefix.length + 1));
  }
  if (!norm.startsWith('/') && !norm.startsWith('~/')) {
    addCandidate(norm);
  }

  // 4. Progressive suffixes from longest sub-path down to filename (only when path is not a top-level $HOME file with no matching subfolder)
  const isDirectHomeFile =
    (norm.startsWith('~/') && segments.length === 2) ||
    (Boolean(homePrefix) &&
      norm.startsWith(homePrefix + '/') &&
      norm.slice(homePrefix.length + 1).split('/').filter(Boolean).length === 1);

  if (!isDirectHomeFile) {
    for (let i = 1; i < segments.length; i++) {
      addCandidate(segments.slice(i).join('/'));
    }
  }

  return candidates;
}

function autoUpdateMountBasePrefix(dirName: string, learnedPrefix: string): void {
  try {
    const mounts = getMountedDirectoriesMeta();
    let updated = false;
    const nextMounts = mounts.map((m) => {
      if (m.name.toLowerCase() === dirName.toLowerCase() && !m.basePrefix) {
        updated = true;
        return { ...m, basePrefix: learnedPrefix };
      }
      return m;
    });
    if (updated) {
      saveMountedDirectoriesMeta(nextMounts);
    }
    const cfg = getPosixRootConfig();
    if (cfg.rootName.toLowerCase() === dirName.toLowerCase() && !cfg.basePrefix) {
      savePosixRootConfig({ ...cfg, basePrefix: learnedPrefix });
    }
  } catch {
    // ignore
  }
}

async function ensureHandlePermission(handle: any, mode: 'read' | 'readwrite' = 'read'): Promise<boolean> {
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

export async function resolveAndReadPosixFile(
  rawPath: string,
  options?: { autoPromptFilePicker?: boolean }
): Promise<PosixResolvedFile> {
  const normPath = normalizePosixPath(rawPath);
  if (!normPath) {
    throw new Error('Percorso POSIX vuoto o non valido.');
  }

  detectAndSaveHomePrefix(normPath);
  const config = getPosixRootConfig();
  const eqPaths = getEquivalentHomePaths(normPath);

  // 1. Check bound single-file handles in memory or IndexedDB (covers files directly in $HOME!)
  const boundHandle = await getSavedBoundFileHandle(normPath);
  if (boundHandle) {
    const hasPerm = await ensureHandlePermission(boundHandle, 'read');
    if (hasPerm) {
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

  // Check fallback bound single files in memory
  for (const p of eqPaths) {
    if (fallbackSingleFilesByPath.has(p)) {
      const file = fallbackSingleFilesByPath.get(p)!;
      const { content, format } = await decodeFileObject(file);
      activeHandlesByFilename.set(file.name, {
        handle: null,
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
        canWriteDisk: false,
      };
    }
  }

  // 2. Search across ALL mounted directories (Pass 1: Strict match by folder name or basePrefix)
  const mounts = getMountedDirectoriesMeta();
  const fsMounts: Array<{ handle: any; name: string; basePrefix: string }> = [];

  for (const m of mounts) {
    if (m.mode === 'fs_api') {
      const h = await getDirectoryHandleForMount(m);
      if (h) {
        fsMounts.push({ handle: h, name: h.name || m.name, basePrefix: m.basePrefix || '' });
      }
    }
  }

  const legacyRoot = await getSavedRootDirHandle();
  if (legacyRoot && !fsMounts.some((m) => m.name === legacyRoot.name)) {
    fsMounts.push({
      handle: legacyRoot,
      name: legacyRoot.name || config.rootName,
      basePrefix: config.basePrefix || '',
    });
  }

  for (const strictPass of [true, false]) {
    for (const mount of fsMounts) {
      const hasRead = await ensureHandlePermission(mount.handle, 'read');
      if (!hasRead) continue;

      const candidates = computeRelativeCandidates(
        normPath,
        mount.name,
        mount.basePrefix,
        strictPass
      );
      for (const candidate of candidates) {
        const fileHandle = await traverseDirectoryForFile(mount.handle, candidate, false);
        if (fileHandle) {
          const file: File = await fileHandle.getFile();
          const { content, format } = await decodeFileObject(file);
          for (const p of eqPaths) {
            activeHandlesByPath.set(p, fileHandle);
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
          };
        }
      }
    }
  }

  // 3. Try Fallback Directory Files map (if user mounted via <input webkitdirectory>)
  if (fallbackDirectoryFiles.size > 0) {
    const candidates = computeRelativeCandidates(normPath, config.rootName, config.basePrefix, false);
    for (const candidate of candidates) {
      const exactFile = fallbackDirectoryFiles.get(candidate);
      if (exactFile) {
        const { content, format } = await decodeFileObject(exactFile);
        activeHandlesByFilename.set(exactFile.name, {
          handle: null,
          posixPath: normPath,
          relativePath: candidate,
        });
        addRecentPosixPath({
          posixPath: normPath,
          resolvedRelativePath: candidate,
          filename: exactFile.name,
        });
        return {
          filename: exactFile.name,
          content,
          format,
          posixPath: normPath,
          relativePath: candidate,
          canWriteDisk: false,
        };
      }

      const candLower = candidate.toLowerCase();
      for (const [relKey, fileObj] of fallbackDirectoryFiles.entries()) {
        if (relKey.toLowerCase() === candLower) {
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
  }

  // 4. Not found in existing mounts/bindings -> Automatically open pre-filtered single-file picker and bind permission!
  if (options?.autoPromptFilePicker !== false) {
    try {
      return await promptAndBindSinglePosixFile(normPath);
    } catch (pickerErr: any) {
      if (pickerErr?.name === 'AbortError') {
        throw new Error(`Selezione file annullata per il percorso "${normPath}".`);
      }
      // If browser blocked the picker due to missing user gesture, signal NO_ROOT_AUTHORIZED so the modal can open with 1-click button
    }
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
  const normTarget = normalizePosixPath(targetPathOrFilename);
  const config = getPosixRootConfig();

  // 1. Check if normTarget matches a bound/active path handle or active filename handle
  let fileHandle = await getSavedBoundFileHandle(normTarget);
  let resolvedPosixPath = normTarget;
  let resolvedFilename = normTarget.split('/').filter(Boolean).pop() || targetPathOrFilename;

  if (!fileHandle && activeHandlesByFilename.has(targetPathOrFilename)) {
    const info = activeHandlesByFilename.get(targetPathOrFilename)!;
    fileHandle = info.handle || (await getSavedBoundFileHandle(info.posixPath));
    resolvedPosixPath = info.posixPath;
    resolvedFilename = targetPathOrFilename;
  }

  // 2. If no handle yet, search across all mounted directories
  if (!fileHandle) {
    const mounts = getMountedDirectoriesMeta();
    const fsMounts: Array<{ handle: any; name: string; basePrefix: string }> = [];
    for (const m of mounts) {
      if (m.mode === 'fs_api') {
        const h = await getDirectoryHandleForMount(m);
        if (h) fsMounts.push({ handle: h, name: h.name || m.name, basePrefix: m.basePrefix || '' });
      }
    }
    const legacyRoot = await getSavedRootDirHandle();
    if (legacyRoot && !fsMounts.some((m) => m.name === legacyRoot.name)) {
      fsMounts.push({
        handle: legacyRoot,
        name: legacyRoot.name || config.rootName,
        basePrefix: config.basePrefix || '',
      });
    }

    for (const mount of fsMounts) {
      const hasWrite = await ensureHandlePermission(mount.handle, 'readwrite');
      if (!hasWrite) continue;
      const candidates = computeRelativeCandidates(normTarget, mount.name, mount.basePrefix, false);
      for (const candidate of candidates) {
        const existing = await traverseDirectoryForFile(mount.handle, candidate, false);
        if (existing) {
          fileHandle = existing;
          break;
        }
      }
      if (fileHandle) break;
    }

    // If not found yet and target looks like a path inside a mounted directory, create it
    if (!fileHandle && fsMounts.length > 0) {
      const primaryMount = fsMounts[0];
      const hasWrite = await ensureHandlePermission(primaryMount.handle, 'readwrite');
      if (hasWrite) {
        const candidates = computeRelativeCandidates(
          normTarget,
          primaryMount.name,
          primaryMount.basePrefix,
          true
        );
        if (candidates.length > 0) {
          fileHandle = await traverseDirectoryForFile(primaryMount.handle, candidates[0], true);
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
