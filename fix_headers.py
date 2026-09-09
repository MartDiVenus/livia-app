with open("src/utils/previewRenderer.tsx", "r") as f:
    code = f.read()

code = code.replace('<h1 key={i} className="', '<h1 key={i} id={`heading-${i}`} className="')
code = code.replace('<h2 key={i} className="', '<h2 key={i} id={`heading-${i}`} className="')
code = code.replace('<h3 key={i} className="', '<h3 key={i} id={`heading-${i}`} className="')

with open("src/utils/previewRenderer.tsx", "w") as f:
    f.write(code)
