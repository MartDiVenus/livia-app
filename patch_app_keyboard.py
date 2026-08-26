import re
with open("src/App.tsx", "r") as f:
    content = f.read()

old_code = """  const handleToggleSoftKeyboard = (forceState?: boolean) => {
    const triggerBtn = document.getElementById('simulated-soft-keyboard-toggle');
    if (triggerBtn) {
      if (forceState !== undefined) {
        triggerBtn.setAttribute('data-state', forceState.toString());
      } else {
        triggerBtn.removeAttribute('data-state');
      }
      triggerBtn.click();
    }
  };"""

new_code = """  const handleToggleSoftKeyboard = (forceState?: boolean) => {
    if (forceState !== undefined) {
      setIsSoftKeyboardOpen(forceState);
    } else {
      setIsSoftKeyboardOpen(prev => !prev);
    }
  };"""

content = content.replace(old_code, new_code)
with open("src/App.tsx", "w") as f:
    f.write(content)
