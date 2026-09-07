import firebaseConfig from '../../firebase-applet-config.json';
import { convertGoogleDocsHtmlToMarkdown } from './googleDocsHelper';

export interface User {
  displayName: string | null;
  email: string | null;
}

let cachedAccessToken: string | null = null;
let gTokenClient: any = null;

const GOOGLE_CLIENT_ID = firebaseConfig.oAuthClientId || '769681664076-3ebt1mbs441st94b83m3r3b9ms3d3aie.apps.googleusercontent.com';

function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if ((window as any).google?.accounts?.oauth2) return resolve();

    const existing = document.getElementById('gsi-client-script');
    if (existing) return resolve();

    const script = document.createElement('script');
    script.id = 'gsi-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(new Error("Impossibile caricare il modulo Google Identity Services."));
    document.head.appendChild(script);
  });
}

function getUserInfo(token: string): Promise<User> {
  return fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(data => ({
    displayName: data.name || data.given_name || 'Utente Google',
    email: data.email || null
  }))
  .catch(() => ({ displayName: 'Utente Google', email: null }));
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Try to restore from sessionStorage
  if (typeof window !== 'undefined') {
    const savedToken = sessionStorage.getItem('livia_drive_access_token');
    if (savedToken) {
      cachedAccessToken = savedToken;
      getUserInfo(savedToken).then(user => {
        if (onAuthSuccess) onAuthSuccess(user, savedToken);
      }).catch(() => {
        if (onAuthFailure) onAuthFailure();
      });
      return () => {}; // No-op unsubscribe
    }
  }

  // Parse URL hash for OAuth tokens if using redirect flow fallback
  if (typeof window !== 'undefined') {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        cachedAccessToken = token;
        sessionStorage.setItem('livia_drive_access_token', token);
        window.history.replaceState(null, '', window.location.pathname);
        getUserInfo(token).then(user => {
          if (onAuthSuccess) onAuthSuccess(user, token);
        });
        return () => {};
      }
    }
  }

  if (onAuthFailure) onAuthFailure();
  return () => {}; // return dummy unsubscribe function
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (typeof window === 'undefined') return null;
  
  await loadGsiScript();
  const google = (window as any).google;
  if (!google?.accounts?.oauth2) {
    throw new Error("Client Google OAuth non caricato.");
  }

  return new Promise((resolve, reject) => {
    try {
      const isMobileCache = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|CrOS/i.test(navigator.userAgent || '');
      
      const config: any = {
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (resp: any) => {
          if (resp.error !== undefined) {
            reject(new Error("Autorizzazione negata o annullata: " + (resp.error_description || resp.error)));
            return;
          }
          cachedAccessToken = resp.access_token;
          sessionStorage.setItem('livia_drive_access_token', resp.access_token);
          
          try {
            const user = await getUserInfo(resp.access_token);
            resolve({ user, accessToken: resp.access_token });
          } catch (e) {
            resolve({ user: { displayName: 'Utente Google', email: null }, accessToken: resp.access_token });
          }
        },
      };

      if (isMobileCache) {
        config.ux_mode = 'redirect';
        config.redirect_uri = window.location.origin;
      }

      gTokenClient = google.accounts.oauth2.initTokenClient(config);
      gTokenClient.requestAccessToken({ prompt: '' });
    } catch (e) {
      reject(e);
    }
  });
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logout = async () => {
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('livia_drive_access_token');
  }
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
