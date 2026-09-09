with open("src/components/VimEditor.tsx", "r") as f:
    vim = f.read()

start_idx = vim.find('<div className="flex-1 flex overflow-hidden min-h-0 min-w-0">')
end_idx = vim.find('{/* Proxy input for Vim commands on mobile */ }')

print(vim[start_idx:end_idx])
