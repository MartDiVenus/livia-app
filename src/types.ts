/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VimMode = 'normal' | 'insert' | 'command' | 'search' | 'visual' | 'visual-line';

export interface VimState {
  text: string;
  cursorIndex: number; // Index in the text string
  mode: VimMode;
  commandBuffer: string; // Active typed command (e.g., "dd", "2g")
  searchQuery: string;
  searchResults: number[]; // Array of indices where the search query matches
  activeSearchResultIndex: number; // Index in searchResults
  yankedText: string; // Vim clipboard buffer
  undoHistory: string[]; // History stack for u
  redoHistory: string[]; // History stack for .
}

export type FileFormat = 'txt' | 'md' | 'json' | 'xml' | 'py' | 'kt' | 'js' | 'ts' | 'bash' | 'tex' | 'docx' | 'java' | 'c' | 'cpp' | 'ly' | 'html' | 'css' | 'svg' | 'sql' | 'rs' | 'go';

export interface FileData {
  name: string;
  format: FileFormat;
  content: string;
}

export const sanitizeText = (text: string): string => {
  return (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

export const HELP_TEMPLATE_EN: FileData = {
  name: "help.txt",
  format: "txt",
  content: `==============================================================================
                        LIVIA MANUAL
==============================================================================

LiViA (Light Vi Again) is a hyper-lightweight, modal Vim-style text and code editor
Designed for developers, engineers,
and power users who demand terminal-grade efficiency paired with modern cloud features,
LiViA seamlessly bridges lightweight offline text editing with Google Workspace™ integration.

🔑 Key Features & Capabilities:
- Modal Editing Core: Authentic Vim experience featuring Normal, Insert, Command,
  and Visual modes. Supports core Vim motions (g, G, 2g), deletions (dd, dw, [n]dw),
  search navigation (/, n, N), undo/redo (u, .), and global string replacement (:%s/old/new/g).

- Google Workspace™ Integration: Direct two-way synchronization with Google Drive™
  and Google Docs™. Open, edit, and push code snippets, notes, or documentation back
  to your cloud storage without leaving your lightweight modal workflow.

- Google Gemini AI Assistant™: Powered by native Gemini AI™ integration to assist
  with code refactoring, text summarization, auto-completion, and inline generation
  directly inside your text buffer.

- Multi-Format & Syntax Support: Comprehensive highlighting and parser support for
  plain text, Markdown (.md), LaTeX (.tex), XML, JSON, and primary code languages
  including Python, Kotlin, JavaScript, C++, and Bash scripts.

- Document Export Suite: Export your work instantly into cleanly formatted PDF
  documents, Markdown, or TeX formats with precise line-numbering and syntax rendering.

- Cross-Platform Clipboard & UX: Native integration with Android GBoard and Linux
  (X11/Wayland) clipboards for smooth snippet tearing. Features an ultra-minimalist
  terminal interface using the DejaVu Sans Mono typography to ensure absolute visual
  distinction between ambiguous characters (l, I, 1).

- Customization & Themes: Fully customizable via configuration files. Includes native
  System Light, Dark, and OLED Dark themes.

🔒 Data Privacy & OAuth Scopes Usage:
LiViA strictly accesses user data only to read and write files explicitly selected
by the user via Google Drive™ and Google Docs™ integration. All processing for local
editor buffers remains on-device, ensuring maximal performance, security, and data privacy.

------------------------------------------------------------------------------
IN MEMORY OF BRAM MOOLENAAR
------------------------------------------------------------------------------
In memory of Bram Moolenaar (1961 - 2023), the altruistic creator of Vim. 
LiViA is a small and humble tribute to his engineering philosophy and encourages 
its users to support orphans in Uganda (via ICCF Holland).

------------------------------------------------------------------------------
1. WORKING MODES
------------------------------------------------------------------------------
- Normal Mode (NORMAL): Navigation and execution of Vim commands.
- Insert Mode (INSERT): Press 'i' (before cursor), 'a' (after cursor),
  'o' (new line below), 'O' (new line above). Press <Esc> to return to Normal mode.
- Command Mode (COMMAND): Press ':' in Normal mode to enter ex commands.
- Search Mode (SEARCH): Press '/' in Normal mode to search for text.
- Visual Mode (VISUAL): Press 'v' for text selection.

------------------------------------------------------------------------------
2. CURSOR NAVIGATION (Normal Mode)
------------------------------------------------------------------------------
- h, j, k, l or Arrows : Move Left, Down, Up, Right
- 0                  : Jump to start of line
- $                  : Jump to end of line
- w / b              : Jump forward / backward by word
- gg / G             : Jump to top / bottom of document
- 2g / 5g            : Jump to specified line number (e.g., line 2 or 5)

------------------------------------------------------------------------------
3. TEXT EDITING & REFORMATTING
------------------------------------------------------------------------------
- i / a / o / O      : Insert mode entry
- r<char>            : Replace character under cursor
- x                  : Delete character under cursor
- dd / Ndd           : Delete current line / N lines
- dw / Ndw           : Delete current word / N words
- yy / Nyy           : Copy (yank) current line / N lines
- p / P              : Paste after / before cursor
- gq                 : Wrap and reformat paragraph to 'textwidth' (e.g. 80 cols)
- u                  : Undo last change
- .                  : Repeat last edit command

------------------------------------------------------------------------------
4. CODE FOLDING (SECTION GROUPING)
------------------------------------------------------------------------------
- zc                 : Close / Fold current block or section
- zo                 : Open / Unfold current block or section
- za                 : Toggle fold state (Close/Open)
- zm                 : Fold all sections in document
- zr                 : Unfold all sections in document

------------------------------------------------------------------------------
5. EX COMMANDS (: Mode) & GOOGLE GEMINI AI
------------------------------------------------------------------------------
File & Workspace:
- :w [filename]      : Save current file to workspace or Google Drive™
- :q / :q!           : Close editor or force exit
- :e <filename>      : Open or create a file in workspace (e.g., :e report.docx,
                       :e main.py, :e .lvarc)
- :r <filename>      : Insert content of another file at cursor position

Google Gemini™ AI Commands & AI Models:
- :gem <instructions>: Process document or visual selection with Google Gemini™ AI
                       (e.g., :gem summarize in 3 points, :gem proofread grammar,
                       :gem optimize this code)
- :set model=flash   : Set Gemini™ 2.5 Flash model (Fast, free tier)
- :set model=pro     : Set Gemini™ Pro model (Advanced reasoning for complex tasks)

* Personal API Key on Google AI Studio™ (aistudio.google.com/app/apikey):
  - Metric Tracking Scope: Usage stats on Google AI Studio™ track strictly developer API calls
    (e.g., from LiViA, Python scripts, or custom SDKs). They do NOT include or affect consumer web chat
    (gemini.google.com), NotebookLM™ / Google Notebook™, or Google One™ AI Premium / Gemini Advanced™ plans.
  - Personal Key ('set key=my_key') vs Consumer Credits: Using a personal API key created on Google AI Studio™
    or LiViA's default system key draws solely from Google AI Studio™ developer Gemini API™ quotas (100% free Tier
    or Google Cloud Billing™). It NEVER consumes or reduces your Google Gemini™ web chat usage, NotebookLM™ limits,
    or Google One™ AI Premium subscription credits!
  - Target Audiences & Usage Paths:
    • General Public / End Users: Can use LiViA immediately for free without any key (using shared
      system Secrets). To get dedicated rate limits, click 1-Click to get a free API key under
      'Default Gemini Project'.
    • Developers & Live OS Creators: Can pre-configure keys in .lvarc, Settings, or URL bookmarks (?key=...).
  - Subscription vs API Plans:
    • Free Tier API (Google AI Studio™): 100% free developer API access, no credit card needed.
    • Gemini Advanced™ (Google One™ AI Premium): Consumer web chat subscription; independent from developer API Keys.

  💡 Interactive Visual Guide & Settings Reference:
  - To enter your API Key or consult the interactive visual guide "🔑 Personal API Key & Subscriptions Distinction"
    with 1-Click Google AI Studio™ generation, open the Sidebar Guide via command :he gem or :he key,
    or open Editor Settings using the gear icon in the top toolbar.

Translations, Quotations & Formatting:
- :tr <language>     : Instantly translate document or selection into specified
                       language (e.g., :tr english, :tr italian, :tr latin,
                       :tr french, :tr spanish, :tr german)
- :lat [theme]        : Generate and insert a relevant Latin quotation with
                       translation and commentary (e.g., :lat time, :lat love)
- :gdoc / :gdocs     : Open Google Docs / Word .docx export & integration module

Editor Options (:set):
- :set tw=80         : Set 'textwidth' line width for gq command
- :set syntax=on|off : Enable or disable live syntax highlighting
- :set folding=on|off: Enable or disable code folding controls
- :set number/nonu   : Show or hide line numbers
- :set wrap/nowrap   : Enable or disable automatic word wrapping
- :set theme=dark|light|system : Set visual theme
- :set lang=it|en    : Set interface language
- :set fontsize=10-48: Set editor font size (default: 16 desktop, 20 mobile)
- :%s/old/new/g      : Global find and replace
- :he / :help        : Open this complete user manual
- :he gem / :he key  : Jump directly to Gemini AI & API Key help section
- :he vim / :he cmd  : Jump directly to Vim commands help section
- :he drive          : Jump directly to Google Drive™ & Workspace help section

------------------------------------------------------------------------------
6. CUSTOM CONFIGURATION (.lvarc)
------------------------------------------------------------------------------
The virtual file '.lvarc' in your workspace is loaded automatically when LiViA
starts to apply your saved preferences. You can edit it by typing :e .lvarc or
by clicking "Open / Edit .lvarc" in the Files tab.

Example .lvarc configuration:

  set key=YOUR_GEMINI_API_KEY
  set number
  set wrap
  set syntax=on
  set textwidth=80
  set model=flash
  set folding=on
  set fontsize=12
  set theme=dark
  set lang=en

------------------------------------------------------------------------------
7. GOOGLE DRIVE™ & GOOGLE DOCS™ INTEGRATION
------------------------------------------------------------------------------
- Connect via Google OAuth to load and save files directly to Google Drive™.
- Native compatibility with plain text (.txt, .md), code files, and Word (.docx).
- Bypass "Unverified App" screen: Click "Advanced" -> "Go to LiViA (unsafe)".
How to open files in Google Drive™:
Right-click any text or document file in Google Drive™ and select "Open with" -> "LiViA Editor".

------------------------------------------------------------------------------
------------------------------------------------------------------------------
8. LOCALHOST SERVER SETUP & WEB APP (PWA) INSTALLATION
------------------------------------------------------------------------------
To run LiViA privately on your local machine without using or exposing the public
Google server URL (reducing cloud load and ensuring offline capability):

1. Prerequisites:
   - Node.js (version 18 or higher) and npm installed on your system.

2. Setup & Launch Local Server:
   - Extract the LiViA source package or clone the repository to a local folder.
   - Open a terminal in that folder and install dependencies:
       npm install
   - Start the local development server:
       npm run dev
   - The server will start locally at:
       http://localhost:3000 (or http://127.0.0.1:3000)

3. Install as Web App (PWA) from Localhost:
   - On Desktop (Linux, Windows, macOS using Chrome, Chromium, Edge, Brave):
     1. Navigate to http://localhost:3000 in your browser.
     2. Click the "Install" icon in the address bar (or Menu ⋮ -> "Save and Share" -> "Install LiViA").
     3. LiViA will now launch as a dedicated standalone window with desktop shortcuts.
   - On Android (connected to local Wi-Fi):
     1. Open Chrome and navigate to your computer's local network IP (e.g. http://192.168.1.50:3000).
     2. Tap Chrome Menu ⋮ -> "Add to Home screen" or "Install app".
     3. LiViA is installed directly on your Android device home screen.

------------------------------------------------------------------------------
9. PWA & GITHUB PAGES DEPLOYMENT
------------------------------------------------------------------------------
LiViA is built exclusively as a Progressive Web App (PWA). This means:
- No native executables: No need for .exe, .app, .dmg, or .apk files.
- Universal compatibility: Runs natively in any modern browser on any OS.
- Offline support: Utilizes Service Workers to cache resources and work completely offline.

How to deploy on GitHub Pages:
1. Ensure your dependencies are installed (npm install).
2. Build the production PWA (npm run build).
3. The generated 'dist' folder contains everything needed to deploy.
4. Deploy the 'dist' folder to your gh-pages branch or preferred static hosting.

------------------------------------------------------------------------------
10. TROUBLESHOOTING (Android Updates)
------------------------------------------------------------------------------
If you installed LiViA as an Android App (PWA) and aren't receiving the latest updates,
Chrome's Service Worker might be locking the offline cache. To force a clean update:
1. Go to Android Settings > Apps > Chrome
2. Select "Storage and cache"
3. Tap "Manage space" then "Clear all data"
⚠️ Warning: this is a radical procedure that will log you out of other Chrome websites.
Only recommended if the App refuses to update.

------------------------------------------------------------------------------
11. OVERVIEW & SUPPORTED OPERATING SYSTEMS
------------------------------------------------------------------------------
LiViA is a lightweight Vim-style text and code editor designed for maximum
productivity and portability across all devices.

Key features:
- Multi-language code highlighting and markup editing
- Native integration with Google Drive™, Google Docs™, and Google Gemini AI™
- Formatted export to PDF, DOCX, TEX, and Markdown
- Highly customizable terminal CLI interface via .lvarc configuration

Development platforms: Google™ Ecosystem
Author: Ing. Mario Fantini (https://mariofantini.eu)
Support email: support-livia-editor@googlegroups.com
License: CC BY-NC 4.0 (Non-commercial with attribution)

* Intellectual Property Notice:
This software architecture, parsing logic, and source code are the proprietary 
work of the author. Manifestations of interest for the complete acquisition 
of commercial rights and ownership buyout are welcome, subject to prior economic 
agreement, while preserving the historical and moral authorship.
==============================================================================
`
};

export const HELP_COLORS_TEMPLATE_EN: FileData = {
  name: "help_colors.md",
  format: "md",
  content: `# Color Formatting Guide in LiViA, DOCX & Google Docs

In LiViA you can apply custom text colors inside Markdown (.md) files, formatted live preview, and Microsoft Word (.docx) or Google Docs exports.

Quick commands to open this guide:
- \`:he colour md\`
- \`:he color md\`
- \`:he colors md\`

---

## 1. Color Tag Syntax
Use color tags with hex codes (#HEX) or color names:

\`\`\`markdown
<color:#3B82F6>Primary Blue Text</color>
<color:#10B981>Emerald Green Text</color>
<color:#EF4444>Highlighted Red Text</color>
<color:#8B5CF6>Accent Purple Text</color>
<color:#F59E0B>Amber / Orange Text</color>
\`\`\`

---

## 2. Live Preview and Export Compatibility
- **Live Preview**: LiViA's rendering engine interprets \`<color:#HEX>\` tags and highlights them in real-time.
- **.docx / Google Docs Export**: When exporting to Word or copying formatted text for Google Docs (\`:gdoc\`), colors are faithfully preserved as native text styles.

---

## 3. Ready-to-use Examples
- <color:#3B82F6>Important Notice: Check configuration options.</color>
- <color:#10B981>Operation Status: Completed 100% successfully.</color>
- <color:#EF4444>Critical Error: Verify access credentials.</color>
`
};

export const HELP_FIGURES_TEMPLATE_EN: FileData = {
  name: "help_figures.md",
  format: "md",
  content: `# Images, Figures & Captions Guide in LiViA and DOCX

This guide shows how to insert standard images, structured figures, and numbered captions in Markdown (.md), formatted live preview, and exported documents (.docx / Google Docs).

Quick commands to open this guide:
- \`:he figure md\`
- \`:he figures md\`

---

## 1. Standard Markdown Images
Standard syntax: \`![Alt text](Image_URL)\`

Example:
![LiViA Icon](https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/file-text.svg)

---

## 2. Structured Figures with Caption (HTML <figure>)
To group an image with a numbered caption, use HTML \`<figure>\` syntax:

\`\`\`html
<figure>
  <img src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600" alt="Workstation" />
  <figcaption>Figure 1: Workstation for code and document editing in LiViA.</figcaption>
</figure>
\`\`\`

---

## 3. Word (.docx) and Google Docs Export
- Images and figures inserted in your .md or .docx files are rendered in the live preview.
- Exporting via the "DOCX / PDF" menu or with \`:gdoc\` preserves images in the document structure.
`
};

export const HELP_TABLES_TEMPLATE_EN: FileData = {
  name: "help_tables.md",
  format: "md",
  content: `# Formatted Tables Guide (GFM Table) in LiViA and DOCX

This guide demonstrates how to create and align grid tables in GitHub Flavored Markdown (GFM) syntax for .md documents, live preview, and Microsoft Word (.docx) / Google Docs exports.

Quick commands to open this guide:
- \`:he table md\`
- \`:he tables md\`

---

## 1. GFM Table Basic Syntax
Tables use pipes \`|\` to separate columns and dashes \`---\` to separate headers from data rows.

\`\`\`markdown
| Header A | Header B | Header C |
| :--- | :---: | ---: |
| Left Data | Center Data | Right Data |
\`\`\`

---

## 2. Column Alignment
- \`:---\` : Left-aligned (default)
- \`:---:\` : Center-aligned
- \`---:\` : Right-aligned

---

## 3. Complete Example Table
| Element / Feature | Command / Syntax | Description |
| :--- | :---: | ---: |
| Color Guide | \`:he color md\` | Open text color guide |
| Figures Guide | \`:he figure md\` | Open images & figures guide |
| Tables Guide | \`:he table md\` | Open this tables guide |
| Save Document | \`:w file.docx\` | Save or export workspace |

---

## 4. Word (.docx) & Google Docs Export
GFM grid tables are automatically converted into native formatted tables with borders and styled cells when exported to .docx or copied for Google Docs.
`
};

export const HELP_FIGURES_TABLES_TEMPLATE_EN: FileData = HELP_TABLES_TEMPLATE_EN;

export function getHelpTemplate(lang: 'it' | 'en'): FileData {
  return lang === 'en' ? HELP_TEMPLATE_EN : HELP_TEMPLATE;
}

export function getHelpColorsTemplate(lang: 'it' | 'en'): FileData {
  return lang === 'en' ? HELP_COLORS_TEMPLATE_EN : HELP_COLORS_TEMPLATE;
}

export function getHelpFiguresTemplate(lang: 'it' | 'en'): FileData {
  return lang === 'en' ? HELP_FIGURES_TEMPLATE_EN : HELP_FIGURES_TEMPLATE;
}

export function getHelpTablesTemplate(lang: 'it' | 'en'): FileData {
  return lang === 'en' ? HELP_TABLES_TEMPLATE_EN : HELP_TABLES_TEMPLATE;
}

export const HELP_TEMPLATE: FileData = {
  name: "help.txt",
  format: "txt",
  content: `==============================================================================
                        MANUALE DI LIVIA
==============================================================================

LiViA (Light Vi Again) è un editor di testo e codice iper-leggero e modale in
stile Vim. Progettato per
sviluppatori, ingegneri e utenti avanzati che richiedono un'efficienza di
livello terminale unita a funzionalità cloud moderne, LiViA unisce perfettamente
l'editing di testo offline leggero con l'integrazione con Google Workspace™.

🔑 Caratteristiche e Funzionalità Chiave:
- Core di Editing Modale: Esperienza Vim autentica con modalità Normale,
  Inserimento, Comando e Visuale. Supporta i movimenti base di Vim (g, G, 2g),
  eliminazioni (dd, dw, [n]dw), navigazione e ricerca (/, n, N),
  annulla/ripristina (u, .), e sostituzione globale di stringhe
  (:%s/vecchio/nuovo/g).

- Integrazione Google Workspace™: Sincronizzazione diretta bidirezionale con
  Google Drive™ e Google Docs™. Apri, modifica e invia frammenti di codice, note
  o documentazione al tuo spazio cloud senza lasciare il tuo flusso di lavoro
  modale.

- Assistente IA Google Gemini™: Alimentato dall'integrazione nativa di Gemini AI™
  per assistere con il refactoring del codice, la riassunzione di testi, il
  completamento automatico e la generazione inline direttamente nel tuo buffer
  di testo.

- Supporto Multi-Formato e Sintassi: Evidenziazione completa della sintassi e
  supporto per testo semplice, Markdown (.md), LaTeX (.tex), XML, JSON e i
  principali linguaggi di programmazione tra cui Python, Kotlin, JavaScript, C++
  e script Bash.

- Suite di Esportazione Documenti: Esporta istantaneamente il tuo lavoro in
  documenti PDF formattati in modo pulito, formati Markdown o TeX con
  numerazione precisa delle righe e resa della sintassi.

- Appunti Cross-Platform & UX: Integrazione nativa con la tastiera GBoard di
  Android e gli appunti di Linux (X11/Wayland). Interfaccia terminale
  ultra-minimalista che utilizza la tipografia DejaVu Sans Mono per garantire
  un'assoluta distinzione visiva tra caratteri ambigui (l, I, 1).

- Personalizzazione e Temi: Completamente personalizzabile tramite file di
  configurazione. Include temi nativi Chiaro di Sistema, Scuro e Scuro OLED.

🔒 Privacy dei Dati e Uso degli Scope OAuth:
LiViA accede ai dati dell'utente esclusivamente per leggere e scrivere i file
selezionati esplicitamente dall'utente tramite l'integrazione con Google Drive™
e Google Docs™. Tutta l'elaborazione per i buffer dell'editor locale rimane sul
dispositivo, garantendo massime prestazioni, sicurezza e privacy dei dati.

------------------------------------------------------------------------------
IN MEMORIA DI BRAM MOOLENAAR
------------------------------------------------------------------------------
In memoria di Bram Moolenaar (1961 - 2023), l'altruista creatore di Vim.
LiViA è un piccolo e umile omaggio alla sua filosofia ingegneristica e invita
i suoi utenti a sostenere gli orfani in Uganda (tramite ICCF Holland).

------------------------------------------------------------------------------
1. MODALITÀ DI LAVORO
------------------------------------------------------------------------------
- Modalità Normale (NORMAL)  : Navigazione ed esecuzione comandi Vim.
- Modalità Inserimento (INSERT): Premi 'i' (prima del cursore), 'a' (dopo il cursore),
  'o' (nuova riga sotto), 'O' (nuova riga sopra). Premi <Esc> per tornare a NORMAL.
- Modalità Comando (COMMAND) : Premi ':' in Modalità Normale per i comandi ex.
- Modalità Ricerca (SEARCH)  : Premi '/' in Modalità Normale per cercare testo.
- Modalità Visuale (VISUAL)  : Premi 'v' per la selezione del testo.

------------------------------------------------------------------------------
2. MOVIMENTO DEL CURSORE (Modalità Normale)
------------------------------------------------------------------------------
- h, j, k, l o Frecce : Spostamento Sinistra, Giù, Su, Destra
- 0                  : Salta a inizio riga
- $                  : Salta a fine riga
- w / b              : Avanza / Arretra di una parola
- gg / G             : Salta a inizio / fine documento
- 2g / 5g            : Salta alla riga specificata (es: riga 2 o 5)

------------------------------------------------------------------------------
3. MODIFICA ED ELIMINAZIONE DEL TESTO
------------------------------------------------------------------------------
- i / a / o / O      : Entra in modalità inserimento
- r<carattere>        : Sostituisce il carattere sotto il cursore
- x                  : Elimina il carattere sotto il cursore
- dd / Ndd           : Elimina la riga corrente / N righe
- dw / Ndw           : Elimina la parola corrente / N parole
- yy / Nyy           : Copia (yank) la riga corrente / N righe
- p / P              : Incolla dopo / prima del cursore
- gq                 : Formatta e spezza il paragrafo alla larghezza 'textwidth' (es. 80 col)
- u                  : Annulla l'ultima modifica (Undo)
- .                  : Ripristina l'ultima modifica annullata (Redo)

------------------------------------------------------------------------------
4. CODE FOLDING (RAGGRUPPAMENTO SEZIONI)
------------------------------------------------------------------------------
- zc                 : Chiudi (Fold) il blocco o sezione corrente
- zo                 : Apri (Unfold) il blocco o sezione corrente
- za                 : Inverti lo stato di chiusura/apertura (Toggle)
- zm                 : Comprimi tutte le sezioni del documento
- zr                 : Espandi tutte le sezioni del documento

------------------------------------------------------------------------------
5. COMANDI EX (Modalità :) E IA GOOGLE GEMINI
------------------------------------------------------------------------------
File & Workspace:
- :w [nomefile]      : Salva il file corrente nel workspace o Google Drive™
- :q / :q!           : Chiudi l'editor o forza l'uscita
- :e <nomefile>      : Apri o crea un file nel workspace (es: :e report.docx,
                       :e main.py, :e .lvarc)
- :r <nomefile>      : Inserisci il contenuto di un file nella posizione del cursore

Google Gemini™ AI & Modelli IA:
- :gem <istruzioni>  : Elabora il documento o la selezione con Google Gemini™ AI
                       (es: :gem riassumi in 3 punti, :gem correggi grammatica,
                       :gem ottimizza questo codice)
- :set model=flash   : Imposta modello Gemini™ 2.5 Flash (Veloce, tier gratuito)
- :set model=pro     : Imposta modello Gemini™ Pro (Ragionamento avanzato)

* API Key Personale Google AI Studio™ (aistudio.google.com/app/apikey):
  - Tracciamento Consumi & Statistiche: Le metriche su Google AI Studio™ misurano unicamente le
    chiamate API programmatiche (es. effettuate da LiViA, da script o SDK). NON includono e NON
    intaccano la chat web/app Gemini™, NotebookLM™ / Google Notebook™, né l'abbonamento consumer Google One™ AI Premium.
  - Chiave Personale ('set key=chiave_mia') e Crediti Consumer: Usare una chiave personale creata su
    Google AI Studio™ o la chiave di sistema di default di LiViA attinge unicamente alla quota sviluppatore
    Gemini API™ di Google AI Studio™ (100% gratuita nel Free Tier o regolata da Google Cloud Billing™).
    NON consuma e NON riduce in alcun modo la tua quota di Google Gemini™ web chat, i limiti di NotebookLM™,
    né i crediti dell'abbonamento Google One™ AI Premium!
  - Pubblico di Riferimento & Modalità d'Uso:
    • Utenti Generici / Pubblico Finale: Possono usare LiViA subito a costo zero (tramite la chiave
      di sistema condivisa). Per quota dedicata, velocità prioritaria e azzeramento code, basta un clic
      su '1-Click API Key' per generare gratuitamente la propria chiave su Google AI Studio™.
    • Sviluppatori & Creatori Live OS: Possono pre-configurare la chiave nei file .lvarc, nelle Impostazioni
      o con preferiti URL (?key=...) per avvii istantanei su sistemi Linux Live.
  - Piani & Crediti (Free Tier vs Pay-As-You-Go):
    • Free Tier API (Google AI Studio™): 100% gratuito per tutti gli account Google ($0, nessuna carta di credito).
      Include già una finestra di contesto fino a 2 Milioni di token (ideale per grandi file DOCX, PDF e codice)
      con quota riservata sia per Flash che per Gemini Pro.
    • Pay-As-You-Go (Google Cloud Billing™): Opzionale per sviluppatori ed aziende che necessitano di pipeline
      di chiamate API automatizzate ad alta frequenza senza limiti di rate. Non necessario per l'uso normale.
    • Abbonamenti Consumer (Google One™ AI Premium / Gemini Advanced™): Riguardano unicamente la chat web Gemini™
      e NotebookLM™. Non forniscono né influenzano l'accesso alle API Key di Google AI Studio™.

  💡 Riferimento Guida Grafica & Impostazioni:
  - Per inserire la tua API Key o consultare la guida grafica interattiva '🔑 Chiave API Personale & Distinzione Abbonamenti'
    con il pulsante 1-Click per Google AI Studio™, apri la Guida Laterale con il comando :he gem o :he key,
    oppure apri le Impostazioni con l'icona ingranaggio nella barra in alto.

Traduzioni, Citazioni & Formattazione:
- :tr <lingua>       : Traduci all'istante il documento o la selezione nella lingua
                       richiesta (es: :tr inglese, :tr italiano, :tr latino, :tr spagnolo)
- :lat [tema]        : Genera e inserisci una citazione latina pertinente con traduzione
                       e commento (es: :lat tempo, :lat amore)
- :gdoc / :gdocs     : Apri il modulo di integrazione ed esportazione Google Docs / Word

Opzioni Editor (:set):
- :set tw=80         : Imposta larghezza riga 'textwidth' per il comando gq
- :set syntax=on|off : Attiva o disattiva l'evidenziazione della sintassi
- :set folding=on|off: Attiva o disattiva il Code Folding delle sezioni
- :set number/nonu   : Mostra o nascondi i numeri di riga
- :set wrap/nowrap   : Attiva o disattiva il testo a capo automatico
- :set theme=dark|light|system : Imposta il tema visivo
- :set lang=it|en    : Imposta la lingua dell'interfaccia
- :set fontsize=10-48: Imposta la dimensione del font dell'editor (default: 16 desktop, 20 mobile)
- :%s/vecchio/nuovo/g: Cerca e sostituisci in tutto il file
- :he / :help        : Apri questo manuale completo di istruzioni
- :he gem / :he key  : Salta direttamente alla sezione Guida Gemini AI & API Key
- :he vim / :he cmd  : Salta direttamente alla sezione Guida Comandi Vim
- :he drive          : Salta direttamente alla sezione Guida Google Drive™ & Workspace
- :he color md       : Apri la guida alla formattazione colori
- :he figure md      : Apri la guida a immagini e figure
- :he table md       : Apri la guida alle tabelle GFM

------------------------------------------------------------------------------
6. CONFIGURAZIONE PERSONALIZZATA (.lvarc)
------------------------------------------------------------------------------
Il file virtuale '.lvarc' nel tuo workspace viene caricato automaticamente
all'avvio di LiViA per applicare le preferenze salvate. Puoi modificarlo digitando
:e .lvarc oppure cliccando "Apri / Modifica .lvarc" nella scheda File.

Esempio di configurazione .lvarc:

  set key=LA_TUA_API_KEY
  set number
  set wrap
  set syntax=on
  set textwidth=80
  set model=flash
  set folding=on
  set fontsize=12
  set theme=dark
  set lang=it

------------------------------------------------------------------------------
7. INTEGRAZIONE GOOGLE DRIVE™ & GOOGLE DOCS™
------------------------------------------------------------------------------
- Connettiti tramite Google OAuth per caricare e salvare file direttamente su Google Drive™.
- Compatibilità nativa con testo semplice (.txt, .md), file di codice e Word (.docx).
- Superamento schermata "App non verificata": Clicca su "Avanzate" -> "Apri LiViA (non sicura)".

Apertura e modifica file su Google Drive™:
Fai clic con il tasto destro del mouse su qualsiasi file in Google Drive™ e seleziona "Apri con" -> "LiViA Editor".

------------------------------------------------------------------------------
------------------------------------------------------------------------------
8. AVVIO SERVER LOCALHOST & INSTALLAZIONE WEB APP (PWA)
------------------------------------------------------------------------------
Per eseguire LiViA privatamente sul tuo computer o rete locale senza utilizzare
né divulgare l'URL pubblico di Google (azzerando il carico sui server cloud e
lavorando in completa privacy anche offline):

1. Prerequisiti:
   - Node.js (versione 18 o superiore) e npm installati nel sistema.

2. Avvio del Server Locale:
   - Estrai il pacchetto sorgente di LiViA o clona il repository in una cartella.
   - Apri un terminale nella cartella ed installa le dipendenze:
       npm install
   - Avvia il server di sviluppo locale:
       npm run dev
   - Il server locale sarà immediatamente attivo su:
       http://localhost:3000 (oppure http://127.0.0.1:3000)

3. Installazione come Web App (PWA) da Localhost:
   - Su Desktop (Linux, Windows, macOS con Chrome, Chromium, Edge, Brave):
     1. Visita http://localhost:3000 nel browser.
     2. Clicca sull'icona "Installa" nella barra degli indirizzi (oppure Menu ⋮ -> "Salva e condividi" -> "Installa LiViA").
     3. LiViA funzionerà come una vera app nativa a finestra dedicata con icona desktop.
   - Su Android (collegato alla rete Wi-Fi locale):
     1. Apri Chrome sull'IP del tuo PC locale (es. http://192.168.1.50:3000).
     2. Tocca il Menu ⋮ di Chrome -> "Aggiungi a schermata Home" / "Installa app".
     3. LiViA verrà installata direttamente tra le app del tuo dispositivo Android.

------------------------------------------------------------------------------
9. DEPLOYMENT PWA & GITHUB PAGES
------------------------------------------------------------------------------
LiViA è sviluppata esclusivamente come Progressive Web App (PWA). Questo significa:
- Nessun eseguibile nativo: Non sono necessari file .exe, .app, .dmg o .apk.
- Compatibilità universale: Funziona nativamente in qualsiasi browser moderno su ogni OS.
- Supporto offline: Sfrutta i Service Workers per l'utilizzo anche senza connessione.

Come pubblicare su GitHub Pages:
1. Assicurati che le dipendenze siano installate (npm install).
2. Effettua la build della PWA (npm run build).
3. La cartella 'dist' generata contiene tutti i file necessari.
4. Pubblica il contenuto della cartella 'dist' sul tuo branch gh-pages o sull'hosting statico preferito.

------------------------------------------------------------------------------
10. RISOLUZIONE PROBLEMI (Aggiornamenti Android)
------------------------------------------------------------------------------
Se hai installato LiViA come App su Android (PWA) e non ricevi gli ultimi aggiornamenti,
il Service Worker di Chrome potrebbe bloccarli nella cache offline. Per forzare un aggiornamento pulito:
1. Vai in Impostazioni Android > App > Chrome
2. Seleziona "Spazio di archiviazione e cache"
3. Tocca "Gestisci spazio" e poi "Elimina tutti i dati"
⚠️ Attenzione: questa procedura è radicale e ti disconnetterà dagli altri siti su Chrome.
È consigliata solo se l'App non si aggiorna in alcun modo.

------------------------------------------------------------------------------
11. PRESENTAZIONE E SISTEMI OPERATIVI SUPPORTATI
------------------------------------------------------------------------------
LiViA è un editor di testo e codice leggero in stile Vim, progettato per
garantire la massima produttività e portabilità su qualsiasi dispositivo.

Caratteristiche principali:
- Supporto per molteplici linguaggi di programmazione e markup
- Integrazione nativa con Google Drive™, Google Docs™ e Google Gemini AI™
- Esportazione formattata in PDF, DOCX, TEX e Markdown
- Interfaccia da terminale altamente personalizzabile tramite .lvarc

Piattaforme di sviluppo: Ecosistema Google™
Autore: Ing. Mario Fantini (https://mariofantini.eu)
Email di supporto: support-livia-editor@googlegroups.com
Licenza: CC BY-NC 4.0 (Non commerciale con attribuzione)

* Avviso sulla Proprietà Intellettuale:
Questa architettura software, logica di parsing e codice sorgente sono opera 
proprietaria dell'autore. Manifestazioni di interesse per l'acquisizione completa 
dei diritti commerciali e il buyout di proprietà sono ben accette, previo accordo 
economico, pur preservando la paternità storica e morale.
==============================================================================
`
};

export const HELP_COLORS_TEMPLATE: FileData = {
  name: "help_colors.md",
  format: "md",
  content: `# Guida Formattazione Colori in LiViA e DOCX / Google Docs

In LiViA puoi applicare colori personalizzati al testo all'interno di file Markdown (.md), anteprima formattata ed esportazione Microsoft Word (.docx) o Google Docs.

Comandi rapidi per aprire questa guida:
- \`:he colour md\`
- \`:he color md\`
- \`:he colors md\`

---

## 1. Sintassi Tag Colore
Usa la sintassi dei tag colore con codice esadecimale (#HEX) oppure nome colore:

\`\`\`markdown
<color:#3B82F6>Testo in Blu Primario</color>
<color:#10B981>Testo in Verde Smeraldo</color>
<color:#EF4444>Testo in Rosso Evidenziato</color>
<color:#8B5CF6>Testo in Viola Accento</color>
<color:#F59E0B>Testo in Ambra / Arancione</color>
\`\`\`

---

## 2. Risultato Live e Compatibilità Esportazione
- **Anteprima Live**: Il motore di rendering di LiViA interpreta i tag \`<color:#HEX>\` evidenziandoli istantaneamente nel colore scelto.
- **Esportazione .docx / Google Docs**: Durante l'esportazione in Word o il copia-incolla formattato per Google Docs (\`:gdoc\`), i colori vengono preservati fedelmente come stili di testo nativi.

---

## 3. Esempi Pratici Pronti all'Uso
- <color:#3B82F6>Avviso Importante: Controllare la configurazione.</color>
- <color:#10B981>Stato Operazione: Successo completato al 100%.</color>
- <color:#EF4444>Errore Critico: Verifica le credenziali di accesso.</color>
`
};

export const HELP_FIGURES_TEMPLATE: FileData = {
  name: "help_figures.md",
  format: "md",
  content: `# Guida Immagini, Figure e Didascalie (Caption) in LiViA e DOCX

Questa guida illustra come inserire immagini standard, figure strutturate e didascalie (caption) in Markdown (.md), nell'anteprima formattata e nei documenti esportati (.docx / Google Docs).

Comandi rapidi per aprire questa guida:
- \`:he figure md\`
- \`:he figures md\`

---

## 1. Immagini Semplici in Markdown
Sintassi standard: \`![Testo alternativo](URL_immagine)\`

Esempio:
![Logo LiViA](https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/file-text.svg)

---

## 2. Figure Strutturate con Didascalia (HTML <figure>)
Per raggruppare un'immagine con la relativa didascalia numerata (caption), utilizza la sintassi HTML \`<figure>\`:

\`\`\`html
<figure>
  <img src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600" alt="Stazione di Lavoro" />
  <figcaption>Figura 1: Stazione di lavoro per lo sviluppo di codice e documenti in LiViA.</figcaption>
</figure>
\`\`\`

---

## 3. Esportazione in Word (.docx) e Google Docs
- Le immagini e le figure inserite nei tuoi file .md o .docx vengono renderizzate nell'anteprima formattata.
- Esportando il file tramite il menu "DOCX / PDF" o con il comando \`:gdoc\`, le immagini vengono mantenute nella struttura finale del documento.
`
};

export const HELP_TABLES_TEMPLATE: FileData = {
  name: "help_tables.md",
  format: "md",
  content: `# Guida Tabelle Formattate (GFM Table) in LiViA e DOCX

Questa guida illustra come creare e allineare tabelle a griglia in sintassi GitHub Flavored Markdown (GFM) per documenti .md, anteprima formattata ed esportazione Microsoft Word (.docx) / Google Docs.

Comandi rapidi per aprire questa guida:
- \`:he table md\`
- \`:he tables md\`

---

## 1. Sintassi Base Tabella GFM
Le tabelle usano la barra verticale \`|\` per separare le colonne e i trattini \`---\` per separare l'intestazione dai dati.

\`\`\`markdown
| Intestazione A | Intestazione B | Intestazione C |
| :--- | :---: | ---: |
| Dati Sinistra | Dati Centro | Dati Destra |
\`\`\`

---

## 2. Allineamento delle Colonne
- \`:---\` : Allineato a Sinistra (predefinito)
- \`:---:\` : Allineato al Centro
- \`---:\` : Allineato a Destra

---

## 3. Esempio Tabella Completa
| Elemento / Funzione | Comando / Sintassi | Descrizione |
| :--- | :---: | ---: |
| Guida Colori | \`:he color md\` | Apri guida colori testo |
| Guida Figure | \`:he figure md\` | Apri guida immagini e didascalie |
| Guida Tabelle | \`:he table md\` | Apri questa guida tabelle |
| Salva Documento | \`:w file.docx\` | Salva o esporta il workspace |

---

## 4. Esportazione in Word (.docx) e Google Docs
Le tabelle formattate in sintassi GFM vengono convertite automaticamente in tabelle griglia formattate con bordi e celle distinte quando esportate in formato .docx o copiate per Google Docs.
`
};

export const HELP_FIGURES_TABLES_TEMPLATE: FileData = HELP_TABLES_TEMPLATE;

export const TEMPLATES: Record<string, FileData> = {
  txt: {
    name: "esempio.txt",
    format: "txt",
    content: `Benvenuto in LiViA (Light Vi Again)!
Un editor in stile Vim super leggero.

Questo è un semplice file di testo. Qui sotto puoi verificare la magnifica
distinzione dei caratteri nel font "DejaVu Sans Mono":

  - Lettera l (elle minuscola): l
  - Lettera I (i maiuscola): I
  - Numero 1 (uno): 1

Prova a leggerli uno di fianco all'altro per notare la differenza:
  l I 1  |  lI1  |  1Il

Usa i tasti h, j, k, l per muoverti in modalità Normal.
Premi 'i' per entrare in modalità INSERT. Premi 'Esc' per tornare qui.
Inserisci comandi con ':' come :w (salva), :r (leggi file), o ZZ (salva ed esci).`
  },
  md: {
    name: "guida_livia.md",
    format: "md",
    content: `# 🪶 LiViA (Light Vi Again): Editor Vim Leggero

LiViA (omaggio al bellissimo nome italiano di origine romana Livia) è l'editor ideale per scrivere codice e appunti.

## ⌨️ Comandi Principali (Normal Mode)

- **i** : Entra in *Insert Mode* per digitare testo.
- **Esc** : Torna in *Normal Mode*.
- **h, j, k, l** : Navigazione a sinistra, in basso, in alto, a destra.
- **g** / **G** : Vai all'inizio / alla fine (es. **2g** va alla riga 2).
- **dd** : Elimina la riga corrente.
- **dw** : Elimina la parola corrente.
- **x** : Cancella il carattere sotto il cursore.
- **u** : Annulla l'ultima modifica (Undo).
- **.** : Ripristina la modifica annullata (Redo).
- **/** : Avvia la ricerca (es. **/livi**). Premi **n** per il successivo, **N** per il precedente.
- **:** : Comando di sistema (es. **:%s/vecchio/nuovo/g** per sostituire globalmente).

## 🖋️ Test Tipografico
Grazie al font **DejaVu Sans Mono**, puoi distinguere chiaramente:
- Elle minuscola: \`l\`
- I maiuscola: \`I\`
- Numero uno: \`1\`

\`\`\`
Esempio di codice: lI1 (l, I, 1)
\`\`\`
`
  },
  py: {
    name: "script.py",
    format: "py",
    content: `# -*- coding: utf-8 -*-
# LiViA Editor - Python Code Demonstration

def test_distinction():
    """
    Verifica la leggibilità dei caratteri critici:
    l (elle minuscola), I (i maiuscola), 1 (numero uno)
    """
    l = "lower_l"
    I = "upper_i"
    val_1 = 1
    
    # Notare come sono chiaramente diversi!
    items = [l, I, val_1]
    for idx, item in enumerate(items, start=1):
        print(f"[{idx}] Valore: {item}")

if __name__ == "__main__":
    print("Inizio test tipografico LiViA:")
    test_distinction()
`
  },
  kt: {
    name: "App.kt",
    format: "kt",
    content: `package com.livia.editor

/**
 * LiViA Editor - Kotlin Sample for Android
 */
class LiviaApp {
    private val appName: String = "LiViA"
    private val version: Double = 1.0

    fun displayInfo() {
        // Test di distinzione caratteri: l, I, 1
        val list = listOf('l', 'I', '1')
        println("Benvenuto in $appName v$version")
        list.forEachIndexed { index, char ->
            println("Carattere \${index + 1}: $char")
        }
    }
}

fun main() {
    val app = LiviaApp()
    app.displayInfo()
}
`
  },
  js: {
    name: "editor.js",
    format: "js",
    content: `/**
 * LiViA - Vim-style Minimalist Editor
 * Core javascript logic for character analysis.
 */

function analyzeCharacters() {
  const l = 'l'; // elle minuscola
  const I = 'I'; // i maiuscola
  const one = '1'; // numero uno

  console.log("Analisi caratteri LiViA:");
  console.log(\`l === I ? \${l === I}\`);
  console.log(\`I === 1 ? \${I === one}\`);
  
  return {
    curvedL: l,
    serifI: I,
    flagOne: one
  };
}

analyzeCharacters();
`
  },
  json: {
    name: "config.json",
    format: "json",
    content: `{
  "nomeApp": "LiViA",
  "versione": "1.0.0",
  "descrizione": "Editor leggero in stile Vim per Android, Linux e Web",
  "font": "DejaVu Sans Mono",
  "funzionalita": {
    "modalita": ["normal", "insert", "command", "search", "visual"],
    "esportazionePdf": true,
    "sincronizzazioneAppunti": true,
    "supportoAi": "Google Gemini"
  },
  "testTipografia": {
    "elleMinuscola": "l",
    "iMaiuscola": "I",
    "numeroUno": "1",
    "confronto": "lI1"
  }
}
`
  },
  xml: {
    name: "AndroidManifest.xml",
    format: "xml",
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/apk/res/android"
    package="com.livia.editor">

    <!-- LiViA Editor configuration for Android screen -->
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="LiViA"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:theme="@style/Theme.LiViA">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`
  },
  ts: {
    name: "main.ts",
    format: "ts",
    content: `/**
 * LiViA Editor - TypeScript (TS) Code Demonstration
 */

interface LiviaConfig {
  theme: 'light' | 'dark';
  fontSize: number;
  wordWrap: boolean;
}

class LiviaEditor {
  private config: LiviaConfig;
  public static readonly VERSION: string = "1.0.0";

  constructor(options: Partial<LiviaConfig> = {}) {
    this.config = {
      theme: 'dark',
      fontSize: 12,
      wordWrap: true,
      ...options
    };
  }

  public getTheme(): string {
    return this.config.theme;
  }

  public checkTypography(l: string, I: string, one: string): boolean {
    // Check characters: l (ell), I (eye), 1 (one)
    console.log("TS Typo Check:", l, I, one);
    return l !== I && I !== one;
  }

  public runMainLoop(): void {
    const list = [1, 2, 3];
    for (const item of list) {
      if (item > 1) {
        console.log("Loop iteration:", item);
      }
    }
  }
}

const editor = new LiviaEditor();
editor.runMainLoop();
`
  },
  bash: {
    name: "setup.sh",
    format: "bash",
    content: `#!/bin/bash
# LiViA Editor - Shell/Bash Script Example

APP_NAME="LiViA"
VERSION="1.0"
INSTALL_DIR="/usr/local/bin"

echo "Configurazione di $APP_NAME v$VERSION per Debian/Linux..."

function check_dependencies() {
  local dep_count=0
  for cmd in node npm git; do
    if command -v "$cmd" &> /dev/null; then
      echo "[OK] Dipendenza trovata: $cmd"
      dep_count=$((dep_count + 1))
    else
      echo "[ERRORE] Dipendenza mancante: $cmd"
    fi
  done
  return $dep_count
}

if check_dependencies; then
  echo "Tutte le dipendenze verificate con successo."
else
  echo "Attenzione: alcune dipendenze mancano."
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)
      echo "Esecuzione di prova attiva."
      shift
      ;;
    *)
      echo "Parametro sconosciuto: $1"
      exit 1
      ;;
  esac
done
`
  },
  tex: {
    name: "documento.tex",
    format: "tex",
    content: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}

\\title{LiViA Editor - LaTeX Document}
\\author{Ing. Mario Fantini}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduzione}
Benvenuto in \\textbf{LiViA Editor}! Questo è un documento LaTeX dimostrativo.

\\section{Equazioni Matematiche}
Di seguito una semplice equazione inserita in un ambiente \\texttt{equation}:
\\begin{equation}
    E = mc^2
\\end{equation}

E un'equazione più complessa con frazioni e integrali:
\\begin{equation}
    \\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
\\end{equation}

\\section{Elenchi Puntati}
Ecco un elenco dimostrativo:
\\begin{itemize}
    \\item Primo elemento: l (elle minuscola)
    \\item Secondo elemento: I (i maiuscola)
    \\item Terzo elemento: 1 (numero uno)
\\end{itemize}

\\end{document}
`
  },
  docx: {
    name: "relazione.docx",
    format: "docx",
    content: `# Intestazione Titolo Principale (DOCX)
## Sotto-intestazione Livello 2
### Sezione Dettagli Livello 3

Questo è un documento Microsoft Word (DOCX) modificabile con formattazione rapida in LiViA.

Elenco puntato con rientri:
- [Azzurro] Primo punto elenco principale
  - [Verde] Sotto-punto rientrato di livello 2
    - [Viola] Sotto-punto ulteriormente rientrato di livello 3
- [Rosso] Secondo punto elenco principale

Testo colorato e stili:
- <color:#3B82F6>Testo in Blu Primario</color>
- <color:#10B981>Testo in Verde Smeraldo</color>
- <color:#EF4444>Testo in Rosso Evidenziato</color>
- **Testo in Grassetto** e *Testo in Corsivo*
`
  },
  java: {
    name: "Main.java",
    format: "java",
    content: `package com.livia.editor;

/**
 * LiViA Editor - Java Demonstration
 */
public class Main {
    public static void main(String[] args) {
        // Test di distinzione caratteri: l (elle minuscola), I (i maiuscola), 1 (numero uno)
        char lowerL = 'l';
        char upperI = 'I';
        int numberOne = 1;

        System.out.println("Benvenuto in LiViA Java Editor!");
        System.out.printf("Test caratteri: %c %c %d%n", lowerL, upperI, numberOne);

        int[] numeri = {10, 20, 30, 40};
        for (int n : numeri) {
            if (n > 15) {
                System.out.println("Valore maggiore di 15: " + n);
            }
        }
    }
}
`
  },
  c: {
    name: "main.c",
    format: "c",
    content: `#include <stdio.h>
#include <stdlib.h>

/*
 * LiViA Editor - C Language Demonstration
 */
int main(void) {
    // Test distinzione caratteri: l, I, 1
    char l = 'l';
    char I = 'I';
    int num1 = 1;

    printf("Benvenuto in LiViA Editor per C!\n");
    printf("Caratteri: %c %c %d (lI1)\n", l, I, num1);

    for (int i = 0; i < 5; i++) {
        if (i % 2 == 0) {
            printf("Indice pari: %d\n", i);
        }
    }

    return 0;
}
`
  },
  cpp: {
    name: "main.cpp",
    format: "cpp",
    content: `#include <iostream>
#include <vector>
#include <string>

// LiViA Editor - C++ Language Demonstration
class LiviaEngine {
private:
    std::string appName;
    double version;

public:
    LiviaEngine(std::string name, double v) : appName(name), version(v) {}

    void run() {
        std::cout << "Avvio " << appName << " v" << version << " (C++ Engine)\n";
        
        // Test caratteri: l, I, 1
        std::vector<std::string> test = {"l", "I", "1"};
        for (const auto& item : test) {
            std::cout << "Elemento: " << item << "\n";
        }
    }
};

int main() {
    LiviaEngine app("LiViA", 1.0);
    app.run();
    return 0;
}
`
  },
  ly: {
    name: "spartito.ly",
    format: "ly",
    content: `\\version "2.24.0"

\\header {
  title = "Inno alla Gioia (Ode to Joy)"
  composer = "Ludwig van Beethoven"
  arranger = "Trascrizione per LiViA Editor"
}

\\paper {
  #(set-paper-size "a4")
}

global = {
  \\key c \\major
  \\time 4/4
  \\tempo "Allegro assai" 4 = 120
}

melody = \\relative c' {
  \\global
  % Frase 1: Note principali
  e4 e f g | g f e d | c c d e | e4. d8 d2 |
  
  % Frase 2
  e4 e f g | g f e d | c c d e | d4. c8 c2 |
  
  \\bar "|."
}

harmonies = \\chordmode {
  c1 c c g
  c c c2 g c1
}

\\score {
  <<
    \\new ChordNames \\harmonies
    \\new Staff { \\melody }
  >>
  \\layout { }
  \\midi { }
}
`
  },
  html: {
    name: "index.html",
    format: "html",
    content: `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>LiViA Web Document</title>
    <style>
        body { font-family: monospace; background: #0d0f12; color: #e0e0e0; padding: 20px; }
        h1 { color: #8ab4f8; }
        .highlight { color: #10b981; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Benvenuto in LiViA Editor</h1>
    <p>Distinzione caratteri: <span class="highlight">l I 1</span></p>
    <button onclick="console.log('LiViA HTML')">Invia</button>
</body>
</html>
`
  },
  css: {
    name: "styles.css",
    format: "css",
    content: `/* LiViA Editor - Custom CSS Stylesheet */
:root {
  --primary-color: #3b82f6;
  --bg-dark: #0d0f12;
  --text-light: #e0e0e0;
}

body {
  font-family: 'DejaVu Sans Mono', monospace;
  background-color: var(--bg-dark);
  color: var(--text-light);
  margin: 0;
  padding: 16px;
}

.editor-container {
  border: 1px solid #2d2d2d;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}
`
  },
  sql: {
    name: "schema.sql",
    format: "sql",
    content: `-- LiViA Editor - SQL Database Schema Example

CREATE TABLE IF NOT EXISTS utenti (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO utenti (username, email) 
VALUES ('mario', 'mario@example.com'),
       ('livia', 'livia@example.com');

SELECT id, username, email 
FROM utenti 
WHERE id >= 1 
ORDER BY data_creazione DESC;
`
  },
  rs: {
    name: "main.rs",
    format: "rs",
    content: `// LiViA Editor - Rust Language Demonstration

fn main() {
    let app_name = "LiViA";
    let version = 1.0;

    println!("Benvenuto in {} v{} (Rust)", app_name, version);

    // Test distinzione caratteri: l, I, 1
    let chars = vec!['l', 'I', '1'];
    for (i, c) in chars.iter().enumerate() {
        println!("[{}] Carattere: {}", i + 1, c);
    }
}
`
  },
  go: {
    name: "main.go",
    format: "go",
    content: `package main

import "fmt"

// LiViA Editor - Go Language Example
func main() {
	appName := "LiViA"
	fmt.Printf("Benvenuto in %s (Go Engine)\n", appName)

	// Test distinzione caratteri: l, I, 1
	letters := []rune{'l', 'I', '1'}
	for idx, char := range letters {
		fmt.Printf("[%d] Rune: %c\n", idx+1, char)
	}
}
`
  },
  help_colors: {
    name: "help_colors.md",
    format: "md",
    content: `# Guida Formattazione Colori in LiViA e DOCX / Google Docs

In LiViA puoi applicare colori personalizzati al testo all'interno di file Markdown (.md), anteprima formattata ed esportazione Microsoft Word (.docx) o Google Docs.

Comandi rapidi per aprire questa guida:
- \`:he colour md\`
- \`:he color md\`
- \`:he colors md\`

---

## 1. Sintassi Tag Colore
Usa la sintassi dei tag colore con codice esadecimale (#HEX) oppure nome colore:

\`\`\`markdown
<color:#3B82F6>Testo in Blu Primario</color>
<color:#10B981>Testo in Verde Smeraldo</color>
<color:#EF4444>Testo in Rosso Evidenziato</color>
<color:#8B5CF6>Testo in Viola Accento</color>
<color:#F59E0B>Testo in Ambra / Arancione</color>
\`\`\`

---

## 2. Risultato Live e Compatibilità Esportazione
- **Anteprima Live**: Il motore di rendering di LiViA interpreta i tag \`<color:#HEX>\` evidenziandoli istantaneamente nel colore scelto.
- **Esportazione .docx / Google Docs**: Durante l'esportazione in Word o il copia-incolla formattato per Google Docs (\`:gdoc\`), i colori vengono preservati fedelmente come stili di testo nativi.

---

## 3. Esempi Pratici Pronti all'Uso
- <color:#3B82F6>Avviso Importante: Controllare la configurazione.</color>
- <color:#10B981>Stato Operazione: Successo completato al 100%.</color>
- <color:#EF4444>Errore Critico: Verifica le credenziali di accesso.</color>
`
  },
  help_figures: {
    name: "help_figures.md",
    format: "md",
    content: `# Guida Immagini, Figure e Didascalie (Caption) in LiViA e DOCX

Questa guida illustra come inserire immagini standard, figure strutturate e didascalie (caption) in Markdown (.md), nell'anteprima formattata e nei documenti esportati (.docx / Google Docs).

Comandi rapidi per aprire questa guida:
- \`:he figure md\`
- \`:he figures md\`

---

## 1. Immagini Semplici in Markdown
Sintassi standard: \`![Testo alternativo](URL_immagine)\`

Esempio:
![Logo LiViA](https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/file-text.svg)

---

## 2. Figure Strutturate con Didascalia (HTML <figure>)
Per raggruppare un'immagine con la relativa didascalia numerata (caption), utilizza la sintassi HTML \`<figure>\`:

\`\`\`html
<figure>
  <img src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600" alt="Stazione di Lavoro" />
  <figcaption>Figura 1: Stazione di lavoro per lo sviluppo di codice e documenti in LiViA.</figcaption>
</figure>
\`\`\`

---

## 3. Esportazione in Word (.docx) e Google Docs
- Le immagini e le figure inserite nei tuoi file .md o .docx vengono renderizzate nell'anteprima formattata.
- Esportando il file tramite il menu "DOCX / PDF" o con il comando \`:gdoc\`, le immagini vengono mantenute nella struttura finale del documento.
`
  },
  help_tables: {
    name: "help_tables.md",
    format: "md",
    content: `# Guida Tabelle Formattate (GFM Table) in LiViA e DOCX

Questa guida illustra come creare e allineare tabelle a griglia in sintassi GitHub Flavored Markdown (GFM) per documenti .md, anteprima formattata ed esportazione Microsoft Word (.docx) / Google Docs.

Comandi rapidi per aprire questa guida:
- \`:he table md\`
- \`:he tables md\`

---

## 1. Sintassi Base Tabella GFM
Le tabelle usano la barra verticale \`|\` per separare le colonne e i trattini \`---\` per separare l'intestazione dai dati.

\`\`\`markdown
| Intestazione A | Intestazione B | Intestazione C |
| :--- | :---: | ---: |
| Dati Sinistra | Dati Centro | Dati Destra |
\`\`\`

---

## 2. Allineamento delle Colonne
- \`:---\` : Allineato a Sinistra (predefinito)
- \`:---:\` : Allineato al Centro
- \`---:\` : Allineato a Destra

---

## 3. Esempio Tabella Completa
| Elemento / Funzione | Comando / Sintassi | Descrizione |
| :--- | :---: | ---: |
| Guida Colori | \`:he color md\` | Apri guida colori testo |
| Guida Figure | \`:he figure md\` | Apri guida immagini e didascalie |
| Guida Tabelle | \`:he table md\` | Apri questa guida tabelle |
| Salva Documento | \`:w file.docx\` | Salva o esporta il workspace |

---

## 4. Esportazione in Word (.docx) e Google Docs
Le tabelle formattate in sintassi GFM vengono convertite automaticamente in tabelle griglia formattate con bordi e celle distinte quando esportate in formato .docx o copiate per Google Docs.
`
  },
  help: HELP_TEMPLATE
};

