# Piano di Implementazione: Accesso POSIX Senza Limitazioni su `$HOME` e Sottocartelle

## 1. Obiettivo e Architettura
I browser Chromium impongono un blocco di sicurezza cablato sull'API `showDirectoryPicker()` quando si tenta di selezionare direttamente la radice della `$HOME` (`/home/<user>`, `/Users/<user>`, `C:\Users\<user>`), ma **consentono pienamente**:
1. La selezione di **qualsiasi file singolo anche direttamente dentro `$HOME`** tramite `window.showOpenFilePicker()`.
2. L'autorizzazione contemporanea di **più sottocartelle della `$HOME`** (es. `~/Documenti`, `~/Scrivania`, `~/Scaricati`, `~/Progetti`) tramite `window.showDirectoryPicker()`.

Per eliminare ogni attrito nell'uso dei percorsi POSIX testuali (es. `/home/mario/.bashrc`, `~/note.md`, `/home/mario/Documenti/app.js`), LiViA passerà da un singolo handle radice a un **Virtual `$HOME` Multi-Mount + Direct File Handle Registry** persistente in `IndexedDB`.

---

## 2. Modifiche Principali

### A. Motore POSIX Multi-Cartella e Aggancio File Singoli (`src/utils/posixFileSystem.ts`)
1. **Registro Multi-Cartella (`MountedPosixDirectory[]`) in IndexedDB**:
   - Sostituzione/estensione del singolo `root_dir_handle` con una collezione persistente di cartelle autorizzate (`posix_dir_mounts` in IndexedDB + metadati in `localStorage`).
   - Possibilità di montare contemporaneamente quante sottocartelle della `$HOME` si desidera (es. `Documenti`, `Scaricati`, `Scrivania`, `workspace`, ecc.) senza che una nuova autorizzazione sovrascriva le precedenti.
2. **Registro Permanente di File Singoli (`BoundPosixFileHandle[]`) in IndexedDB**:
   - Creazione dello store/chiave `posix_file_handles` in IndexedDB che mappa un percorso POSIX normalizzato (es. `/home/mario/appunti.md` o `~/todo.txt`) direttamente al suo `FileSystemFileHandle` nativo (con permessi di lettura e scrittura `:w`).
   - Quando un file nella `$HOME` (o fuori dalle cartelle montate) viene agganciato una volta, tutte le successive aperture `:e /home/mario/appunti.md`, letture `:r`, copie `:tear` e salvataggi `:w` funzionano istantaneamente su disco senza richiedere nuove selezioni.
3. **Rilevamento Automatico del Prefisso `$HOME` (`/home/<utente>` / `~`)**:
   - Quando l'utente inserisce un percorso POSIX (es. `/home/mario/Documenti/progetto/index.js`) e una delle cartelle montate si chiama `Documenti` o `progetto`, il motore deduce e memorizza automaticamente la radice utente `/home/mario` come alias di `~`, associando il mount point `/home/mario/Documenti` alla cartella `Documenti`.
   - Risoluzione intelligente multi-mount: dato qualsiasi percorso `/home/utente/<cartella>/<sottopercorso>`, LiViA cerca automaticamente:
     1. Nei file singoli agganciati (`posix_file_handles`) per corrispondenza esatta o suffisso `~/...`.
     2. In tutte le cartelle montate (`posix_dir_mounts`) verificando prefisso esplicito, nome della cartella presente nei segmenti del percorso POSIX (es. `/home/utente/Scaricati/file.txt` -> cartella montata `Scaricati` -> `file.txt`), o percorso relativo.
4. **Fallback Automatico su Selettore File Prefiltrato (`promptAndBindSinglePosixFile`)**:
   - Se un percorso POSIX inserito con `:e`, `:r`, `:tear` o nella modale non è ancora coperto da alcuna cartella montata (tipicamente un file situato direttamente nella radice `$HOME` come `/home/utente/file.txt` o `~/file.txt`), LiViA invoca automaticamente `window.showOpenFilePicker()` prefiltrato sull'estensione del file cercato (con fallback trasparente su `<input type="file">` sui browser mobile/non-Chromium).
   - Non appena l'utente conferma il file nel selettore, LiViA:
     - Memorizza il `FileSystemFileHandle` in IndexedDB associato all'esatto percorso POSIX digitato.
     - Deduce automaticamente il prefisso `$HOME` dal percorso digitato.
     - Completa immediatamente l'azione richiesta (`:e`, `:r` o `:tear`) e abilita `:w` per sovrascrivere direttamente il file originale in `$HOME`.

---

### B. Interfaccia Modale POSIX e Gestione Multi-Mount (`src/components/PosixPathModal.tsx`)
1. **Gestione Cartelle Montate & File Singoli Agganciati in `$HOME`**:
   - Visualizzazione dell'elenco di tutte le cartelle attualmente autorizzate (con pulsante **"+ Aggiungi Cartella"** per montare più sottocartelle della `$HOME` e pulsante per rimuovere singole cartelle).
   - Visualizzazione dei file singoli agganciati direttamente (es. file nella radice `$HOME`), con pulsante **"Aggancia File in `$HOME`..."** e rimozione rapida.
2. **Spiegazione Chiara e Flusso Automatico su `$HOME`**:
   - Se `showDirectoryPicker()` restituisce un errore di restrizione di sistema (quando si tenta di selezionare l'intera `$HOME` come cartella), invece di un errore generico, LiViA spiega che il browser protegge la radice `$HOME` come cartella unica e propone immediatamente con 1 clic di **agganciare il file singolo in `$HOME`** oppure di **aggiungere le sottocartelle desiderate**.
   - Quando si preme Invio o "Apri Percorso (:e)" su un percorso POSIX non ancora autorizzato, si apre direttamente il selettore file prefiltrato per agganciare e aprire subito il file e memorizzarne il permesso.

---

### C. Integrazione trasparente nei Comandi Vim `:e`, `:r`, `:tear` e `:w` (`src/App.tsx`)
1. **Apertura Diretta da `:e /home/user/file`, `:r`, `:tear`**:
   - Quando l'utente esegue `:e ~/miofile.txt` o `:e /home/utente/miofile.txt`:
     - Se il file è già in una cartella montata o già agganciato in IndexedDB, si apre all'istante.
     - Se non è ancora coperto dai permessi attivi, LiViA avvia direttamente il selettore file prefiltrato (`promptAndBindSinglePosixFile`) per agganciarlo, memorizzarlo in IndexedDB e aprirlo subito nell'editor senza passaggi intermedi; solo se il browser blocca il popup per assenza di *user gesture* diretta, apre la modale POSIX già pronta sul percorso inserito.
2. **Salvataggio Diretto `:w` anche su File in `$HOME`**:
   - `writePosixFile` controlla sia i `FileSystemFileHandle` dei file singoli in `$HOME` sia tutte le cartelle montate in `IndexedDB`, garantendo che `:w` sovrascriva direttamente su disco qualsiasi file aperto dalla `$HOME` o dalle sue sottocartelle.
