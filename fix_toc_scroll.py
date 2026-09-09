with open("src/components/TableOfContents.tsx", "r") as f:
    toc = f.read()

old_click = "onClick={() => onNavigate(item.line)}"
new_click = """onClick={() => {
              onNavigate(item.line);
              const el = document.getElementById(item.id);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}"""

toc = toc.replace(old_click, new_click)

with open("src/components/TableOfContents.tsx", "w") as f:
    f.write(toc)