export const TEMPLATES_EN: Record<string, FileData> = {
  txt: {
    name: "example.txt",
    format: "txt",
    content: `Welcome to LiViA (Light Vi Again)!
A super lightweight Vim-style editor.

This is a simple text file. Below you can verify the clear character distinction in the "DejaVu Sans Mono" font:

  - Letter l (lowercase L): l
  - Letter I (uppercase I): I
  - Number 1 (one): 1

Try reading them side-by-side to notice the difference:
  l I 1  |  lI1  |  1Il

Use keys h, j, k, l to navigate in Normal mode.
Press 'i' to enter INSERT mode. Press 'Esc' to return here.
Enter commands with ':' such as :w (save), :r (read file), or ZZ (save and quit).`
  },
  md: {
    name: "livia_guide.md",
    format: "md",
    content: `# 🪶 LiViA (Light Vi Again): Lightweight Vim Editor

LiViA (tribute to the Roman name Livia) is the ideal editor for writing code and notes.

## ⌨️ Main Commands (Normal Mode)

- **i** : Enter *Insert Mode* to type text.
- **Esc** : Return to *Normal Mode*.
- **h, j, k, l** : Move left, down, up, right.
- **g** / **G** : Jump to top / bottom (e.g. **2g** goes to line 2).
- **dd** : Delete current line.
- **dw** : Delete current word.
- **x** : Delete character under cursor.
- **u** : Undo last edit.
- **.** : Redo undone edit.
- **/** : Search text (e.g. **/livi**). Press **n** for next, **N** for previous.
- **:** : Command mode (e.g. **:%s/old/new/g** to replace globally).

## 🖋️ Typography Test
Thanks to **DejaVu Sans Mono**, you can clearly distinguish:
- Lowercase L: \`l\`
- Uppercase I: \`I\`
- Number one: \`1\`

\`\`\`
Code example: lI1 (l, I, 1)
\`\`\`
`
  },
  py: {
    name: "script.py",
    format: "py",
    content: `# -*- coding: utf-8 -*-
# LiViA Editor - Python Code Demonstration

def test_distinction():
    """
    Verify readability of critical characters:
    l (lowercase L), I (uppercase I), 1 (number one)
    """
    l = "lower_l"
    I = "upper_i"
    val_1 = 1
    
    # Notice how clearly distinct they are!
    items = [l, I, val_1]
    for idx, item in enumerate(items, start=1):
        print(f"[{idx}] Value: {item}")

if __name__ == "__main__":
    print("Starting LiViA typography test:")
    test_distinction()
`
  },
  kt: {
    name: "App.kt",
    format: "kt",
    content: `package com.livia.editor

/**
 * LiViA Editor - Kotlin Sample for Android
 */
class LiviaApp {
    private val appName: String = "LiViA"
    private val version: Double = 1.0

    fun displayInfo() {
        // Character distinction test: l, I, 1
        val list = listOf('l', 'I', '1')
        println("Welcome to $appName v$version")
        list.forEachIndexed { index, char ->
            println("Character \${index + 1}: $char")
        }
    }
}

fun main() {
    val app = LiviaApp()
    app.displayInfo()
}
`
  },
  js: {
    name: "editor.js",
    format: "js",
    content: `/**
 * LiViA - Vim-style Minimalist Editor
 * Core javascript logic for character analysis.
 */

function analyzeCharacters() {
  const l = 'l'; // lowercase L
  const I = 'I'; // uppercase I
  const one = '1'; // number one

  console.log("LiViA character analysis:");
  console.log(\`l === I ? \${l === I}\`);
  console.log(\`I === 1 ? \${I === one}\`);
  
  return {
    curvedL: l,
    serifI: I,
    flagOne: one
  };
}

analyzeCharacters();
`
  },
  json: {
    name: "config.json",
    format: "json",
    content: `{
  "appName": "LiViA",
  "version": "1.0.0",
  "description": "Lightweight Vim-style editor for Android, Linux, and Web",
  "font": "DejaVu Sans Mono",
  "features": {
    "modes": ["normal", "insert", "command", "search", "visual"],
    "pdfExport": true,
    "clipboardSync": true,
    "aiSupport": "Google Gemini"
  },
  "typographyCheck": {
    "lowercaseL": "l",
    "uppercaseI": "I",
    "numberOne": "1",
    "comparison": "lI1"
  }
}
`
  },
  xml: {
    name: "AndroidManifest.xml",
    format: "xml",
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.livia.editor">

    <!-- LiViA Editor configuration for Android screen -->
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="LiViA"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:theme="@style/Theme.LiViA">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`
  },
  ts: {
    name: "main.ts",
    format: "ts",
    content: `/**
 * LiViA Editor - TypeScript (TS) Code Demonstration
 */

interface LiviaConfig {
  theme: 'light' | 'dark';
  fontSize: number;
  wordWrap: boolean;
}

class LiviaEditor {
  private config: LiviaConfig;
  public static readonly VERSION: string = "1.0.0";

  constructor(options: Partial<LiviaConfig> = {}) {
    this.config = {
      theme: 'dark',
      fontSize: 12,
      wordWrap: true,
      ...options
    };
  }

  public getTheme(): string {
    return this.config.theme;
  }

  public checkTypography(l: string, I: string, one: string): boolean {
    // Check characters: l (ell), I (eye), 1 (one)
    console.log("TS Typo Check:", l, I, one);
    return l !== I && I !== one;
  }

  public runMainLoop(): void {
    const list = [1, 2, 3];
    for (const item of list) {
      if (item > 1) {
        console.log("Loop iteration:", item);
      }
    }
  }
}

const editor = new LiviaEditor();
editor.runMainLoop();
`
  },
  bash: {
    name: "setup.sh",
    format: "bash",
    content: `#!/bin/bash
# LiViA Editor - Shell/Bash Script Example

APP_NAME="LiViA"
VERSION="1.0"
INSTALL_DIR="/usr/local/bin"

echo "Configuring $APP_NAME v$VERSION for Debian/Linux..."

function check_dependencies() {
  local dep_count=0
  for cmd in node npm git; do
    if command -v "$cmd" &> /dev/null; then
      echo "[OK] Dependency found: $cmd"
      dep_count=$((dep_count + 1))
    else
      echo "[ERROR] Missing dependency: $cmd"
    fi
  done
  return $dep_count
}

if check_dependencies; then
  echo "All dependencies verified successfully."
else
  echo "Warning: some dependencies are missing."
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)
      echo "Dry run execution active."
      shift
      ;;
    *)
      echo "Unknown parameter: $1"
      exit 1
      ;;
  esac
