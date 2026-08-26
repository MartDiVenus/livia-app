import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_code = """  useEffect(() => {
    if (editorRef.current?.view) {
      if (isSoftKeyboardOpen) {
        editorRef.current.view.contentDOM.focus();
      } else {
        editorRef.current.view.contentDOM.blur();
      }
    }
  }, [isSoftKeyboardOpen]);"""

new_code = """  useEffect(() => {
    if (editorRef.current?.view && isSoftKeyboardOpen) {
      // Re-focus when keyboard is toggled on to trigger the system keyboard popup
      editorRef.current.view.contentDOM.focus();
    }
  }, [isSoftKeyboardOpen]);"""

content = content.replace(old_code, new_code)
with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
