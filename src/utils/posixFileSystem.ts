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
const CONFIG_STORAGE_KEY = 'livia_posix_root_config';
const RECENT_PATHS_STORAGE_KEY = 'livia_posix_recent_paths';

// Active file handles mapped by normalized POSIX path and by filename
const activeHandlesByPath = new Map<string, any>();
const activeHandlesByFilename = new Map<string, { handle: any; posixPath: string; relativePath: string }>();

// Fallback in-memory files from <input type="file" webkitdirectory>
// Key is relative path inside root directory (e.g., "subfolder/file.md")
const fallbackDirectoryFiles = new Map<string, File>();
let cachedRootDirHandle: any = null;

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

export async function saveRootDirHandle(handle: any): Promise<void> {
  cachedRootDirHandle = handle;
  try {
    const db = await openPosixDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(handle, ROOT_HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not persist DirectoryHandle to IndexedDB:', err);
  }
}

export async function getSavedRootDirHandle(): Promise<any | null> {
  if (cachedRootDirHandle) return cachedRootDirHandle;
  try {
    const db = await openPosixDB();
    const handle = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(ROOT_HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (handle) {
      cachedRootDirHandle = handle;
    }
    return handle;
  } catch {
    return null;
  }
}

export async function clearPosixRootAuthorization(): Promise<void> {
  cachedRootDirHandle = null;
  fallbackDirectoryFiles.clear();
  activeHandlesByPath.clear();
  activeHandlesByFilename.clear();
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  try {
    const db = await openPosixDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(ROOT_HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export function getPosixRootConfig(): PosixRootConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PosixRootConfig;
      if (parsed.mode === 'fallback' && fallbackDirectoryFiles.size === 0) {
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
  fallbackDirectoryFiles.clear();
  let detectedRootName = '';
  const files = Array.from(fileList);

  for (const file of files) {
    const rel = (file as any).webkitRelativePath || file.name;
    const parts = rel.split('/').filter(Boolean);
    if (!detectedRootName && parts.length > 1) {
      detectedRootName = parts[0];
    }
    const innerRel = parts.length > 1 ? parts.slice(1).join('/') : parts.join('/');
    fallbackDirectoryFiles.set(innerRel, file);
  }

  const prev = getPosixRootConfig();
  const config: PosixRootConfig = {
    rootName: detectedRootName || prev.rootName || 'root',
    basePrefix: customBasePrefix !== undefined ? customBasePrefix : prev.basePrefix,
    mode: 'fallback',
    indexedFileCount: fallbackDirectoryFiles.size,
  };
  savePosixRootConfig(config);
  return config;
}

export function hasFallbackFilesInMemory(): boolean {
  return fallbackDirectoryFiles.size > 0;
}

export function normalizePosixPath(raw: string): string {
  let cleaned = raw.trim();
  // Strip surrounding single or double quotes often added by terminal/file-manager copy
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  // Handle file:// URI scheme
  if (cleaned.startsWith('file://')) {
    try {
      cleaned = decodeURIComponent(cleaned.replace(/^file:\/\/(localhost)?/, ''));
    } catch {
      cleaned = cleaned.replace(/^file:\/\/(localhost)?/, '');
    }
  }
  // Unescape backslash-escaped spaces (\ ) from shell paths
  cleaned = cleaned.replace(/\\ /g, ' ');
  // Convert backslashes to forward slashes
  cleaned = cleaned.replace(/\\/g, '/');

  // Resolve . and .. segments while preserving leading / or ~/
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
 * Generates candidate relative paths inside the authorized root directory
 * from a full or partial POSIX path.
 */
export function computeRelativeCandidates(posixPath: string, rootName: string, basePrefix: string): string[] {
  const norm = normalizePosixPath(posixPath);
  const candidates: string[] = [];
  const addCandidate = (c: string) => {
    const trimmed = c.replace(/^\/+/, '').replace(/\/+$/, '');
    if (trimmed && !candidates.includes(trimmed)) {
      candidates.push(trimmed);
    }
  };

  // 1. Strip explicit basePrefix if configured
  if (basePrefix.trim()) {
    const normBase = normalizePosixPath(basePrefix).replace(/\/+$/, '');
    if (normBase && norm.startsWith(normBase + '/')) {
      addCandidate(norm.slice(normBase.length + 1));
    }
    // Also check if basePrefix ends with rootName and norm contains it
    if (normBase && norm.toLowerCase().startsWith(normBase.toLowerCase() + '/')) {
      addCandidate(norm.slice(normBase.length + 1));
    }
  }

  // 2. Match by root folder name segment anywhere in the POSIX path
  const segments = norm.split('/').filter(Boolean);
  if (rootName) {
    const rootLower = rootName.toLowerCase();
    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i].toLowerCase() === rootLower) {
        addCandidate(segments.slice(i + 1).join('/'));
      }
    }
  }

  // 3. Common OS/Mobile prefixes (e.g., /storage/emulated/0/Documents/..., ~/Documents/..., /Users/name/...)
  if (norm.startsWith('~/')) {
    addCandidate(norm.slice(2));
  }
  addCandidate(norm);

  // 4. Progressive suffixes from longest sub-path down to filename
  for (let i = 1; i < segments.length; i++) {
    addCandidate(segments.slice(i).join('/'));
  }

  return candidates;
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

export async function resolveAndReadPosixFile(rawPath: string): Promise<PosixResolvedFile> {
  const normPath = normalizePosixPath(rawPath);
  if (!normPath) {
    throw new Error('Percorso POSIX vuoto o non valido.');
  }

  const config = getPosixRootConfig();

  // Check if we already have an active FileSystemFileHandle for this exact path
  if (activeHandlesByPath.has(normPath)) {
    const existingHandle = activeHandlesByPath.get(normPath);
    const hasPerm = await ensureHandlePermission(existingHandle, 'read');
    if (hasPerm) {
      const file: File = await existingHandle.getFile();
      const { content, format } = await decodeFileObject(file);
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

  // Try File System Access API Root Directory Handle first
  const rootHandle = await getSavedRootDirHandle();
  if (rootHandle) {
    const hasRead = await ensureHandlePermission(rootHandle, 'read');
    if (hasRead) {
      const candidates = computeRelativeCandidates(normPath, rootHandle.name || config.rootName, config.basePrefix);
      for (const candidate of candidates) {
        const fileHandle = await traverseDirectoryForFile(rootHandle, candidate, false);
        if (fileHandle) {
          const file: File = await fileHandle.getFile();
          const { content, format } = await decodeFileObject(file);
          activeHandlesByPath.set(normPath, fileHandle);
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

  // Try Fallback Directory Files map (if user mounted via <input webkitdirectory>)
  if (fallbackDirectoryFiles.size > 0) {
    const candidates = computeRelativeCandidates(normPath, config.rootName, config.basePrefix);
    for (const candidate of candidates) {
      // Exact relative match
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

      // Case-insensitive or suffix match in fallback map
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

  // Provide a clear diagnostic error message
  if (!rootHandle && fallbackDirectoryFiles.size === 0) {
    const err = new Error('NO_ROOT_AUTHORIZED');
    (err as any).code = 'NO_ROOT_AUTHORIZED';
    (err as any).posixPath = normPath;
    throw err;
  }

  const rootLabel = rootHandle?.name || config.rootName || 'cartella radice';
  throw new Error(`File "${normPath}" non trovato nella cartella autorizzata "${rootLabel}". Verifica il percorso o il Prefisso Base.`);
}

export async function writePosixFile(
  targetPathOrFilename: string,
  content: string
): Promise<{ writtenToDisk: boolean; posixPath: string; filename: string }> {
  const normTarget = normalizePosixPath(targetPathOrFilename);
  const config = getPosixRootConfig();

  // 1. Check if normTarget matches a registered path handle or active filename handle
  let fileHandle = activeHandlesByPath.get(normTarget);
  let resolvedPosixPath = normTarget;
  let resolvedFilename = normTarget.split('/').filter(Boolean).pop() || targetPathOrFilename;

  if (!fileHandle && activeHandlesByFilename.has(targetPathOrFilename)) {
    const info = activeHandlesByFilename.get(targetPathOrFilename)!;
    fileHandle = info.handle;
    resolvedPosixPath = info.posixPath;
    resolvedFilename = targetPathOrFilename;
  }

  // 2. If no handle yet, and user passed a POSIX path or we have a root directory handle, try resolving or creating inside rootHandle
  const rootHandle = await getSavedRootDirHandle();
  if (!fileHandle && rootHandle) {
    const hasWrite = await ensureHandlePermission(rootHandle, 'readwrite');
    if (hasWrite) {
      const candidates = computeRelativeCandidates(normTarget, rootHandle.name || config.rootName, config.basePrefix);
      // Try existing file first
      for (const candidate of candidates) {
        const existing = await traverseDirectoryForFile(rootHandle, candidate, false);
        if (existing) {
          fileHandle = existing;
          break;
        }
      }
      // If not found and target looks like a path inside root, create it at the primary candidate
      if (!fileHandle && candidates.length > 0) {
        fileHandle = await traverseDirectoryForFile(rootHandle, candidates[0], true);
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

      activeHandlesByPath.set(resolvedPosixPath, fileHandle);
      activeHandlesByFilename.set(resolvedFilename, {
        handle: fileHandle,
        posixPath: resolvedPosixPath,
        relativePath: resolvedFilename,
      });

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
