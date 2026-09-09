with open("src/utils/urlFetcher.ts", "r") as f:
    code = f.read()

code = code.replace('const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;', 'const proxyUrl = `/api/fetch-url?url=${encodeURIComponent(url)}`;')

with open("src/utils/urlFetcher.ts", "w") as f:
    f.write(code)
