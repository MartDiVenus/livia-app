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

/**
 * Returns the standard MIME type for a given filename or file extension.
 * Essential for Google Drive and Google Docs to trigger native Markdown preview and inline editing for .md files.
 */
export function getMimeTypeForFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
    case 'markdown':
      return 'text/markdown';
    case 'txt':
      return 'text/plain';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'html':
    case 'htm':
      return 'text/html';
    case 'json':
      return 'application/json';
    case 'xml':
      return 'application/xml';
    case 'csv':
      return 'text/csv';
    case 'css':
      return 'text/css';
    case 'js':
    case 'mjs':
      return 'text/javascript';
    case 'ts':
      return 'text/typescript';
    case 'py':
      return 'text/x-python';
    case 'tex':
      return 'text/x-tex';
    case 'sh':
    case 'bash':
      return 'text/x-shellscript';
    case 'c':
    case 'cpp':
    case 'h':
    case 'hpp':
      return 'text/x-c';
    case 'java':
      return 'text/x-java-source';
    case 'sql':
      return 'application/sql';
    case 'rs':
      return 'text/rust';
    case 'go':
      return 'text/x-go';
    default:
      return 'text/plain';
  }
}

/**
 * Heals Mojibake sequences (corrupted Italian accents and common typographical characters
 * caused by double-encoding or legacy Latin-1 / UTF-8 misinterpretation).
 */
export function fixMojibake(str: string): string {
  if (!str) return '';
  // Quick test: if string contains typical UTF-8 mojibake patterns
  if (!/[\u00C2\u00C3\u00E2]/.test(str)) {
    return str;
  }

  // 1. Try high-precision binary re-decoding (reverses Latin-1/Windows-1252 misinterpretations of UTF-8 byte streams)
  try {
    const bytes = Uint8Array.from(str, c => {
      const code = c.charCodeAt(0);
      if (code > 255) throw new Error('Not single byte');
      return code;
    });
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return decoded;
  } catch (_e) {
    // 2. Targeted regex substitution fallback for mixed or partially corrupted strings
    return str
      .replace(/Ã[\u00A0\s]/g, 'à')
      .replace(/Ã¨/g, 'è')
      .replace(/Ã©/g, 'é')
      .replace(/Ã¬/g, 'ì')
      .replace(/Ã²/g, 'ò')
      .replace(/Ã¹/g, 'ù')
      .replace(/Ã€/g, 'À')
      .replace(/Ãˆ/g, 'È')
      .replace(/Ã‰/g, 'É')
      .replace(/ÃŒ/g, 'Ì')
      .replace(/Ã’/g, 'Ò')
      .replace(/Ã™/g, 'Ù')
      .replace(/â€™/g, '’')
      .replace(/â€˜/g, '‘')
      .replace(/â€œ/g, '“')
      .replace(/â€\u009d/g, '”')
      .replace(/â€”/g, '—')
      .replace(/â€“/g, '–')
      .replace(/â‚¬/g, '€')
      .replace(/Â«/g, '«')
      .replace(/Â»/g, '»')
      .replace(/Â°/g, '°');
  }
}

