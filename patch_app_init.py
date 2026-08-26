import re
with open("src/App.tsx", "r") as f:
    content = f.read()

old_code = """  // State & handler for Gboard / System Keyboard Toggle
  const [isSoftKeyboardOpen, setIsSoftKeyboardOpen] = useState<boolean>(false);"""

new_code = """  // State & handler for Gboard / System Keyboard Toggle
  const [isSoftKeyboardOpen, setIsSoftKeyboardOpen] = useState<boolean>(true);"""

content = content.replace(old_code, new_code)
with open("src/App.tsx", "w") as f:
    f.write(content)
