import re

with open("src/types.ts", "r") as f:
    content = f.read()

# Italian
it_pattern = r'''Per le immagini hai 4 opzioni principali:

1\. \*\*Da Google Drive\*\*: Se possiedi un link condivisibile, puoi inserirlo direttamente\.
2\. \*\*File Locale \(Rapido/Temporaneo Blob\)\*\*: Genera un URL effimero \(`blob:http...`\)\. È perfetto per le \*\*esportazioni PDF rapide\*\*: l'immagine viene caricata istantaneamente e "stampata" nel PDF per sempre\. Tuttavia, se chiudi l'app o ricarichi la pagina, l'URL muore e l'immagine nell'anteprima risulterà rotta\.
3\. \*\*File Locale \(Incorporato Base64\)\*\*: Trasforma l'immagine in una lunghissima stringa di testo incollata in fondo al documento e referenziata nel testo \(es\. `!\[nome\]\[img-123\]`\)\. Ideale se devi salvare il file \.md e riaprirlo in futuro offline: l'immagine sarà fisicamente dentro il file\. Evita file troppo pesanti\.
4\. \*\*Carica su Cloud \(Firebase\)\*\*: \(Quando configurato\) Inserisce il link permanente al bucket di archiviazione\.'''

it_replace = r'''Per le immagini hai 2 opzioni (a causa delle recenti restrizioni di sicurezza (CORS e anti-hotlinking) imposte dai servizi cloud come Google Drive, l'inserimento diretto tramite URL esterni è stato disabilitato):

1. **File Locale (Rapido/Temporaneo Blob)**: Genera un URL effimero (`blob:http...`). È perfetto per le **esportazioni PDF rapide**: l'immagine viene caricata istantaneamente e "stampata" nel PDF per sempre. Tuttavia, se chiudi l'app o ricarichi la pagina, l'URL muore e l'immagine nell'anteprima risulterà rotta.
2. **File Locale (Incorporato Base64)**: Trasforma l'immagine in una lunghissima stringa di testo incollata in fondo al documento e referenziata nel testo (es. `![nome][img-123]`). Ideale se devi salvare il file .md e riaprirlo in futuro offline: l'immagine sarà fisicamente dentro il file. Evita file troppo pesanti.'''

content = re.sub(it_pattern, it_replace, content)

# English
en_pattern = r'''For images, you have 4 main options:

1\. \*\*From Google Drive\*\*: Insert a shareable link directly\.
2\. \*\*Local File \(Quick/Temp Blob\)\*\*: Generates an ephemeral URL \(`blob:http...`\)\. It is perfect for \*\*quick PDF exports\*\*: the image loads instantly and gets "printed" permanently into the PDF\. However, if you close the app or reload the page, the URL dies and the preview image will break\.
3\. \*\*Local File \(Embedded Base64\)\*\*: Converts the image into a very long text string appended to the bottom of the document and referenced in the text \(e\.g\. `!\[name\]\[img-123\]`\)\. Ideal if you need to save the \.md file and reopen it later offline: the image is physically inside the file\. Avoid very large files\.
4\. \*\*Upload to Cloud \(Firebase\)\*\*: \(When configured\) Inserts a permanent link to the storage bucket\.'''

en_replace = r'''For images, you have 2 options (due to recent strict security and anti-hotlinking restrictions enforced by cloud services like Google Drive, direct URL insertion from external clouds has been disabled):

1. **Local File (Quick/Temp Blob)**: Generates an ephemeral URL (`blob:http...`). It is perfect for **quick PDF exports**: the image loads instantly and gets "printed" permanently into the PDF. However, if you close the app or reload the page, the URL dies and the preview image will break.
2. **Local File (Embedded Base64)**: Converts the image into a very long text string appended to the bottom of the document and referenced in the text (e.g. `![name][img-123]`). Ideal if you need to save the .md file and reopen it later offline: the image is physically inside the file. Avoid very large files.'''

content = re.sub(en_pattern, en_replace, content)

with open("src/types.ts", "w") as f:
    f.write(content)

print("types.ts patched successfully.")
