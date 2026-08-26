import re
import os

for filename in ["src/components/VimEditor.tsx", "src/components/AuxiliaryKeyboard.tsx"]:
    with open(filename, "r") as f:
        content = f.read()

    old_code = """const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);"""
    new_code = """const isTouchDevice = typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || ''));"""

    content = content.replace(old_code, new_code)
    with open(filename, "w") as f:
        f.write(content)
