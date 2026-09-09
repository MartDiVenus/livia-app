with open("src/components/VimEditor.tsx", "r") as f:
    vim = f.read()

idx = vim.find("Mostra/Nascondi Indice")
print(vim[idx-200:idx+200])