export async function readFromDrive(accessToken: string, fileId: string, mimeType?: string, fileName?: string): Promise<string> {
  // If it's a Google Docs document, export as text/html and convert to clean Markdown
  if (mimeType === 'application/vnd.google-apps.document') {
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/html`;
    const exportRes = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (exportRes.ok) {
      const buffer = await exportRes.arrayBuffer();
      const html = new TextDecoder('utf-8').decode(buffer);
      return fixMojibake(convertGoogleDocsHtmlToMarkdown(html));
    }
  }

  // If it's a Microsoft Word DOCX document, read binary ArrayBuffer and convert via mammoth
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName?.toLowerCase().endsWith('.docx')
  ) {
    const docxUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const docxRes = await fetch(docxUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (docxRes.ok) {
      const arrayBuffer = await docxRes.arrayBuffer();
      try {
        const mammoth = (await import('mammoth')).default || await import('mammoth');
        const result = await (mammoth as any).convertToHtml({ arrayBuffer });
        const htmlText = result.value || '';
        return fixMojibake(convertGoogleDocsHtmlToMarkdown(htmlText));
      } catch (err) {
        console.error('Errore conversione DOCX con mammoth da Google Drive:', err);
      }
    }
  }

  // If we know it's another Google Docs Editors file (e.g. sheet, slide), export as text/plain
  if (mimeType && mimeType.startsWith('application/vnd.google-apps.')) {
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    const exportRes = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (exportRes.ok) {
      const buffer = await exportRes.arrayBuffer();
      return fixMojibake(new TextDecoder('utf-8').decode(buffer));
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
        const buffer = await exportHtmlRes.arrayBuffer();
        const html = new TextDecoder('utf-8').decode(buffer);
        return fixMojibake(convertGoogleDocsHtmlToMarkdown(html));
      }

      const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
      const exportRes = await fetch(exportUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (exportRes.ok) {
        const buffer = await exportRes.arrayBuffer();
        return fixMojibake(new TextDecoder('utf-8').decode(buffer));
      }
    }

    throw new Error('Errore nel download del file da Google Drive™');
  }

  const buffer = await res.arrayBuffer();
  const rawText = new TextDecoder('utf-8').decode(buffer);
  return fixMojibake(rawText);
}

export async function saveToDrive(
  accessToken: string,
  filename: string,
  content: string,
  fileId?: string | null,
  parentFolderId?: string | null
): Promise<{ id: string; name: string }> {
  const mimeType = getMimeTypeForFilename(filename);
  const boundary = 'livia_drive_boundary_' + Date.now() + '_' + Math.random().toString(36).substring(2);

  // For Microsoft Word DOCX files, build a genuine binary OpenXML .docx Blob
  let contentBlob: Blob;
  if (filename.toLowerCase().endsWith('.docx')) {
    try {
      const { createDocxBlob } = await import('./docxExport');
      contentBlob = await createDocxBlob(content);
    } catch (err) {
      console.error('Errore creazione binary DOCX per Drive, fallback utf-8 text:', err);
      contentBlob = new Blob([new TextEncoder().encode(content)], {
        type: `${mimeType}; charset=UTF-8`,
      });
    }
  } else {
    // Pure UTF-8 byte stream for Markdown and code files
    contentBlob = new Blob([new TextEncoder().encode(content)], {
      type: `${mimeType}; charset=UTF-8`,
    });
  }

  if (fileId) {
    // 1. Update file with multipart PATCH so both the raw UTF-8 content AND the correct MIME type
    // (e.g. text/markdown) are applied atomically to Google Drive.
    const metadata = {
      name: filename,
      mimeType: mimeType,
    };

    const multipartBlob = new Blob([
      `--${boundary}\r\n`,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      `\r\n--${boundary}\r\n`,
      `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n`,
      contentBlob,
      `\r\n--${boundary}--`,
    ], { type: `multipart/related; boundary=${boundary}` });

    const patchUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
    let res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBlob,
    });

    // Fallback: If uploadType=multipart on PATCH is not accepted by Drive in any context, fallback cleanly
    if (!res.ok) {
      console.warn('Multipart PATCH non riuscito, fallback su media upload diretto:', res.status);
      const urlContent = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      const resContent = await fetch(urlContent, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `${mimeType}; charset=UTF-8`,
        },
        body: contentBlob,
      });
      if (!resContent.ok) {
        const errText = await resContent.text();
        console.error('Errore saveToDrive content update fallback:', errText);
        throw new Error('Errore nel salvataggio del contenuto su Google Drive™');
      }

      // Update metadata (name and mimeType)
      const urlMeta = `https://www.googleapis.com/drive/v3/files/${fileId}`;
      const resMeta = await fetch(urlMeta, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(metadata),
      });
      if (!resMeta.ok) {
        const errText = await resMeta.text();
        console.error('Errore saveToDrive metadata update fallback:', errText);
      }

      return { id: fileId, name: filename };
    }

    const data = await res.json();
    return { id: data.id || fileId, name: data.name || filename };
  } else {
    // Create new file with metadata and binary content in a single multipart request
    const metadata: any = {
      name: filename,
      mimeType: mimeType,
    };
    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    const multipartBlob = new Blob([
      `--${boundary}\r\n`,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      `\r\n--${boundary}\r\n`,
      `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n`,
      contentBlob,
      `\r\n--${boundary}--`,
    ], { type: `multipart/related; boundary=${boundary}` });

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBlob,
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
