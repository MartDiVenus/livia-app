import re
with open("src/components/VimEditor.tsx", "r") as f:
    content = f.read()

old_code = """  const handleSelectMode = (newMode: VimMode) => {
    setShowModeMenu(false);
    const trigger = document.getElementById('simulated-key-trigger');
    if (!trigger) return;

    // Always exit to normal mode first via Escape
    trigger.setAttribute('data-key', 'Escape');
    trigger.click();

    if (newMode === 'normal') {
      return;
    }

    // Dispatch the new mode key
    setTimeout(() => {
      let key = '';
      if (newMode === 'insert') key = 'i';
      if (newMode === 'visual') key = 'v';
      if (newMode === 'visual-line') key = 'V';
      
      if (key) {
        trigger.setAttribute('data-key', key);
        trigger.click();
      }
    }, 10);
  };"""

new_code = """  const handleSelectMode = (newMode: VimMode) => {
    setShowModeMenu(false);
    const trigger = document.getElementById('simulated-key-trigger');
    if (!trigger) return;

    // Always exit to normal mode first via Escape
    trigger.setAttribute('data-key', 'Escape');
    trigger.click();

    if (newMode === 'normal') {
      return;
    }

    // Dispatch the new mode key synchronously
    let key = '';
    if (newMode === 'insert') key = 'i';
    if (newMode === 'visual') key = 'v';
    if (newMode === 'visual-line') key = 'V';
    
    if (key) {
      trigger.setAttribute('data-key', key);
      trigger.click();
    }
  };"""

content = content.replace(old_code, new_code)
with open("src/components/VimEditor.tsx", "w") as f:
    f.write(content)