done
`
  },
  tex: {
    name: "document.tex",
    format: "tex",
    content: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath,amssymb}
\\usepackage[table,dvipsnames,svgnames]{xcolor}
\\usepackage{colortbl}
\\usepackage{booktabs}
\\providecolor{black}{rgb}{0,0,0}
\\colorlet{black!30}{black!30}

\\title{LiViA Editor - LaTeX Document}
\\author{Ing. Mario Fantini}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
Welcome to \\textbf{LiViA Editor}! This is a demonstration LaTeX document with full color, table, and math support.

\\section{Mathematical Equations}
Below is a simple equation in an \\texttt{equation} environment:
\\begin{equation}
    E = mc^2
\\end{equation}

And a more complex equation with fractions and integrals:
\\begin{equation}
    \\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
\\end{equation}

\\section{Bullet Lists}
Here is a sample list:
\\begin{itemize}
    \\item First item: l (lowercase L)
    \\item Second item: I (uppercase I)
    \\item Third item: 1 (number one)
\\end{itemize}

\\end{document}
`
  },
  docx: {
    name: "report.docx",
    format: "docx",
    content: `# Main Heading Title (DOCX)
## Level 2 Sub-heading
### Level 3 Detail Section

This is an editable Microsoft Word (DOCX) document with rapid formatting in LiViA.

Bulleted list with indents:
- [Blue] First main bullet point
  - [Green] Indented sub-bullet level 2
    - [Purple] Further indented sub-bullet level 3
- [Red] Second main bullet point

Color text and styles:
- <color:#3B82F6>Primary Blue Text</color>
- <color:#10B981>Emerald Green Text</color>
- <color:#EF4444>Highlighted Red Text</color>
- **Bold Text** and *Italic Text*
`
  },
  java: {
    name: "Main.java",
    format: "java",
    content: `package com.livia.editor;

/**
 * LiViA Editor - Java Demonstration
 */
public class Main {
    public static void main(String[] args) {
        // Character distinction test: l (lowercase L), I (uppercase I), 1 (number one)
        char lowerL = 'l';
        char upperI = 'I';
        int numberOne = 1;

        System.out.println("Welcome to LiViA Java Editor!");
        System.out.printf("Character test: %c %c %d%n", lowerL, upperI, numberOne);

        int[] numbers = {10, 20, 30, 40};
        for (int n : numbers) {
            if (n > 15) {
                System.out.println("Value greater than 15: " + n);
            }
        }
    }
}
`
  },
  c: {
    name: "main.c",
    format: "c",
    content: `#include <stdio.h>
#include <stdlib.h>

/*
 * LiViA Editor - C Language Demonstration
 */
int main(void) {
    // Character distinction test: l, I, 1
    char l = 'l';
    char I = 'I';
    int num1 = 1;

    printf("Welcome to LiViA Editor for C!\n");
    printf("Characters: %c %c %d (lI1)\n", l, I, num1);

    for (int i = 0; i < 5; i++) {
        if (i % 2 == 0) {
            printf("Even index: %d\n", i);
        }
    }

    return 0;
}
`
  },
  cpp: {
    name: "main.cpp",
    format: "cpp",
    content: `#include <iostream>
#include <vector>
#include <string>

// LiViA Editor - C++ Language Demonstration
class LiviaEngine {
private:
    std::string appName;
    double version;

public:
    LiviaEngine(std::string name, double v) : appName(name), version(v) {}

    void run() {
        std::cout << "Launching " << appName << " v" << version << " (C++ Engine)\n";
        
        // Character test: l, I, 1
        std::vector<std::string> test = {"l", "I", "1"};
        for (const auto& item : test) {
            std::cout << "Item: " << item << "\n";
        }
    }
};

int main() {
    LiviaEngine app("LiViA", 1.0);
    app.run();
    return 0;
}
`
  },
  ly: {
    name: "score.ly",
    format: "ly",
    content: `\\version "2.24.0"

\\header {
  title = "Ode to Joy (An die Freude)"
  composer = "Ludwig van Beethoven"
  arranger = "Arranged for LiViA Editor"
}

\\paper {
  #(set-paper-size "a4")
}

global = {
  \\key c \\major
  \\time 4/4
  \\tempo "Allegro assai" 4 = 120
}

melody = \\relative c' {
  \\global
  % Phrase 1: Main notes
  e4 e f g | g f e d | c c d e | e4. d8 d2 |
  
  % Phrase 2
  e4 e f g | g f e d | c c d e | d4. c8 c2 |
  
  \\bar "|."
}

harmonies = \\chordmode {
  c1 c c g
  c c c2 g c1
}

\\score {
  <<
    \\new ChordNames \\harmonies
    \\new Staff { \\melody }
  >>
  \\layout { }
  \\midi { }
}
`
  },
  html: {
    name: "index.html",
    format: "html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>LiViA Web Document</title>
    <style>
        body { font-family: monospace; background: #0d0f12; color: #e0e0e0; padding: 20px; }
        h1 { color: #8ab4f8; }
        .highlight { color: #10b981; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Welcome to LiViA Editor</h1>
    <p>Character distinction: <span class="highlight">l I 1</span></p>
    <button onclick="console.log('LiViA HTML')">Submit</button>
</body>
</html>
`
  },
  css: {
    name: "styles.css",
    format: "css",
    content: `/* LiViA Editor - Custom CSS Stylesheet */
:root {
  --primary-color: #3b82f6;
  --bg-dark: #0d0f12;
  --text-light: #e0e0e0;
}

body {
  font-family: 'DejaVu Sans Mono', monospace;
  background-color: var(--bg-dark);
  color: var(--text-light);
  margin: 0;
  padding: 16px;
}

.editor-container {
  border: 1px solid #2d2d2d;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}
`
  },
  sql: {
    name: "schema.sql",
    format: "sql",
    content: `-- LiViA Editor - SQL Database Schema Example

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, email) 
VALUES ('mario', 'mario@example.com'),
       ('livia', 'livia@example.com');

SELECT id, username, email 
FROM users 
WHERE id >= 1 
ORDER BY created_at DESC;
`
  },
  rs: {
    name: "main.rs",
    format: "rs",
    content: `// LiViA Editor - Rust Language Demonstration

fn main() {
    let app_name = "LiViA";
    let version = 1.0;

    println!("Welcome to {} v{} (Rust)", app_name, version);

    // Character distinction test: l, I, 1
    let chars = vec!['l', 'I', '1'];
    for (i, c) in chars.iter().enumerate() {
        println!("[{}] Character: {}", i + 1, c);
    }
}
`
  },
  go: {
    name: "main.go",
    format: "go",
    content: `package main

import "fmt"

// LiViA Editor - Go Language Example
func main() {
	appName := "LiViA"
	fmt.Printf("Welcome to %s (Go Engine)\n", appName)

	// Character distinction test: l, I, 1
	letters := []rune{'l', 'I', '1'}
	for idx, char := range letters {
		fmt.Printf("[%d] Rune: %c\n", idx+1, char)
	}
}
`
  },
  help_colors: HELP_COLORS_TEMPLATE_EN,
  help_figures: HELP_FIGURES_TEMPLATE_EN,
  help_tables: HELP_TABLES_TEMPLATE_EN,
  help: HELP_TEMPLATE_EN
};

export function getTemplates(lang: 'it' | 'en'): Record<string, FileData> {
  return lang === 'en' ? TEMPLATES_EN : TEMPLATES;
}

export function getLvarcTemplate(lang: 'it' | 'en', isMobile?: boolean): FileData {
  const isMob = isMobile ?? (typeof window !== 'undefined' ? (
    /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '') || 
    window.innerWidth < 768
  ) : false);
  const defaultSize = isMob ? 20 : 16;

  if (lang === 'en') {
    return {
      name: ".lvarc",
      format: "txt",
      content: `# LiViA (Light Vi Again) Configuration File
# You can edit these lines to customize your editor!

# Show line numbers (set number / set nonumber)
set number

# Enable word wrapping (set wrap / set nowrap)
set wrap

# Live syntax highlighting (set syntax=on / set syntax=off)
set syntax=on

# Line width for 'gq' reformatting (set textwidth=80 or set tw=80)
set textwidth=80

# Google AI Gemini Model (set model=flash / set model=pro)
set model=flash

# Code Folding for grouping sections (set folding=on / set folding=off)
set folding=on

# Editor font size (e.g. 12, 14, 16, 18, 20, 24, 30, 32, 36, 48)
set fontsize=${defaultSize}

# Preferred theme (set theme=dark / set theme=light / set theme=system)
set theme=dark

# Interface language (set lang=it / set lang=en)
set lang=en
`
    };
  }
  return {
    name: ".lvarc",
    format: "txt",
    content: `# File di Configurazione LiViA (Light Vi Again)
# Puoi modificare queste righe per personalizzare l'editor!

# Mostra i numeri di riga (set number / set nonumber)
set number

# Abilita il wrapping del testo a capo (set wrap / set nowrap)
set wrap

# Evidenziazione sintassi live (set syntax=on / set syntax=off)
set syntax=on

# Larghezza riga per riformattazione 'gq' (set textwidth=80 o set tw=80)
set textwidth=80

# Modello Google AI Gemini (set model=flash / set model=pro)
set model=flash

# Code Folding per raggruppare sezioni (set folding=on / set folding=off)
set folding=on

# Dimensione del font dell'editor (es: 12, 14, 16, 18, 20, 24, 30, 32, 36, 48)
set fontsize=${defaultSize}

# Tema preferito (set theme=dark / set theme=light / set theme=system)
set theme=dark

# Lingua dell'interfaccia (set lang=it / set lang=en)
set lang=it
`
  };
}
