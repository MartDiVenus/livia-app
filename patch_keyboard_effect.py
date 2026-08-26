import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

new_code = """  useEffect(() => {
    if (editorRef.current?.view) {
      if (isSoftKeyboardOpen) {
        editorRef.current.view.contentDOM.focus();
      } else {
        editorRef.current.view.contentDOM.blur();
      }
    }
  }, [isSoftKeyboardOpen]);

  // Track Vim mode"""

content = content.replace("  // Track Vim mode", new_code)
with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
