import re

with open('src/types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

it_help_end = """------------------------------------------------------------------------------
8. COMPILAZIONE DESKTOP NATIVA (Rust & Tauri)
------------------------------------------------------------------------------
LiViA può essere compilata come applicazione desktop nativa tramite Tauri:
1. Installa Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
2. Comandi: 'npm run tauri dev' (sviluppo) / 'npm run tauri build' (compilazione nativa).

------------------------------------------------------------------------------
9. RISOLUZIONE PROBLEMI (Aggiornamenti Android)
------------------------------------------------------------------------------
Se hai installato LiViA come App su Android (PWA) e non ricevi gli ultimi aggiornamenti,
il Service Worker di Chrome potrebbe bloccarli nella cache offline. Per forzare un aggiornamento pulito:
1. Vai in Impostazioni Android > App > Chrome
2. Seleziona "Spazio di archiviazione e cache"
3. Tocca "Gestisci spazio" e poi "Elimina tutti i dati"
⚠️ Attenzione: questa procedura è radicale e ti disconnetterà dagli altri siti su Chrome.
È consigliata solo se l'App non si aggiorna in alcun modo.

------------------------------------------------------------------------------
10. PRESENTAZIONE E SISTEMI OPERATIVI SUPPORTATI
------------------------------------------------------------------------------
LiViA è un editor di testo e codice leggero in stile Vim, progettato per
garantire la massima produttività e portabilità su qualsiasi dispositivo.

Caratteristiche principali:
- Supporto per molteplici linguaggi di programmazione e markup
- Integrazione nativa con Google Drive, Google Docs e Google Gemini AI
- Esportazione formattata in PDF, DOCX, TEX e Markdown
- Interfaccia da terminale altamente personalizzabile tramite .lvarc

Piattaforme di sviluppo: Ecosistema Google™
Testato solo su Android, Linux, e WEB.
Autore: Ing. Mario Fantini (https://mariofantini.eu)"""

# Find where it starts with "8. PRESENTAZIONE E SISTEMI OPERATIVI SUPPORTATI"
content = re.sub(
    r"8\. PRESENTAZIONE E SISTEMI OPERATIVI SUPPORTATI.*?Autore: Ing\. Mario Fantini \(https://mariofantini\.eu\)",
    it_help_end.strip(),
    content,
    flags=re.DOTALL
)

with open('src/types.ts', 'w', encoding='utf-8') as f:
    f.write(content)

