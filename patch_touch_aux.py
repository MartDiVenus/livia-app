import re

with open("src/components/AuxiliaryKeyboard.tsx", "r") as f:
    content = f.read()

old_code = """  const isTouchDevice = typeof window !== 'undefined' && (
    ('ontouchstart' in window) || 
    (navigator.maxTouchPoints > 0) || 
    /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '')
  );"""

new_code = """  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    setIsTouchDevice(('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || ''));
  }, []);"""

content = content.replace(old_code, new_code)
with open("src/components/AuxiliaryKeyboard.tsx", "w") as f:
    f.write(content)
