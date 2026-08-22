# Guida alla Compilazione di LiViA (PWA) su GitHub Pages

Questa guida descrive come LiViA è impostata come **Progressive Web App (PWA)**, eliminando la necessità di binari nativi e garantendo compatibilità universale su tutti i dispositivi tramite browser.

---

## 1. Architettura PWA

LiViA è ora esclusivamente una PWA. Questo significa:
- **Nessun eseguibile nativo:** Non ci sono file `.exe`, `.app`, `.dmg`, `.AppImage`, o `.apk`.
- **Installazione Web:** Gli utenti possono "installare" l'app direttamente dal browser (Aggiungi a schermata Home su iOS/Android o Installa su Desktop tramite Chrome/Edge/Safari).
- **Offline Ready:** L'app sfrutta i Service Workers e la cache del browser per funzionare anche in assenza di rete.

## 2. Pubblicazione su GitHub Pages

Puoi esportare ed eseguire il deployment dell'app gratuitamente utilizzando **GitHub Pages**. 

### Passi per il deployment:
1. Installa le dipendenze:
   ```bash
   npm install
   ```
2. Effettua la build della PWA:
   ```bash
   npm run build
   ```
   *Questo genererà la cartella `dist/` contenente i file statici.*
3. Usa la funzionalità di GitHub Pages o un workflow Actions dedicato per pubblicare la directory `dist/` sul ramo `gh-pages` o nel tuo ambiente di hosting preferito.

---

## 3. Requisiti di Versione NodeJS

- **In Locale:** È sufficiente avere installato **Node.js 22+** (o Node.js 24+).
