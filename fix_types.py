import re

with open('src/types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix default font size from 20 to 16 in types.ts
content = content.replace("default: 20", "default: 16")
content = content.replace("fontsize=10-48: Set editor font size (desktop default: 20", "fontsize=10-48: Set editor font size (desktop default: 16")
content = content.replace("fontsize=10-48: Set editor font size (default: 20)", "fontsize=10-48: Set editor font size (default: 16)")
content = content.replace("fontsize=10-48: Imposta la dimensione del font dell'editor (default: 20)", "fontsize=10-48: Imposta la dimensione del font dell'editor (default: 16)")

# 2. Fix descriptions in types.ts
content = content.replace(
    "built natively for Android and Linux environments.",
    "Tested only on Android, Linux, and WEB."
)
content = content.replace(
    "realizzato nativamente per ambienti Android e Linux.",
    "Testato solo su Android, Linux, e WEB."
)
content = content.replace(
    "A super lightweight Vim-style editor designed for Android and Linux (executable: lva).",
    "A super lightweight Vim-style editor. Tested only on Android, Linux, and WEB."
)
content = content.replace(
    "Un editor in stile Vim super leggero progettato per Android e Linux (eseguibile: lva).",
    "Un editor in stile Vim super leggero. Testato solo su Android, Linux, e WEB."
)

# 3. Fix "Supported systems..."
content = content.replace(
    "Supported systems: Android™, Linux, ChromeOS™, WEB, Microsoft Windows, macOS",
    "Tested only on Android, Linux, and WEB."
)
content = content.replace(
    "Sistemi supportati: Android™, Linux, ChromeOS™, WEB, Microsoft Windows, macOS",
    "Testato solo su Android, Linux, e WEB."
)

# 4. We also need to add Troubleshooting and make points 1-10 in English help
en_help_end = """------------------------------------------------------------------------------
8. NATIVE DESKTOP BUILD (Rust & Tauri)
------------------------------------------------------------------------------
LiViA can be built as a native desktop application using Tauri:
1. Install Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
2. Run 'npm run tauri dev' (dev) or 'npm run tauri build' (production build).

------------------------------------------------------------------------------
9. TROUBLESHOOTING (Android Updates)
------------------------------------------------------------------------------
If you installed LiViA as an Android App (PWA) and aren't receiving the latest updates,
Chrome's Service Worker might be locking the offline cache. To force a clean update:
1. Go to Android Settings > Apps > Chrome
2. Select "Storage and cache"
3. Tap "Manage space" then "Clear all data"
⚠️ Warning: this is a radical procedure that will log you out of other Chrome websites.
Only recommended if the App refuses to update.

------------------------------------------------------------------------------
10. OVERVIEW & SUPPORTED OPERATING SYSTEMS
------------------------------------------------------------------------------
LiViA is a lightweight Vim-style text and code editor designed for maximum
productivity and portability across all devices.

Key features:
- Multi-language code highlighting and markup editing
- Native integration with Google Drive, Google Docs, and Google Gemini AI
- Formatted export to PDF, DOCX, TEX, and Markdown
- Highly customizable terminal CLI interface via .lvarc configuration

Development platforms: Google™ Ecosystem
Tested only on Android, Linux, and WEB.
Author: Ing. Mario Fantini (https://mariofantini.eu)
"""

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
Autore: Ing. Mario Fantini (https://mariofantini.eu)
"""

content = re.sub(
    r"8\. NATIVE DESKTOP BUILD.*?Author: Ing\. Mario Fantini \(https://mariofantini\.eu\)",
    en_help_end.strip(),
    content,
    flags=re.DOTALL
)

content = re.sub(
    r"8\. PRESENTAZIONE E SISTEMI OPERATIVI SUPPORTATI.*?Author: Ing\. Mario Fantini \(https://mariofantini\.eu\)|8\. COMPILAZIONE DESKTOP NATIVA.*?Author: Ing\. Mario Fantini \(https://mariofantini\.eu\)",
    it_help_end.strip(),
    content,
    flags=re.DOTALL
)

# 5. Fix the redundant help block in TEMPLATES (Italian)
# We need to replace the help: { ... } block in TEMPLATES with `help: HELP_TEMPLATE`
# Find `help: { ... }` inside TEMPLATES.
# Actually, I'll just regex replace it carefully.
redundant_help_regex = r"help:\s*\{\s*name:\s*\"help\.txt\",\s*format:\s*\"txt\",\s*content:\s*`.*?={78}`\s*\}"
content = re.sub(redundant_help_regex, "help: HELP_TEMPLATE", content, flags=re.DOTALL)

with open('src/types.ts', 'w', encoding='utf-8') as f:
    f.write(content)

