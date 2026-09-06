import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, User, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { convertGoogleDocsHtmlToMarkdown } from './googleDocsHelper';

// Initialize Firebase safely
let app;
let auth: Auth | null = null;

if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey.trim() !== '') {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
  } catch (err) {
    console.warn('Inizializzazione Firebase non riuscita:', err);
  }
}

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/documents');
provider.addScope('https://www.googleapis.com/auth/documents.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

let isMobileCache = false;
if (typeof window !== 'undefined') {
  isMobileCache = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!auth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
  
  // Check for redirect result first (mobile PWA fallback)
  getRedirectResult(auth).then((result) => {
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        if (onAuthSuccess) onAuthSuccess(result.user, cachedAccessToken);
      }
    }
  }).catch((err) => {
    console.error("Errore getRedirectResult:", err);
  });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // We might be waiting for getRedirectResult to finish, so don't fail immediately
        // Wait a small bit, or just let getRedirectResult call onAuthSuccess
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!auth || !firebaseConfig.apiKey) {
    throw new Error('Manca la chiave "apiKey" o "appId" nel file firebase-applet-config.json. Configura le credenziali Web del tuo progetto Firebase.');
  }
  try {
    isSigningIn = true;
    
    // For mobile devices (especially PWA/Chrome Android), popups are heavily blocked by COOP/COEP headers and popup blockers.
    // So we use redirect flow instead.
    if (isMobileCache) {
      await signInWithRedirect(auth, provider);
      return null; // Page will redirect
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Impossibile ottenere il token di accesso da Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Errore di accesso:', error);
    if (error?.code === 'auth/access-denied' || error?.message?.includes('access_denied') || error?.code === 'auth/popup-closed-by-user') {
      if (error?.code !== 'auth/popup-closed-by-user') {
        throw new Error('Accesso Google bloccato (Errore 403): Aggiungi la tua email tra gli "Utenti di Prova" (Test Users) nella Schermata di Consenso OAuth su Google Cloud Console per il progetto livia-editor.');
      }
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// --- Google Drive API Operations ---

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  parents?: string[];
}

export async function listDriveFiles(accessToken: string, folderId: string = 'root'): Promise<DriveFile[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,modifiedTime,parents)&orderBy=name`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('Errore listDriveFiles:', errText);
    throw new Error('Errore nel recupero dei file da Google Drive™');
  }
  const data = await res.json();
  
  // Deduplicate files by ID to prevent duplicate keys
  const rawFiles: DriveFile[] = data.files || [];
  const fileMap = new Map<string, DriveFile>();
  for (const f of rawFiles) {
    if (f.id && !fileMap.has(f.id)) {
      fileMap.set(f.id, f);
    }
  }
  const files = Array.from(fileMap.values());

  return files.sort((a, b) => {
    const aIsFolder = a.mimeType === 'application/vnd.google-apps.folder';
    const bIsFolder = b.mimeType === 'application/vnd.google-apps.folder';
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function createDriveFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string | null
): Promise<{ id: string; name: string }> {
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Errore createDriveFolder:', errText);
    throw new Error('Errore nella creazione della cartella su Google Drive™');
  }

  const data = await res.json();
  return { id: data.id, name: data.name };
}

export async function readFromDrive(accessToken: string, fileId: string, mimeType?: string): Promise<string> {
  // If it's a Google Docs document, export as text/html and convert to clean Markdown
  if (mimeType === 'application/vnd.google-apps.document') {
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/html`;
    const exportRes = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (exportRes.ok) {
      const html = await exportRes.text();
      return convertGoogleDocsHtmlToMarkdown(html);
    }
  }

  // If we know it's another Google Docs Editors file (e.g. sheet, slide), export as text/plain
  if (mimeType && mimeType.startsWith('application/vnd.google-apps.')) {
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    const exportRes = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (exportRes.ok) {
      return await exportRes.text();
    }
  }

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Errore readFromDrive:', errText);

    // Fallback: If error indicates fileNotDownloadable (e.g. Google Docs native doc), export as HTML or text/plain
    if (errText.includes('fileNotDownloadable') || errText.includes('Export with Docs Editors files')) {
      const exportHtmlUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/html`;
      const exportHtmlRes = await fetch(exportHtmlUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (exportHtmlRes.ok) {
        const html = await exportHtmlRes.text();
        return convertGoogleDocsHtmlToMarkdown(html);
      }

      const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
      const exportRes = await fetch(exportUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (exportRes.ok) {
        return await exportRes.text();
      }
    }

    throw new Error('Errore nel download del file da Google Drive™');
  }

  return await res.text();
}

export async function saveToDrive(
  accessToken: string,
  filename: string,
  content: string,
  fileId?: string | null,
  parentFolderId?: string | null
): Promise<{ id: string; name: string }> {
  if (fileId) {
    // 1. Update file content
    const urlContent = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const resContent = await fetch(urlContent, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'text/plain; charset=UTF-8',
      },
      body: content,
    });
    if (!resContent.ok) {
      const errText = await resContent.text();
      console.error('Errore saveToDrive content update:', errText);
      throw new Error('Errore nel salvataggio del contenuto su Google Drive™');
    }

    // 2. Update file name metadata
    const urlMeta = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const resMeta = await fetch(urlMeta, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ name: filename }),
    });
    if (!resMeta.ok) {
      const errText = await resMeta.text();
      console.error('Errore saveToDrive metadata update:', errText);
      throw new Error('Errore nell\'aggiornamento del nome su Google Drive™');
    }

    return { id: fileId, name: filename };
  } else {
    // Create new file with metadata and content in a single multipart request
    const metadata: any = {
      name: filename,
      mimeType: 'text/plain',
    };
    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }
    const boundary = 'foo_bar_baz';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const body = delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
      content +
      close_delim;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Errore saveToDrive create:', errText);
      throw new Error('Errore nella creazione del file su Google Drive™');
    }

    const data = await res.json();
    return { id: data.id, name: data.name };
  }
}
