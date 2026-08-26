import re

with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_code = """onClick={() => onSoftKeyboardChange(!isSoftKeyboardOpen)}"""
new_code = """onClick={() => {
                onSoftKeyboardChange(!isSoftKeyboardOpen);
                if (editorRef.current?.view) {
                  if (isSoftKeyboardOpen) {
                    editorRef.current.view.contentDOM.blur();
                  } else {
                    editorRef.current.view.contentDOM.focus();
                  }
                }
              }}"""

content = content.replace(old_code, new_code)

with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
