# Piano di Implementazione: Apertura, Inserimento e Salvataggio tramite URL o ID di Google Drive

## Obiettivo
Estendere il flusso testuale rapido già realizzato per i percorsi POSIX in modo da supportare nativamente anche **URL completi di Google Drive / Google Docs**, riferimenti con prefisso (`gdrive:<ID>` o `drive:<ID>`) e **File ID puri di Google Drive**, sia tramite comandi Vim (`:e`, `:r`, `:tear`, `:w`, `:wq`) sia tramite interfaccia grafica (estendendo il modale `POSIX` e il pannello `Google Drive`).

---

## 1. Parser e Risolutore di Riferimenti Google Drive (`/src/utils/googleDrive.ts`)
- **Riconoscimento ed estrazione del File ID (`extractDriveFileId` & `isDriveReferenceLike`)**:
  - Supporto automatico per:
    - URL Google Drive: `https://drive.google.com/file/d/<FILE_ID>/...`, `https://drive.google.com/open?id=<FILE_ID>`, `https://drive.google.com/uc?id=<FILE_ID>`
    - URL Google Docs / Sheets / Slides: `https://docs.google.com/document/d/<FILE_ID>/...`, `https://docs.google.com/spreadsheets/d/<FILE_ID>/...`, `https://docs.google.com/presentation/d/<FILE_ID>/...`
    - Prefissi espliciti: `gdrive:<FILE_ID_O_URL>`, `drive:<FILE_ID_O_URL>`, `gdoc:<FILE_ID_O_URL>`
    - File ID puro di Google Drive: stringhe alfanumeriche con `-` e `_` tipiche degli ID Google Drive (es. lunghezza 25–50 caratteri, prive di `/` o estensioni di file locali).
- **Recupero Metadati e Contenuto (`resolveAndReadDriveReference`)**:
  - Dato un input testuale (URL, `gdrive:...` o ID), estrae il `fileId`, interroga `https://www.googleapis.com/drive/v3/files/<fileId>?fields=id,name,mimeType,modifiedTime,parents` per ottenere nome reale, MIME type e formato LiViA (`FileFormat`), quindi scarica/converte il contenuto tramite `readFromDrive` (supportando file di testo/codice, Markdown, Google Docs nativi convertiti in Markdown e file `.docx`).
- **Aggiornamento / Sovrascrittura Diretta (`updateDriveFileContent`)**:
  - Per i file normali (testo, Markdown, codice, `.docx`) usa `saveToDrive(accessToken, filename, content, fileId)`.
  - Per i documenti Google Docs nativi (`application/vnd.google-apps.document`), converte il Markdown in HTML formattato (`convertMarkdownToGoogleDocsHtml`) ed esegue l'aggiornamento `PATCH` multipart su `https://www.googleapis.com/upload/drive/v3/files/<fileId>?uploadType=multipart` mantenendo invariato il `fileId`.
- **Registro e Cronologia File Drive Recenti (`localStorage`)**:
  - Mantiene l'associazione tra `filename` aperto nell'editor e `{ fileId, name, mimeType, rawInput }` e salva la cronologia degli ultimi URL/ID Google Drive aperti per il riutilizzo con un clic.

---

## 2. Integrazione nei Comandi Vim (`/src/App.tsx` e `/src/components/VimEditor.tsx`)
- **`:e <URL | gdrive:ID | ID>` (Apertura in Editor)**:
  - Se l'argomento di `:e` viene riconosciuto da `isDriveReferenceLike`, verifica la presenza del token Google Drive (se non autenticato, avvia `googleSignIn` o apre il modale precompilato), scarica metadati e contenuto, imposta `activeDriveFileId` e apre il documento nell'editor.
- **`:r <URL | gdrive:ID | ID>` (Inserimento sotto il cursore)**:
  - Scarica il contenuto del file da Google Drive tramite l'URL o l'ID fornito e lo inserisce direttamente sotto la riga corrente del cursore.
- **`:tear <URL | gdrive:ID | ID>` (Copia rapida negli appunti)**:
  - Scarica il contenuto del file da Google Drive e lo copia immediatamente negli appunti di sistema.
- **`:w` / `:wq` e `:w <URL | gdrive:ID | ID>` (Salvataggio diretto senza conferma aggiuntiva)**:
  - Quando il file attivo è collegato a un `activeDriveFileId` (oppure quando viene passato esplicitamente un URL/ID Drive a `:w <target>`), `:w` e `:wq` salvano nello spazio di lavoro locale e **sovrascrivono direttamente il file su Google Drive senza finestre di conferma intermedie**, mostrando una notifica toast di conferma.

---

## 3. Estensione Interfaccia UI (`/src/components/PosixPathModal.tsx`, `/src/components/Toolbar.tsx`, `/src/App.tsx`)
- **Modale Unificato Percorsi POSIX & URL/ID Google Drive (`PosixPathModal.tsx`)**:
  - Il campo di input accetta sia percorsi POSIX (`/home/...`, `~/...`) sia URL o File ID di Google Drive, rilevando automaticamente il tipo di sorgente inserita o incollata dagli appunti.
  - Mostra lo stato di connessione a Google Drive (con pulsante rapido di login se non connesso) e un badge quando il documento corrente è collegato a un file Google Drive (con pulsante per copiare l'ID o il link diretto).
  - Include l'elenco combinato o filtrabile dei percorsi POSIX recenti e dei file Google Drive aperti di recente tramite URL/ID.
- **Barra Rapida URL/ID nel Pannello Google Drive (`App.tsx`)**:
  - Sia nella scheda laterale `Drive` che nella vista Google Drive a schermo intero, aggiunge un campo rapido **"Apri o Strappa da URL / ID Drive"** con pulsante Incolla e azioni rapide (`:e` Apri, `:r` Inserisci, `:tear` Copia).

---

## 4. Verifica
- Compilazione completa del progetto tramite `compile_applet` per verificare l'assenza di errori TypeScript o di build.
