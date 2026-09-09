import re

with open("src/components/SettingsModal.tsx", "r") as f:
    content = f.read()

content = content.replace("model: 'flash' | 'pro';", "model: 'flash' | 'pro' | 'flash-lite' | 'pro-thinking';")
content = content.replace("<'flash' | 'pro'>", "<'flash' | 'pro' | 'flash-lite' | 'pro-thinking'>")

with open("src/components/SettingsModal.tsx", "w") as f:
    f.write(content)
