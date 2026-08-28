with open("src/main.tsx", "r") as f:
    content = f.read()

injection = """
window.onerror = function(message, source, lineno, colno, error) {
  document.body.innerHTML = '<div style="color:red; font-size:20px; padding:20px;">' + message + '</div>';
};
window.addEventListener('unhandledrejection', function(event) {
  document.body.innerHTML = '<div style="color:red; font-size:20px; padding:20px;">' + event.reason + '</div>';
});
"""

with open("src/main.tsx", "w") as f:
    f.write(injection + content)
