import re

with open("src/utils/docxExport.ts", "r") as f:
    content = f.read()

# Fix the DOCX ImageRun type error
run_anchor = """              new ImageRun({
                data: buffer,
                transformation: {
                  width: 400,
                  height: 300
                }
              })"""
run_replace = """              new ImageRun({
                data: buffer,
                transformation: {
                  width: 400,
                  height: 300
                },
                type: 'png' // Add type to satisfy CoreImageOptions
              })"""
if run_anchor in content:
    content = content.replace(run_anchor, run_replace)
else:
    print("Could not find DOCX run anchor")

with open("src/utils/docxExport.ts", "w") as f:
    f.write(content)

print("DOCX fixed.")
